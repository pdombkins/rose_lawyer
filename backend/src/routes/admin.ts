/**
 * /admin — Collaboration portal endpoints.
 *
 * All routes require authentication AND admin status (is_admin = true in
 * user_profiles). Non-admin requests receive 403.
 *
 * Routes:
 *   GET    /admin/users              List all registered users
 *   DELETE /admin/users/:userId      Remove a user (cannot remove self)
 *   POST   /admin/invite             Invite a new user by email
 *   GET    /admin/invitations        List pending (unaccepted) invitations
 *   DELETE /admin/invitations/:id    Revoke a pending invitation
 *   GET    /admin/email-status       Is outbound email (Resend) configured?
 *   POST   /admin/test-email         Send a real test email to confirm delivery
 *   GET    /admin/document-library   Documents + folders + projects (Documents page)
 *   PUT    /admin/documents/:id/links   Set an unfiled document's project links
 *   PUT    /admin/folders/:id/links     Set a folder's project links
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import { frontendBaseUrl } from "../lib/urls";
import {
  APP_SETTING_KEYS,
  getAppSetting,
  getJadeAccessApproved,
  setAppSetting,
} from "../lib/appSettings";
import { attachActiveVersionPaths } from "../lib/documentVersions";
import { linksByDocument, setDocumentLinks } from "../lib/documentLinks";
import { linksByFolder, setFolderLinks } from "../lib/folderLinks";
import {
  getStudentAllowedModels,
  setStudentAllowedModels,
} from "../lib/modelAccess";
import { MODEL_REGISTRY } from "../lib/llm";
import { isEmailConfigured, sendEmail, escapeHtml } from "../lib/email";

export const adminRouter = Router();

// ── Admin check middleware ────────────────────────────────────────────────────

async function requireAdmin(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): Promise<void> {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { data, error } = await db
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data?.is_admin) {
    res.status(403).json({ detail: "Admin access required" });
    return;
  }
  next();
}

adminRouter.use(requireAuth, requireAdmin);

// ── GET /admin/users ──────────────────────────────────────────────────────────

adminRouter.get("/users", async (req, res) => {
  const db = createServerSupabase();

  // List all auth users via admin API
  const { data: authData, error: authError } =
    await db.auth.admin.listUsers({ perPage: 1000 });
  if (authError) {
    return void res.status(500).json({ detail: authError.message });
  }

  // Pull display names and is_admin flags from user_profiles
  const { data: profiles } = await db
    .from("user_profiles")
    .select("user_id, display_name, is_admin");

  const profileMap = new Map<string, { display_name: string | null; is_admin: boolean }>(
    (profiles ?? []).map((p: { user_id: string; display_name: string | null; is_admin: boolean }) => [
      p.user_id,
      { display_name: p.display_name, is_admin: p.is_admin ?? false },
    ]),
  );

  const users = authData.users.map((u) => {
    const prof = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      displayName: prof?.display_name ?? null,
      isAdmin: prof?.is_admin ?? false,
      createdAt: u.created_at,
      lastSignIn: u.last_sign_in_at ?? null,
      confirmedAt: u.confirmed_at ?? null,
    };
  });

  // Most recently created first
  users.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  res.json({ users });
});

// ── DELETE /admin/users/:userId ───────────────────────────────────────────────

adminRouter.delete("/users/:userId", async (req, res) => {
  const targetId = req.params.userId;
  const selfId = res.locals.userId as string;

  if (targetId === selfId) {
    return void res
      .status(400)
      .json({ detail: "You cannot remove your own account." });
  }

  const db = createServerSupabase();
  const { error } = await db.auth.admin.deleteUser(targetId);
  if (error) {
    return void res.status(500).json({ detail: error.message });
  }

  res.json({ ok: true });
});

// ── POST /admin/invite ────────────────────────────────────────────────────────

/** Branded invitation email body containing the Supabase action link.
 * Mirrors the group-invite email in routes/groups.ts. */
