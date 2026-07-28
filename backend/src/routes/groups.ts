/**
 * /groups — Student / user groups (admin-only management).
 *
 * Lets an instructor invite a whole class in one go and manage its access as
 * a unit:
 *   GET    /groups                       List groups (member + grant counts)
 *   POST   /groups                       Create a group { name, description? }
 *   PATCH  /groups/:id                   Rename / redescribe
 *   DELETE /groups/:id                   Delete (cascades members + grants)
 *   GET    /groups/:id                   Group detail: members + project grants
 *   POST   /groups/:id/members           Bulk add { emails: string | string[] }
 *   DELETE /groups/:id/members/:memberId Remove one member
 *
 * Membership is email-based ("match on signup"): unregistered emails are
 * valid members and activate the moment that email registers. Project role
 * grants live on the project routes (/projects/:id/groups) so they sit with
 * the rest of the members API.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import { createServerSupabase } from "../lib/supabase";
import {
  loadProfileUsersByEmail,
  loadActivatedEmails,
  normalizeEmail,
} from "../lib/userLookup";
import { recordAudit } from "../lib/audit";
import { isEmailConfigured, sendEmail, escapeHtml } from "../lib/email";
import { createAcceptLink } from "../lib/inviteLinks";

/** Branded invitation email body containing the Supabase action link. */
function inviteEmailHtml(groupName: string, actionLink: string): string {
  const safeGroup = escapeHtml(groupName);
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;color:#111827;line-height:1.5">
  <h2 style="margin:0 0 12px">You're invited to Rose</h2>
  <p>You've been added to <strong>${safeGroup}</strong> on Rose — an AI legal assistant for research and educational use.</p>
  <p>Click below to set up your account and get started:</p>
  <p style="margin:20px 0">
    <a href="${actionLink}" style="display:inline-block;background:#111827;color:#ffffff;padding:11px 20px;border-radius:6px;text-decoration:none;font-weight:600">Accept invitation</a>
  </p>
  <p style="color:#6b7280;font-size:12px">If the button doesn't work, copy this link into your browser:<br>
    <span style="word-break:break-all">${actionLink}</span>
  </p>
  <p style="color:#9ca3af;font-size:12px;margin-top:24px">Rose — research &amp; educational use only. Not legal advice.</p>
</div>`;
}

export const groupsRouter = Router();
groupsRouter.use(requireAuth, requireAdmin);

/** Parse pasted emails: accepts an array or a blob separated by commas,
 * semicolons, whitespace or newlines. Returns lowercase, deduped. */
function parseEmails(input: unknown): { valid: string[]; invalid: string[] } {
  let parts: string[] = [];
  if (Array.isArray(input)) {
    parts = input.filter((e): e is string => typeof e === "string");
  } else if (typeof input === "string") {
    parts = input.split(/[\s,;]+/);
  }
  const valid = new Set<string>();
  const invalid: string[] = [];
  for (const raw of parts) {
    const e = raw.trim().toLowerCase();
    if (!e) continue;
    // Deliberately loose: local@domain.tld
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) valid.add(e);
    else invalid.push(e);
  }
  return { valid: [...valid], invalid };
}

// ── GET /groups ───────────────────────────────────────────────────────────────

groupsRouter.get("/", async (_req, res) => {
  const db = createServerSupabase();
  const [{ data: groups }, { data: members }, { data: grants }] =
    await Promise.all([
      db
        .from("user_groups")
        .select("id, name, description, created_at")
        .order("created_at", { ascending: true }),
      db.from("user_group_members").select("group_id, user_id"),
      db.from("project_group_grants").select("group_id"),
    ]);
  const memberRows = (members ?? []) as {
    group_id: string;
    user_id: string | null;
  }[];
  const grantRows = (grants ?? []) as { group_id: string }[];
  res.json({
    groups: ((groups ?? []) as {
      id: string;
      name: string;
      description: string | null;
      created_at: string;
    }[]).map((g) => ({
      ...g,
      member_count: memberRows.filter((m) => m.group_id === g.id).length,
      registered_count: memberRows.filter(
        (m) => m.group_id === g.id && m.user_id,
      ).length,
      project_count: grantRows.filter((x) => x.group_id === g.id).length,
    })),
  });
});

// ── POST /groups ──────────────────────────────────────────────────────────────

groupsRouter.post("/", async (req, res) => {
  const userId = res.locals.userId as string;
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const description =
    typeof req.body?.description === "string"
      ? req.body.description.trim() || null
      : null;
  if (!name) return void res.status(400).json({ detail: "name required" });

  const db = createServerSupabase();
  const { data, error } = await db
    .from("user_groups")
    .insert({ name, description, created_by: userId })
    .select("id, name, description, created_at")
    .single();
  if (error) return void res.status(500).json({ detail: error.message });
  recordAudit({
    actorId: userId,
    eventType: "member_change",
    resourceType: "group",
    resourceId: (data as { id: string }).id,
    detail: { action: "create_group", name },
  });
  res.json({ group: data });
});

// ── PATCH /groups/:id ─────────────────────────────────────────────────────────

groupsRouter.patch("/:id", async (req, res) => {
  const db = createServerSupabase();
  const patch: Record<string, string | null> = {};
  if (typeof req.body?.name === "string" && req.body.name.trim())
    patch.name = req.body.name.trim();
  if (typeof req.body?.description === "string")
    patch.description = req.body.description.trim() || null;
  if (Object.keys(patch).length === 0)
    return void res.status(400).json({ detail: "Nothing to update" });
  const { error } = await db
    .from("user_groups")
    .update(patch)
    .eq("id", req.params.id);
  if (error) return void res.status(500).json({ detail: error.message });
  res.json({ ok: true });
});

// ── DELETE /groups/:id ────────────────────────────────────────────────────────

groupsRouter.delete("/:id", async (req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { error } = await db
    .from("user_groups")
    .delete()
    .eq("id", req.params.id);
  if (error) return void res.status(500).json({ detail: error.message });
  recordAudit({
    actorId: userId,
    eventType: "member_change",
    resourceType: "group",
    resourceId: req.params.id,
    detail: { action: "delete_group" },
  });
  res.json({ ok: true });
});

// ── GET /groups/:id ───────────────────────────────────────────────────────────

groupsRouter.get("/:id", async (req, res) => {
  const db = createServerSupabase();
  const { data: group } = await db
    .from("user_groups")
    .select("id, name, description, created_at")
    .eq("id", req.params.id)
    .maybeSingle();
  if (!group) return void res.status(404).json({ detail: "Group not found" });

  const [{ data: members }, { data: grants }, { userByEmail }, activatedEmails] =
    await Promise.all([
      db
        .from("user_group_members")
        .select("id, email, user_id, created_at")
        .eq("group_id", req.params.id)
        .order("email", { ascending: true }),
      db
        .from("project_group_grants")
        .select("id, project_id, role, created_at, projects(name)")
        .eq("group_id", req.params.id),
      loadProfileUsersByEmail(db),
      // Ground truth for "actually registered": confirmed / has signed in.
      // A profile row alone is NOT enough — a trigger creates it when an
      // invite provisions the account, before the student has accepted.
      loadActivatedEmails(db),
    ]);

  const memberRows = (members ?? []) as {
    id: string;
    email: string;
    user_id: string | null;
    created_at: string;
  }[];

  // Invitation status per member email. The invite endpoint records one
  // `invitations` row each time an email invite is sent, so a member can
  // have several — we surface the most recent send date. (No group_id on
  // that table, so we look up by the emails in this group.)
  const emails = memberRows.map((m) => m.email);
  const lastInvitedByEmail = new Map<string, string>();
  if (emails.length > 0) {
    const { data: invites } = await db
      .from("invitations")
      .select("email, created_at")
      .in("email", emails);
    for (const inv of (invites ?? []) as {
      email: string;
      created_at: string;
    }[]) {
      const prev = lastInvitedByEmail.get(inv.email);
      if (!prev || inv.created_at > prev) {
        lastInvitedByEmail.set(inv.email, inv.created_at);
      }
    }
  }

  res.json({
    group,
    members: memberRows.map((m) => {
      const u = userByEmail.get(m.email);
      const invitedAt = lastInvitedByEmail.get(m.email) ?? null;
      // Registered = the student has actually activated their account
      // (backfilled user_id, or confirmed/signed-in in auth). Merely having
      // been provisioned by an invite (which creates a profile row via a
      // trigger) does NOT count.
      const registered =
        Boolean(m.user_id) || activatedEmails.has(m.email.toLowerCase());
      return {
        ...m,
        registered,
        display_name: u?.display_name ?? null,
        invited: invitedAt !== null,
        invited_at: invitedAt,
      };
    }),
    grants: ((grants ?? []) as unknown as {
      id: string;
      project_id: string;
      role: string;
      created_at: string;
      projects: { name: string } | null;
    }[]).map((g) => ({
      id: g.id,
      project_id: g.project_id,
      role: g.role,
      created_at: g.created_at,
      project_name: g.projects?.name ?? null,
    })),
  });
});

// ── POST /groups/:id/members — bulk add ──────────────────────────────────────

groupsRouter.post("/:id/members", async (req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { data: group } = await db
    .from("user_groups")
    .select("id, name")
    .eq("id", req.params.id)
    .maybeSingle();
  if (!group) return void res.status(404).json({ detail: "Group not found" });

  const { valid, invalid } = parseEmails(req.body?.emails);
  if (valid.length === 0)
    return void res
      .status(400)
      .json({ detail: "No valid email addresses supplied", invalid });
  if (valid.length > 500)
    return void res
      .status(400)
      .json({ detail: "At most 500 emails per import" });

  // Resolve already-registered users so user_id is set immediately.
  const { userByEmail } = await loadProfileUsersByEmail(db);
  const rows = valid.map((email) => ({
    group_id: req.params.id,
    email,
    user_id: userByEmail.get(email)?.id ?? null,
    added_by: userId,
  }));
  const { error } = await db
    .from("user_group_members")
    .upsert(rows, { onConflict: "group_id,email", ignoreDuplicates: true });
  if (error) return void res.status(500).json({ detail: error.message });

  recordAudit({
    actorId: userId,
    eventType: "member_change",
    resourceType: "group",
    resourceId: req.params.id,
    detail: { action: "bulk_add", count: valid.length, invalid },
  });
  res.json({ ok: true, added: valid.length, invalid });
});

// ── POST /groups/:id/invite — email a set-up invite to unregistered members ──
//
// Match-on-signup means members can exist without accounts. This onboards a
// whole cohort in one click: for every member who doesn't yet have an account
// we provision an invite via Supabase Admin `generateLink` (which creates the
// user and returns an action link WITHOUT sending anything) and then deliver
// our own branded email through Resend.
//
// Why not `inviteUserByEmail`? That routes through Supabase Auth's built-in
// mailer, which on the default project is rate-limited to a few emails/hour
// (429 over_email_send_rate_limit) — it silently fails for a whole class.
// `generateLink` + Resend sidesteps that limit entirely and uses the same
// email transport as our notifications. Already-registered members are skipped.

groupsRouter.post("/:id/invite", async (req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();

  if (!isEmailConfigured()) {
    return void res.status(400).json({
      detail:
        "Email is not configured on this instance. Set RESEND_API_KEY (and NOTIFICATIONS_FROM_EMAIL) to send invitations.",
    });
  }

  const { data: group } = await db
    .from("user_groups")
    .select("id, name")
    .eq("id", req.params.id)
    .maybeSingle();
  if (!group) return void res.status(404).json({ detail: "Group not found" });

  const { data: members } = await db
    .from("user_group_members")
    .select("email, user_id")
    .eq("group_id", req.params.id);
  const rows = (members ?? []) as { email: string; user_id: string | null }[];

  // Target = members who haven't ACTUALLY activated an account yet.
  //
  // This deliberately uses `loadActivatedEmails` (auth confirmation / sign-in)
  // rather than `loadProfileUsersByEmail`. A DB trigger writes a user_profiles
  // row the instant `generateLink` provisions the account, so profile-existence
  // marks every member as "registered" the moment the FIRST invite goes out —
  // which made every subsequent re-invite a silent no-op that reported
  // `invited: 0, skipped_registered: <everyone>`. The list view (GET /:id)
  // already used the activation check; this endpoint had been left behind.
  //
  // `force: true` overrides the skip entirely. That is needed to recover from
  // the mail-scanner incident (see lib/inviteLinks.ts): a scanner redeemed the
  // old single-use links, which stamped `email_confirmed_at` on accounts whose
  // owners never saw the email, so those students now look activated and would
  // otherwise be unreachable by any re-send.
  const force = req.body?.force === true;
  const activated = await loadActivatedEmails(db);
  const targets = rows
    .map((m) => m.email)
    .filter((email) => force || !activated.has(normalizeEmail(email)));
  const skippedRegistered = rows.length - targets.length;

  let invited = 0;
  const failed: { email: string; reason: string }[] = [];

  for (const email of targets) {
    // 1. Provision a one-time token WITHOUT sending Supabase's own email, and
    //    wrap it in a /accept URL that mail scanners can fetch harmlessly.
    // `setup: true` — a class invite is always onboarding, so land the student
    // on the password-setup step even if the token came back as a magiclink
    // because a previous invite had already provisioned their account.
    const link = await createAcceptLink(db, email, { setup: true });
    if (!link.ok) {
      failed.push({ email, reason: link.error });
      continue;
    }

    // 2. Deliver our own branded email via Resend.
    const sent = await sendEmail({
      to: email,
      subject: `You're invited to Rose — ${group.name}`,
      html: inviteEmailHtml(group.name as string, link.acceptUrl),
    });
    if (!sent.ok) {
      failed.push({ email, reason: sent.error });
      continue;
    }

    invited += 1;
    // Record for admin visibility (best-effort; ignore dupes).
    await db.from("invitations").insert({ email, invited_by: userId });
  }

  recordAudit({
    actorId: userId,
    eventType: "member_change",
    resourceType: "group",
    resourceId: req.params.id,
    detail: {
      action: "bulk_invite",
      invited,
      already_registered: skippedRegistered,
      failed: failed.length,
      forced: force,
    },
  });

  res.json({
    ok: true,
    invited,
    skipped_registered: skippedRegistered,
    failed,
  });
});

// ── DELETE /groups/:id/members/:memberId ─────────────────────────────────────

groupsRouter.delete("/:id/members/:memberId", async (req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { error } = await db
    .from("user_group_members")
    .delete()
    .eq("group_id", req.params.id)
    .eq("id", req.params.memberId);
  if (error) return void res.status(500).json({ detail: error.message });
  recordAudit({
    actorId: userId,
    eventType: "member_change",
    resourceType: "group",
    resourceId: req.params.id,
    detail: { action: "remove_member", member: req.params.memberId },
  });
  res.json({ ok: true });
});