function adminInviteEmailHtml(actionLink: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;color:#111827;line-height:1.5">
  <h2 style="margin:0 0 12px">You're invited to Rose</h2>
  <p>You've been invited to Rose — an AI legal assistant for research and educational use.</p>
  <p>Click below to set up your account and get started:</p>
  <p style="margin:20px 0">
    <a href="${actionLink}" style="display:inline-block;background:#111827;color:#ffffff;padding:11px 20px;border-radius:6px;text-decoration:none;font-weight:600">Accept invitation</a>
  </p>
  <p style="color:#6b7280;font-size:12px">If the button doesn't work, copy this link into your browser:<br>
    <span style="word-break:break-all">${escapeHtml(actionLink)}</span>
  </p>
  <p style="color:#9ca3af;font-size:12px;margin-top:24px">Rose — research &amp; educational use only. Not legal advice.</p>
</div>`;
}

adminRouter.post("/invite", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!email || !email.includes("@")) {
    return void res.status(400).json({ detail: "A valid email address is required." });
  }

  // Why not `inviteUserByEmail`? Same reason as the group invite flow (see
  // routes/groups.ts): it routes through Supabase Auth's built-in mailer,
  // which is rate-limited (over_email_send_rate_limit) and depends on SMTP
  // config that often isn't set up, surfacing as a generic
  // "Error sending invite email". We instead provision the action link
  // WITHOUT sending Supabase's own email, then deliver our own branded email
  // via Resend.
  if (!isEmailConfigured()) {
    return void res.status(400).json({
      detail:
        "Email is not configured on this instance. Set RESEND_API_KEY (and NOTIFICATIONS_FROM_EMAIL) to send invitations.",
    });
  }

  const db = createServerSupabase();
  const selfId = res.locals.userId as string;
  const redirectTo = `${frontendBaseUrl()}/login`;

  let actionLink: string | null = null;
  const inviteLink = await db.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  });
  if (inviteLink.error) {
    // Already-registered emails can't take a fresh "invite" link — fall back
    // to a magic link so re-sends still work instead of hard-failing.
    const magic = await db.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (magic.error) {
      return void res.status(500).json({ detail: magic.error.message });
    }
    actionLink = magic.data.properties?.action_link ?? null;
  } else {
    actionLink = inviteLink.data.properties?.action_link ?? null;
  }
  if (!actionLink) {
    return void res.status(500).json({ detail: "No action link was generated" });
  }

  const sent = await sendEmail({
    to: email,
    subject: "You're invited to Rose",
    html: adminInviteEmailHtml(actionLink),
  });
  if (!sent.ok) {
    return void res.status(500).json({ detail: sent.error });
  }

  // Record the invitation for admin visibility (best-effort; ignore dupes).
  await db.from("invitations").insert({
    email,
    invited_by: selfId,
  });

  res.json({ ok: true, message: `Invitation sent to ${email}` });
});

// ── GET /admin/invitations ────────────────────────────────────────────────────

adminRouter.get("/invitations", async (_req, res) => {
  const db = createServerSupabase();
  const { data, error } = await db
    .from("invitations")
    .select("id, email, accepted_at, created_at")
    .is("accepted_at", null) // pending only
    .order("created_at", { ascending: false });

  if (error) {
    return void res.status(500).json({ detail: error.message });
  }

  res.json({ invitations: data ?? [] });
});

// ── DELETE /admin/invitations/:id ─────────────────────────────────────────────

adminRouter.delete("/invitations/:id", async (req, res) => {
  const db = createServerSupabase();
  const { error } = await db
    .from("invitations")
    .delete()
    .eq("id", req.params.id);

  if (error) {
    return void res.status(500).json({ detail: error.message });
  }

  res.json({ ok: true });
});

// ── GET /admin/settings ───────────────────────────────────────────────────────
// Shared instance settings.

adminRouter.get("/settings", async (_req, res) => {
  const jadeAccessApproved = await getJadeAccessApproved();
  const orgContext = await getAppSetting<string>("org_context", "");
  const studentAllowedModels = await getStudentAllowedModels();
  res.json({ jadeAccessApproved, orgContext, studentAllowedModels });
});

// ── PUT /admin/settings ───────────────────────────────────────────────────────

adminRouter.put("/settings", async (req, res) => {
  const body =
    req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? (req.body as Record<string, unknown>)
      : {};

  const updates: Record<string, unknown> = {};
  if (typeof body.jadeAccessApproved === "boolean") {
    await setAppSetting(
      APP_SETTING_KEYS.jadeAccessApproved,
      body.jadeAccessApproved,
      res.locals.userId as string,
    );
    updates.jadeAccessApproved = body.jadeAccessApproved;
  }
  // C033 — org-wide context applied to drafting/review/redline prompts.
  if (typeof body.orgContext === "string") {
    await setAppSetting(
      "org_context",
      body.orgContext.slice(0, 20_000),
      res.locals.userId as string,
    );
    updates.orgContext = body.orgContext.slice(0, 20_000);
  }
  // Student model access — site-wide allow-list applied to every member of
  // any student group. `null` (or an empty array) lifts the restriction.
  if ("studentAllowedModels" in body) {
    const raw = body.studentAllowedModels;
    if (raw !== null && !Array.isArray(raw)) {
      return void res.status(400).json({
        detail: "studentAllowedModels must be an array of model ids, or null",
      });
    }
    const validIds = new Set(MODEL_REGISTRY.map((m) => m.id));
    const modelIds = Array.isArray(raw)
      ? raw.filter(
          (v): v is string => typeof v === "string" && validIds.has(v),
        )
      : null;
    await setStudentAllowedModels(
      modelIds,
      res.locals.userId as string,
    );
    updates.studentAllowedModels = modelIds && modelIds.length > 0 ? modelIds : null;
  }
  if (Object.keys(updates).length === 0) {
    return void res
      .status(400)
      .json({ detail: "No recognised settings in body" });
  }
  res.json(updates);
});

// ── GET /admin/costs ──────────────────────────────────────────────────────────
// Returns aggregate totals + paginated line-item breakdown.

adminRouter.get("/costs", async (req, res) => {
  const db = createServerSupabase();
  const limit = Math.min(parseInt(String(req.query.limit ?? "100"), 10) || 100, 500);
  const offset = parseInt(String(req.query.offset ?? "0"), 10) || 0;

  // Totals across all queries
  const { data: totals, error: totalsError } = await db
    .from("query_costs")
    .select("cost_usd, cost_aud, input_tokens, output_tokens");

  if (totalsError) {
    return void res.status(500).json({ detail: totalsError.message });
  }

  let totalUsd = 0;
  let totalAud = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalQueries = 0;
  for (const row of (totals ?? []) as { cost_usd: number; cost_aud: number; input_tokens: number; output_tokens: number }[]) {
    totalUsd += row.cost_usd;
    totalAud += row.cost_aud;
    totalInputTokens += row.input_tokens;
    totalOutputTokens += row.output_tokens;
    totalQueries++;
  }

  // Line-item breakdown (paginated, most recent first)
  const { data: rows, error: rowsError } = await db
    .from("query_costs")
    .select("id, user_id, chat_id, model, input_tokens, output_tokens, cost_usd, cost_aud, aud_rate, source, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (rowsError) {
    return void res.status(500).json({ detail: rowsError.message });
  }

  // Enrich with user emails
  const { data: authData } = await db.auth.admin.listUsers({ perPage: 1000 });
  const emailById = new Map((authData?.users ?? []).map((u) => [u.id, u.email ?? ""]));

  const lineItems = (rows ?? []).map((r: {
    id: string; user_id: string; chat_id: string | null; model: string;
    input_tokens: number; output_tokens: number; cost_usd: number; cost_aud: number;
    aud_rate: number; source: string; created_at: string;
  }) => ({
    ...r,
    userEmail: emailById.get(r.user_id) ?? r.user_id,
  }));

  res.json({
    totals: {
      totalQueries,
      totalUsd,
      totalAud,
      totalInputTokens,
      totalOutputTokens,
    },
    lineItems,
    offset,
    limit,
  });
});

// ---------------------------------------------------------------------------
// P3 (C019) — audit trail viewer.
// GET /admin/audit?user=<uuid>&project=<uuid>&tool=<name>&type=<event_type>
//                 &from=<iso>&to=<iso>&limit=<n>&format=csv
// ---------------------------------------------------------------------------
adminRouter.get("/audit", async (req, res) => {
  const db = createServerSupabase();
  const limit = Math.min(
    Math.max(parseInt(String(req.query.limit ?? "200"), 10) || 200, 1),
    1000,
  );
  let query = db
    .from("audit_events")
    .select(
      "id, actor_id, project_id, event_type, resource_type, resource_id, tool_name, detail, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (typeof req.query.user === "string" && req.query.user)
    query = query.eq("actor_id", req.query.user);
  if (typeof req.query.project === "string" && req.query.project)
    query = query.eq("project_id", req.query.project);
  if (typeof req.query.tool === "string" && req.query.tool)
    query = query.eq("tool_name", req.query.tool);
  if (typeof req.query.type === "string" && req.query.type)
    query = query.eq("event_type", req.query.type);
  if (typeof req.query.from === "string" && req.query.from)
    query = query.gte("created_at", req.query.from);
  if (typeof req.query.to === "string" && req.query.to)
    query = query.lte("created_at", req.query.to);

  const { data, error } = await query;
  if (error) return void res.status(500).json({ detail: error.message });
  const rows = data ?? [];

  // Resolve actor emails for display.
  const { data: profiles } = await db
    .from("user_profiles")
    .select("user_id, email");
  const emailById = new Map<string, string>(
    (profiles ?? []).map((p: { user_id: string; email: string | null }) => [
      p.user_id,
      p.email ?? p.user_id,
    ]),
  );
  const enriched = rows.map((r) => ({
    ...r,
    actor_email: emailById.get(r.actor_id as string) ?? r.actor_id,
  }));

  if (req.query.format === "csv") {
    const header =
      "created_at,actor_email,event_type,resource_type,resource_id,tool_name,project_id,detail";
    const lines = enriched.map((r) =>
      [
        r.created_at,
        r.actor_email,
        r.event_type,
        r.resource_type ?? "",
        r.resource_id ?? "",
        r.tool_name ?? "",
        r.project_id ?? "",
        JSON.stringify(r.detail ?? {}),
      ]
        .map((v) => `"${String(v).replaceAll('"', '""')}"`)
        .join(","),
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="rose-audit.csv"',
    );
    return void res.send([header, ...lines].join("\n"));
  }
  res.json({ events: enriched });
});

// ── Email transport diagnostics ──────────────────────────────────────────────
// GET  /admin/email-status  — is Resend configured, and what's the from-address?
// POST /admin/test-email    — send a real test email (defaults to the caller's
//                              own address) to confirm the transport actually
//                              delivers, not just that a key is present.

adminRouter.get("/email-status", async (_req, res) => {
  res.json({
    configured: isEmailConfigured(),
    fromAddress: process.env.NOTIFICATIONS_FROM_EMAIL || "Rose <onboarding@resend.dev>",
  });
});

adminRouter.post("/test-email", async (req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();

  if (!isEmailConfigured()) {
    return void res.status(400).json({
      detail: "Email is not configured on this instance. Set RESEND_API_KEY.",
    });
  }

  let to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
  if (!to) {
    const { data } = await db.auth.admin.getUserById(userId);
    to = data?.user?.email ?? "";
  }
  if (!to) {
    return void res.status(400).json({ detail: "No recipient email address found" });
  }

  const sent = await sendEmail({
    to,
    subject: "Rose — test email",
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;color:#111827;line-height:1.5">
      <h2 style="margin:0 0 12px">Rose email transport check</h2>
      <p>If you're reading this, outbound email via Resend is working — sent at ${new Date().toISOString()}.</p>
    </div>`,
    text: `Rose email transport check — outbound email via Resend is working. Sent at ${new Date().toISOString()}.`,
  });

  if (!sent.ok) {
    return void res.status(502).json({ detail: sent.error });
  }
  res.json({ ok: true, to });
});

// ---------------------------------------------------------------------------
// Per-project organisational context (extends C033). Admins set a context
// string per project; it's injected into that project's chat + agent prompts
// alongside the global org context.
//
// GET /admin/project-contexts → [{ id, name, context }]
// PUT /admin/projects/:id/context { context }
// ---------------------------------------------------------------------------
adminRouter.get("/project-contexts", async (_req, res) => {
  const db = createServerSupabase();
  const { data, error } = await db
    .from("projects")
    .select("id, name, context")
    .order("name", { ascending: true });
  if (error) return void res.status(500).json({ detail: error.message });
  res.json({ projects: data ?? [] });
});

adminRouter.put("/projects/:id/context", async (req, res) => {
  const db = createServerSupabase();
  const context =
    typeof req.body?.context === "string"
      ? req.body.context.slice(0, 20_000)
      : "";
  const { data, error } = await db
    .from("projects")
    .update({ context: context.trim() ? context : null })
    .eq("id", req.params.id)
    .select("id, name, context")
    .maybeSingle();
  if (error) return void res.status(500).json({ detail: error.message });
  if (!data) return void res.status(404).json({ detail: "Project not found" });
  res.json(data);
});

// ---------------------------------------------------------------------------
// Central document management — link the admin's Library documents (and
// folders) to any number of projects (live references, not copies). Powers
// the Admin → Documents page: folders can be linked to projects, and any
// document filed inside a linked folder inherits that folder's links
// (override, not additive — see documentLinks.ts/folderLinks.ts). Unfiled
// documents keep their own direct per-document links, same as before.
//
// GET /admin/document-library
//   → { documents: [{ id, filename, file_type, library_kind, folder_id,
//                      created_at, linked_project_ids }],
//       folders: [{ id, name, parent_folder_id, linked_project_ids }],
//       projects: [{ id, name }] }
// PUT /admin/documents/:documentId/links { project_ids: [] }
//   → replaces the full set of direct project links for one (unfiled)
//     document. Rejected for documents currently inside a folder.
// PUT /admin/folders/:folderId/links { project_ids: [] }
//   → replaces the full set of project links for one folder.
// ---------------------------------------------------------------------------
adminRouter.get("/document-library", async (req, res) => {
  const db = createServerSupabase();
  const adminId = res.locals.userId as string;

  const [{ data: rawDocs }, { data: projects }, { data: rawFolders }] =
    await Promise.all([
      db
        .from("documents")
        .select(
          "id, user_id, library_kind, library_folder_id, created_at, current_version_id",
        )
        .eq("user_id", adminId)
        .is("project_id", null)
        // Scope to Library → Files (folders are file-kind only; keeping
        // templates out avoids a template doc silently vanishing from this
        // view if it sits in a template folder, which isn't in `folders`).
        .or("library_kind.eq.file,library_kind.is.null")
        .order("created_at", { ascending: false }),
      db
        .from("projects")
        .select("id, name")
        .order("name", { ascending: true }),
      db
        .from("library_folders")
        .select("id, name, parent_folder_id, created_at")
        .eq("user_id", adminId)
        .eq("library_kind", "file")
        .order("name", { ascending: true }),
    ]);

  const docs = (rawDocs ?? []) as unknown as {
    id: string;
    library_kind?: string | null;
    library_folder_id?: string | null;
    created_at?: string | null;
    filename?: string | null;
    file_type?: string | null;
  }[];
  await attachActiveVersionPaths(db, docs);
  const linkMap = await linksByDocument(
    db,
    docs.map((d) => d.id),
  );

  const folders = (rawFolders ?? []) as {
    id: string;
    name: string;
    parent_folder_id: string | null;
    created_at: string | null;
  }[];
  const folderLinkMap = await linksByFolder(
    db,
    folders.map((f) => f.id),
  );

  res.json({
    documents: docs.map((d) => ({
      id: d.id,
      filename: d.filename ?? "Untitled document",
      file_type: d.file_type ?? null,
      library_kind: d.library_kind ?? "file",
      folder_id: d.library_folder_id ?? null,
      created_at: d.created_at ?? null,
      linked_project_ids: linkMap.get(d.id) ?? [],
    })),
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      parent_folder_id: f.parent_folder_id,
      linked_project_ids: folderLinkMap.get(f.id) ?? [],
    })),
    projects: (projects ?? []).map((p: { id: string; name: string }) => ({
      id: p.id,
      name: p.name,
    })),
  });
});

adminRouter.put("/documents/:documentId/links", async (req, res) => {
  const db = createServerSupabase();
  const adminId = res.locals.userId as string;
  const { documentId } = req.params;

  // Only allow linking the admin's own Library documents.
  const { data: doc } = await db
    .from("documents")
    .select("id, user_id, library_folder_id")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc || (doc as { user_id: string }).user_id !== adminId) {
    return void res.status(404).json({ detail: "Document not found" });
  }
  if ((doc as { library_folder_id: string | null }).library_folder_id) {
    return void res.status(400).json({
      detail:
        "This document is inside a folder — set project links on the folder instead.",
    });
  }

  const raw: unknown[] = Array.isArray(req.body?.project_ids)
    ? (req.body.project_ids as unknown[])
    : [];
  const projectIds: string[] = [
    ...new Set(
      raw.filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  ];

  // Guard against linking to non-existent projects.
  let validIds: string[] = projectIds;
  if (projectIds.length > 0) {
    const { data: existing } = await db
      .from("projects")
      .select("id")
      .in("id", projectIds);
    const existingSet = new Set<string>(
      (existing ?? []).map((p: { id: string }) => p.id),
    );
    validIds = projectIds.filter((id: string) => existingSet.has(id));
  }

  await setDocumentLinks(db, documentId, validIds, adminId);
  res.json({ ok: true, project_ids: validIds });
});

adminRouter.put("/folders/:folderId/links", async (req, res) => {
  const db = createServerSupabase();
  const adminId = res.locals.userId as string;
  const { folderId } = req.params;

  // Only allow linking the admin's own Library folders.
  const { data: folder } = await db
    .from("library_folders")
    .select("id, user_id, library_kind")
    .eq("id", folderId)
    .maybeSingle();
  if (
    !folder ||
    (folder as { user_id: string }).user_id !== adminId ||
    (folder as { library_kind: string }).library_kind !== "file"
  ) {
    return void res.status(404).json({ detail: "Folder not found" });
  }

  const raw: unknown[] = Array.isArray(req.body?.project_ids)
    ? (req.body.project_ids as unknown[])
    : [];
  const projectIds: string[] = [
    ...new Set(
      raw.filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  ];

  let validIds: string[] = projectIds;
  if (projectIds.length > 0) {
    const { data: existing } = await db
      .from("projects")
      .select("id")
      .in("id", projectIds);
    const existingSet = new Set<string>(
      (existing ?? []).map((p: { id: string }) => p.id),
    );
    validIds = projectIds.filter((id: string) => existingSet.has(id));
  }

  await setFolderLinks(db, folderId, validIds, adminId);
  res.json({ ok: true, project_ids: validIds });
});

// ---------------------------------------------------------------------------
// C004 — Command Center: adoption analytics + cohort comparison.
// GET /admin/analytics?days=30
// ---------------------------------------------------------------------------
adminRouter.get("/analytics", async (req, res) => {
  const db = createServerSupabase();
  const days = Math.min(
    Math.max(parseInt(String(req.query.days ?? "30"), 10) || 30, 1),
    365,
  );
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [{ data: costs }, { data: audits }, { data: profiles }] =
    await Promise.all([
      db
        .from("query_costs")
        .select("user_id, project_id, model, source, input_tokens, output_tokens, cost_aud, created_at")
        .gte("created_at", since)
        .limit(20000),
      db
        .from("audit_events")
        .select("actor_id, event_type, tool_name, created_at")
        .gte("created_at", since)
        .limit(20000),
      db.from("user_profiles").select("user_id, email, cohort"),
    ]);

  const cohortByUser = new Map<string, string>(
    (profiles ?? []).map((p: { user_id: string; cohort: string | null }) => [
      p.user_id,
      p.cohort ?? "(no cohort)",
    ]),
  );

  const day = (iso: string) => iso.slice(0, 10);
  const activeByWindow = (windowDays: number) => {
    const cutoff = Date.now() - windowDays * 86_400_000;
    const users = new Set<string>();
    for (const r of costs ?? []) {
      if (Date.parse(r.created_at as string) >= cutoff)
        users.add(r.user_id as string);
    }
    for (const a of audits ?? []) {
      if (Date.parse(a.created_at as string) >= cutoff)
        users.add(a.actor_id as string);
    }
    return users.size;
  };

  const costByDay = new Map<string, number>();
  const costByModel = new Map<string, { costAud: number; calls: number }>();
  const costBySource = new Map<string, { costAud: number; calls: number }>();
  // C077 — per-project consumption (rows without project attribution group
  // under "(no project)").
  const costByProject = new Map<string, { costAud: number; calls: number }>();
  const byCohort = new Map<
    string,
    { users: Set<string>; costAud: number; calls: number }
  >();
  for (const r of costs ?? []) {
    const d = day(r.created_at as string);
    const aud = Number(r.cost_aud) || 0;
    costByDay.set(d, (costByDay.get(d) ?? 0) + aud);
    const model = (r.model as string) ?? "unknown";
    const m = costByModel.get(model) ?? { costAud: 0, calls: 0 };
    m.costAud += aud;
    m.calls += 1;
    costByModel.set(model, m);
    const source = (r.source as string) ?? "unknown";
    const s = costBySource.get(source) ?? { costAud: 0, calls: 0 };
    s.costAud += aud;
    s.calls += 1;
    costBySource.set(source, s);
    const project = (r.project_id as string | null) ?? "(no project)";
    const p = costByProject.get(project) ?? { costAud: 0, calls: 0 };
    p.costAud += aud;
    p.calls += 1;
    costByProject.set(project, p);
    const cohort = cohortByUser.get(r.user_id as string) ?? "(no cohort)";
    const c = byCohort.get(cohort) ?? {
      users: new Set<string>(),
      costAud: 0,
      calls: 0,
    };
    c.users.add(r.user_id as string);
    c.costAud += aud;
    c.calls += 1;
    byCohort.set(cohort, c);
  }

  const toolUsage = new Map<string, number>();
  const eventTypes = new Map<string, number>();
  for (const a of audits ?? []) {
    if (a.tool_name)
      toolUsage.set(
        a.tool_name as string,
        (toolUsage.get(a.tool_name as string) ?? 0) + 1,
      );
    eventTypes.set(
      a.event_type as string,
      (eventTypes.get(a.event_type as string) ?? 0) + 1,
    );
  }

  res.json({
    windowDays: days,
    activeUsers: { d7: activeByWindow(7), d30: activeByWindow(30) },
    totalCostAud: [...costByDay.values()].reduce((a, b) => a + b, 0),
    costByDay: [...costByDay.entries()]
      .sort()
      .map(([date, costAud]) => ({ date, costAud })),
    costByModel: [...costByModel.entries()]
      .map(([model, v]) => ({ model, ...v }))
      .sort((a, b) => b.costAud - a.costAud),
    costBySource: [...costBySource.entries()]
      .map(([source, v]) => ({ source, ...v }))
      .sort((a, b) => b.costAud - a.costAud),
    costByProject: [...costByProject.entries()]
      .map(([projectId, v]) => ({ projectId, ...v }))
      .sort((a, b) => b.costAud - a.costAud)
      .slice(0, 25),
    toolUsage: [...toolUsage.entries()]
      .map(([tool, count]) => ({ tool, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 25),
    eventTypes: [...eventTypes.entries()].map(([type, count]) => ({
      type,
      count,
    })),
    cohorts: [...byCohort.entries()]
      .map(([cohort, v]) => ({
        cohort,
        users: v.users.size,
        costAud: v.costAud,
        calls: v.calls,
      }))
      .sort((a, b) => b.costAud - a.costAud),
  });
});

// PATCH /admin/users/:userId/cohort { cohort } — C004 cohort tagging.
adminRouter.patch("/users/:userId/cohort", async (req, res) => {
  const db = createServerSupabase();
  const cohort =
    typeof req.body?.cohort === "string" && req.body.cohort.trim()
      ? req.body.cohort.trim().slice(0, 100)
      : null;
  const { error } = await db
    .from("user_profiles")
    .update({ cohort })
    .eq("user_id", req.params.userId);
  if (error) return void res.status(500).json({ detail: error.message });
  res.json({ ok: true, cohort });
});
