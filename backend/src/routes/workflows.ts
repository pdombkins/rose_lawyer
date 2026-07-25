import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import {
  SYSTEM_WORKFLOW_IDS,
  SYSTEM_WORKFLOWS,
  type SystemWorkflow,
} from "../lib/systemWorkflows";
import { findMissingUserEmails } from "../lib/userLookup";

export const workflowsRouter = Router();

type Db = ReturnType<typeof createServerSupabase>;
const isDev = process.env.NODE_ENV !== "production";
const devLog = (...args: Parameters<typeof console.log>) => {
  if (isDev) console.log(...args);
};

type WorkflowRecord = {
  id: string;
  user_id: string | null;
  is_system?: boolean;
  title?: string;
  type?: string;
  prompt_md?: string | null;
  columns_config?: unknown;
  language?: string | null;
  version?: string | null;
  practice?: string | null;
  jurisdictions?: string[] | null;
  created_at?: string;
  [key: string]: unknown;
};

type WorkflowType = "assistant" | "tabular";

type WorkflowContributor = {
  name: string;
  organisation: string | null;
  role: string | null;
  linkedin: string | null;
};

type WorkflowMetadata = {
  title: string;
  description: string | null;
  type: WorkflowType;
  contributors: WorkflowContributor[];
  language: string;
  version: string | null;
  practice: string | null;
  jurisdictions: string[] | null;
};
type OpenSourceSubmissionStatus = "pending" | "approved" | "rejected";

type OpenSourceSubmissionRow = {
  id: string;
  workflow_id: string;
  submitted_by_user_id: string;
  submitter_email: string | null;
  submitter_name: string | null;
  contributor_mode?: "named" | "anonymous";
  status: OpenSourceSubmissionStatus;
  snapshot: unknown;
  submitted_at: string;
  updated_at: string;
  reviewed_at?: string | null;
  review_notes?: string | null;
};

type OpenSourceSubmissionSummary = Pick<
  OpenSourceSubmissionRow,
  "id" | "status" | "submitted_at" | "updated_at"
> & {
  reviewed_at?: string | null;
};

const DEFAULT_WORKFLOW_CONTRIBUTOR: WorkflowContributor = {
  name: "Rose",
  organisation: null,
  role: null,
  linkedin: null,
};
const DEFAULT_WORKFLOW_LANGUAGE = "English";
const DEFAULT_WORKFLOW_PRACTICE = "General Transactions";
const DEFAULT_WORKFLOW_JURISDICTIONS = ["General"];
const WORKFLOW_CONTRIBUTIONS_ENABLED =
  process.env.WORKFLOW_CONTRIBUTIONS_ENABLED === "true";

type WorkflowAccess =
  | {
      workflow: WorkflowRecord;
      allowEdit: boolean;
      isOwner: boolean;
    }
  | null;

type AsyncRoute = (req: Request, res: Response) => Promise<unknown>;

function asyncRoute(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res).catch(next);
  };
}

function withWorkflowAccess<T extends object>(
  workflow: T,
  access: { allowEdit: boolean; isOwner: boolean; sharedByName?: string | null },
) {
  return {
    ...workflow,
    allow_edit: access.allowEdit,
    is_owner: access.isOwner,
    shared_by_name: access.sharedByName ?? null,
  };
}

function withOpenSourceSubmission<T extends object>(
  workflow: T,
  submission: OpenSourceSubmissionSummary | null,
) {
  return {
    ...workflow,
    open_source_submission: submission,
  };
}

function withSystemWorkflowAccess(workflow: SystemWorkflow) {
  return withWorkflowAccess(workflow, {
    allowEdit: false,
    isOwner: false,
  });
}

function workflowTypeFrom(value: unknown): WorkflowType {
  return value === "tabular" ? "tabular" : "assistant";
}

function metadataFromWorkflowRecord(workflow: WorkflowRecord): WorkflowMetadata {
  return {
    title: workflow.title ?? "",
    description: null,
    type: workflowTypeFrom(workflow.type),
    contributors:
      normalizeContributors(workflow.contributors) ?? [
        DEFAULT_WORKFLOW_CONTRIBUTOR,
      ],
    language: workflow.language ?? DEFAULT_WORKFLOW_LANGUAGE,
    version: workflow.version ?? null,
    practice: workflow.practice ?? DEFAULT_WORKFLOW_PRACTICE,
    jurisdictions: workflow.jurisdictions ?? DEFAULT_WORKFLOW_JURISDICTIONS,
  };
}

function withDatabaseWorkflow(workflow: WorkflowRecord) {
  const {
    title: _title,
    type: _type,
    contributors: _contributors,
    language: _language,
    version: _version,
    practice: _practice,
    jurisdictions: _jurisdictions,
    prompt_md,
    ...rest
  } = workflow;
  return {
    ...rest,
    metadata: metadataFromWorkflowRecord(workflow),
    skill_md: prompt_md ?? null,
    is_system: false,
  };
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeJurisdictions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value
    .map((item) => normalizeOptionalString(item))
    .filter((item): item is string => !!item);
  return items.length > 0 ? Array.from(new Set(items)) : null;
}

function normalizeContributors(value: unknown): WorkflowContributor[] | null {
  if (!Array.isArray(value)) return null;
  const contributors = value
    .map((item): WorkflowContributor | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const record = item as Record<string, unknown>;
      const name = normalizeOptionalString(record.name);
      if (!name) return null;
      return {
        name,
        organisation: normalizeOptionalString(record.organisation),
        role: normalizeOptionalString(record.role),
        linkedin: normalizeOptionalString(record.linkedin),
      };
    })
    .filter((item): item is WorkflowContributor => !!item);
  return contributors.length ? contributors : null;
}

function contributorFromName(name: unknown): WorkflowContributor {
  return {
    ...DEFAULT_WORKFLOW_CONTRIBUTOR,
    name: normalizeOptionalString(name) ?? DEFAULT_WORKFLOW_CONTRIBUTOR.name,
  };
}

async function resolveWorkflowAccess(
  workflowId: string,
  userId: string,
  userEmail: string | null | undefined,
  db: Db,
): Promise<WorkflowAccess> {
  const { data: workflow } = await db
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .single();
  if (!workflow) return null;
  const workflowRecord = workflow as WorkflowRecord;
  if (workflowRecord.user_id === userId) {
    return { workflow: workflowRecord, allowEdit: true, isOwner: true };
  }

  const normalizedUserEmail = (userEmail ?? "").trim().toLowerCase();
  if (!normalizedUserEmail) return null;

  const { data: share } = await db
    .from("workflow_shares")
    .select("allow_edit")
    .eq("workflow_id", workflowId)
    .eq("shared_with_email", normalizedUserEmail)
    .maybeSingle();
  if (!share) return null;

  return { workflow: workflowRecord, allowEdit: !!share.allow_edit, isOwner: false };
}

function toOpenSourceSubmissionSummary(
  row: OpenSourceSubmissionRow,
): OpenSourceSubmissionSummary {
  return {
    id: row.id,
    status: row.status,
    submitted_at: row.submitted_at,
    updated_at: row.updated_at,
    reviewed_at: row.reviewed_at ?? null,
  };
}

async function getLatestOpenSourceSubmission(
  db: Db,
  workflowId: string,
  userId: string,
): Promise<OpenSourceSubmissionSummary | null> {
  const { data, error } = await db
    .from("workflow_open_source_submissions")
    .select("id, status, submitted_at, updated_at, reviewed_at")
    .eq("workflow_id", workflowId)
    .eq("submitted_by_user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toOpenSourceSubmissionSummary(data as OpenSourceSubmissionRow) : null;
}

function buildOpenSourceSnapshot(
  workflow: WorkflowRecord,
  contributors: WorkflowContributor[],
  contributorMode: "named" | "anonymous",
) {
  return {
    workflow_id: workflow.id,
    metadata: {
      ...metadataFromWorkflowRecord(workflow),
      contributors,
    },
    skill_md: workflow.prompt_md ?? null,
    columns_config: workflow.columns_config ?? null,
    contributor_mode: contributorMode,
    created_at: workflow.created_at ?? null,
  };
}

function validateOpenSourceWorkflow(workflow: WorkflowRecord): string | null {
  if (workflow.type === "assistant") {
    return typeof workflow.prompt_md === "string" && workflow.prompt_md.trim()
      ? null
      : "Assistant workflows need instructions before they can be opened source.";
  }
  if (workflow.type === "tabular") {
    return Array.isArray(workflow.columns_config) && workflow.columns_config.length > 0
      ? null
      : "Tabular workflows need at least one column before they can be opened source.";
  }
  return "Workflow type must be 'assistant' or 'tabular'.";
}

// GET /workflows
workflowsRouter.get("/", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const userEmail = res.locals.userEmail as string | undefined;
  const { type } = req.query as { type?: string };
  const db = createServerSupabase();
  const workflowType = typeof type === "string" && type ? type : null;

  const { data, error } = await db.rpc("get_workflows_overview", {
    p_user_id: userId,
    p_user_email: userEmail ?? null,
    p_type: workflowType,
  });
  if (error) {
    return void res.status(500).json({ detail: error.message });
  }

  const systemWorkflows = SYSTEM_WORKFLOWS.filter(
    (workflow) => !workflowType || workflow.metadata.type === workflowType,
  ).map(withSystemWorkflowAccess);
  const databaseWorkflows = ((data ?? []) as WorkflowRecord[]).filter(
    (workflow) => !SYSTEM_WORKFLOW_IDS.has(workflow.id),
  ).map(withDatabaseWorkflow);

  res.json([...systemWorkflows, ...databaseWorkflows]);
}));

// POST /workflows
workflowsRouter.post("/", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const {
    metadata,
    skill_md,
    columns_config,
  } = req.body as {
    metadata?: Partial<WorkflowMetadata>;
    skill_md?: string;
    columns_config?: unknown;
  };
  const title = metadata?.title;
  const type = metadata?.type;
  if (!title?.trim())
    return void res.status(400).json({ detail: "metadata.title is required" });
  if (type !== "assistant" && type !== "tabular")
    return void res
      .status(400)
      .json({ detail: "metadata.type must be 'assistant' or 'tabular'" });

  const db = createServerSupabase();
  devLog("[workflows/create] request", {
    userId,
    title: title.trim(),
    type,
    hasSkill: typeof skill_md === "string" && skill_md.length > 0,
    columnCount: Array.isArray(columns_config) ? columns_config.length : null,
    language:
      normalizeOptionalString(metadata?.language) ?? DEFAULT_WORKFLOW_LANGUAGE,
    practice: metadata?.practice ?? null,
    jurisdictions:
      normalizeJurisdictions(metadata?.jurisdictions) ??
      DEFAULT_WORKFLOW_JURISDICTIONS,
  });
  const { data, error } = await db
    .from("workflows")
    .insert({
      user_id: userId,
      title: title.trim(),
      type,
      prompt_md: skill_md ?? null,
      columns_config: columns_config ?? null,
      language:
        normalizeOptionalString(metadata?.language) ?? DEFAULT_WORKFLOW_LANGUAGE,
      practice:
        normalizeOptionalString(metadata?.practice) ?? DEFAULT_WORKFLOW_PRACTICE,
      jurisdictions:
        normalizeJurisdictions(metadata?.jurisdictions) ??
        DEFAULT_WORKFLOW_JURISDICTIONS,
    })
    .select("*")
    .single();
  if (error) {
    devLog("[workflows/create] insert error", {
      userId,
      title: title.trim(),
      type,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return void res.status(500).json({ detail: error.message });
  }
  devLog("[workflows/create] inserted", {
    id: data?.id,
    user_id: data?.user_id,
    title: data?.title,
    type: data?.type,
  });
  res.status(201).json(withDatabaseWorkflow(data as WorkflowRecord));
}));

async function handleWorkflowUpdate(req: Request, res: Response) {
  const userId = res.locals.userId as string;
  const userEmail = res.locals.userEmail as string | undefined;
  const { workflowId } = req.params;
  const updates: Record<string, unknown> = {};
  const metadata = req.body.metadata as Partial<WorkflowMetadata> | undefined;
  if (metadata?.title != null) updates.title = metadata.title;
  if (req.body.skill_md != null) updates.prompt_md = req.body.skill_md;
  if (req.body.columns_config != null)
    updates.columns_config = req.body.columns_config;
  if (metadata && "language" in metadata)
    updates.language = normalizeOptionalString(metadata.language);
  if (metadata && "practice" in metadata)
    updates.practice = metadata.practice ?? null;
  if (metadata && "jurisdictions" in metadata)
    updates.jurisdictions = normalizeJurisdictions(metadata.jurisdictions);

  const db = createServerSupabase();
  const access = await resolveWorkflowAccess(workflowId, userId, userEmail, db);
  if (!access || !access.allowEdit) {
    return void res
      .status(404)
      .json({ detail: "Workflow not found or not editable" });
  }
  const { data, error } = await db
    .from("workflows")
    .update(updates)
    .eq("id", workflowId)
    .select("*")
    .single();
  if (error || !data)
    return void res
      .status(404)
      .json({ detail: "Workflow not found or not editable" });
  res.json(
    withWorkflowAccess(withDatabaseWorkflow(data as WorkflowRecord), {
      allowEdit: access.allowEdit,
      isOwner: access.isOwner,
    }),
  );
}

// PUT /workflows/:workflowId
workflowsRouter.put("/:workflowId", requireAuth, asyncRoute(handleWorkflowUpdate));

// PATCH /workflows/:workflowId
workflowsRouter.patch("/:workflowId", requireAuth, asyncRoute(handleWorkflowUpdate));

// DELETE /workflows/:workflowId
workflowsRouter.delete("/:workflowId", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const { workflowId } = req.params;
  const systemWorkflow = SYSTEM_WORKFLOWS.find(
    (workflow) => workflow.id === workflowId,
  );
  if (systemWorkflow) {
    return void res.json(withSystemWorkflowAccess(systemWorkflow));
  }

  const db = createServerSupabase();
  const { error } = await db
    .from("workflows")
    .delete()
    .eq("id", workflowId)
    .eq("user_id", userId);
  if (error) return void res.status(500).json({ detail: error.message });
  res.status(204).send();
}));

// GET /workflows/hidden
workflowsRouter.get("/hidden", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const db = createServerSupabase();
  const { data, error } = await db
    .from("hidden_workflows")
    .select("workflow_id")
    .eq("user_id", userId);
  if (error) return void res.status(500).json({ detail: error.message });
  res.json((data ?? []).map((r) => r.workflow_id));
}));

// POST /workflows/hidden
workflowsRouter.post("/hidden", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const { workflow_id } = req.body as { workflow_id: string };
  if (!workflow_id?.trim())
    return void res.status(400).json({ detail: "workflow_id is required" });
  const db = createServerSupabase();
  const { error } = await db
    .from("hidden_workflows")
    .upsert({ user_id: userId, workflow_id }, { onConflict: "user_id,workflow_id" });
  if (error) return void res.status(500).json({ detail: error.message });
  res.status(204).send();
}));

// DELETE /workflows/hidden/:workflowId
workflowsRouter.delete("/hidden/:workflowId", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const { workflowId } = req.params;
  const db = createServerSupabase();
  const { error } = await db
    .from("hidden_workflows")
    .delete()
    .eq("user_id", userId)
    .eq("workflow_id", workflowId);
  if (error) return void res.status(500).json({ detail: error.message });
  res.status(204).send();
}));

// POST /workflows/:workflowId/open-source
workflowsRouter.post("/:workflowId/open-source", requireAuth, asyncRoute(async (req, res) => {
  if (!WORKFLOW_CONTRIBUTIONS_ENABLED) {
    return void res.status(404).json({ detail: "Workflow contributions are disabled" });
  }

  const userId = res.locals.userId as string;
  const userEmail = res.locals.userEmail as string | undefined;
  const { workflowId } = req.params;
  const openSourceBody = req.body as {
    contributor_mode?: unknown;
    contributor?: unknown;
  };
  const requestedContributorMode =
    openSourceBody.contributor_mode === "named"
      ? "named"
      : "anonymous";
  const db = createServerSupabase();

  const { data: workflow, error: workflowError } = await db
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("user_id", userId)
    .maybeSingle();
  if (workflowError) {
    return void res.status(500).json({ detail: workflowError.message });
  }
  if (!workflow) {
    return void res
      .status(404)
      .json({ detail: "Workflow not found or not open-sourceable" });
  }

  const workflowRecord = workflow as WorkflowRecord;
  const validationError = validateOpenSourceWorkflow(workflowRecord);
  if (validationError) {
    return void res.status(400).json({ detail: validationError });
  }

  const { data: profile } = await db
    .from("user_profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle();
  const submitterName =
    typeof profile?.display_name === "string" && profile.display_name.trim()
      ? profile.display_name.trim()
      : null;
  const submittedContributor =
    normalizeContributors([openSourceBody.contributor])?.[0] ??
    contributorFromName(submitterName || userEmail);
  const publicContributors =
    requestedContributorMode === "named"
      ? [submittedContributor]
      : [DEFAULT_WORKFLOW_CONTRIBUTOR];
  const now = new Date().toISOString();
  const snapshot = buildOpenSourceSnapshot(
    workflowRecord,
    publicContributors,
    requestedContributorMode,
  );

  const { data: pendingSubmission, error: pendingError } = await db
    .from("workflow_open_source_submissions")
    .select("*")
    .eq("workflow_id", workflowId)
    .eq("submitted_by_user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (pendingError) {
    return void res.status(500).json({ detail: pendingError.message });
  }

  if (pendingSubmission) {
    const { data: updated, error: updateError } = await db
      .from("workflow_open_source_submissions")
      .update({
        submitter_email: userEmail ?? null,
        submitter_name:
          requestedContributorMode === "named" ? submitterName : null,
        contributor_mode: requestedContributorMode,
        snapshot,
        updated_at: now,
      })
      .eq("id", pendingSubmission.id)
      .select("id, status, submitted_at, updated_at, reviewed_at")
      .single();
    if (updateError || !updated) {
      return void res.status(500).json({
        detail: updateError?.message ?? "Failed to update submission",
      });
    }
    return void res.json({
      ...toOpenSourceSubmissionSummary(updated as OpenSourceSubmissionRow),
      mode: "updated",
    });
  }

  const { data: created, error: createError } = await db
    .from("workflow_open_source_submissions")
    .insert({
      workflow_id: workflowId,
      submitted_by_user_id: userId,
      submitter_email: userEmail ?? null,
      submitter_name:
        requestedContributorMode === "named" ? submitterName : null,
      contributor_mode: requestedContributorMode,
      status: "pending",
      snapshot,
      submitted_at: now,
      updated_at: now,
    })
    .select("id, status, submitted_at, updated_at, reviewed_at")
    .single();
  if (createError || !created) {
    return void res.status(500).json({
      detail: createError?.message ?? "Failed to create submission",
    });
  }

  res.status(201).json({
    ...toOpenSourceSubmissionSummary(created as OpenSourceSubmissionRow),
    mode: "created",
  });
}));

// GET /workflows/:workflowId
workflowsRouter.get("/:workflowId", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const userEmail = res.locals.userEmail as string | undefined;
  const { workflowId } = req.params;
  const systemWorkflow = SYSTEM_WORKFLOWS.find(
    (workflow) => workflow.id === workflowId,
  );
  if (systemWorkflow) {
    return void res.json(withSystemWorkflowAccess(systemWorkflow));
  }

  const db = createServerSupabase();
  const access = await resolveWorkflowAccess(workflowId, userId, userEmail, db);
  if (!access)
    return void res.status(404).json({ detail: "Workflow not found" });
  const openSourceSubmission = access.isOwner
    ? await getLatestOpenSourceSubmission(db, workflowId, userId)
    : null;
  res.json(
    withOpenSourceSubmission(
      withWorkflowAccess(withDatabaseWorkflow(access.workflow), {
        allowEdit: access.allowEdit,
        isOwner: access.isOwner,
      }),
      openSourceSubmission,
    ),
  );
}));

// GET /workflows/:workflowId/shares
workflowsRouter.get("/:workflowId/shares", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const { workflowId } = req.params;
  const db = createServerSupabase();

  const { data: wf } = await db
    .from("workflows")
    .select("id")
    .eq("id", workflowId)
    .eq("user_id", userId)
    .single();
  if (!wf) return void res.status(404).json({ detail: "Workflow not found or not editable" });

  const { data: shares, error } = await db
    .from("workflow_shares")
    .select("id, shared_with_email, allow_edit, created_at")
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: true });
  if (error) return void res.status(500).json({ detail: error.message });

  res.json(shares ?? []);
}));

// DELETE /workflows/:workflowId/shares/:shareId
workflowsRouter.delete("/:workflowId/shares/:shareId", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const { workflowId, shareId } = req.params;
  const db = createServerSupabase();

  const { data: wf } = await db
    .from("workflows")
    .select("id")
    .eq("id", workflowId)
    .eq("user_id", userId)
    .single();
  if (!wf) return void res.status(404).json({ detail: "Workflow not found" });

  await db.from("workflow_shares").delete().eq("id", shareId).eq("workflow_id", workflowId);
  res.status(204).send();
}));

// POST /workflows/:workflowId/share
workflowsRouter.post("/:workflowId/share", requireAuth, asyncRoute(async (req, res) => {
  const userId = res.locals.userId as string;
  const userEmail = res.locals.userEmail as string | undefined;
  const { workflowId } = req.params;
  const { emails, allow_edit } = req.body as { emails: string[]; allow_edit: boolean };

  if (!emails?.length) return void res.status(400).json({ detail: "emails is required" });
  const normalizedEmails = [
    ...new Set(
      emails
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  if (normalizedEmails.length === 0) {
    return void res.status(400).json({ detail: "emails is required" });
  }
  const normalizedUserEmail = userEmail?.trim().toLowerCase();
  if (normalizedUserEmail && normalizedEmails.includes(normalizedUserEmail)) {
    return void res
      .status(400)
      .json({ detail: "You cannot share a workflow with yourself." });
  }

  const db = createServerSupabase();
  const missingSharedUsers = await findMissingUserEmails(db, normalizedEmails);
  if (missingSharedUsers.length > 0) {
    return void res.status(400).json({
      detail: `${missingSharedUsers[0]} does not belong to a Rose user.`,
    });
  }

  // Verify ownership
  const { data: wf } = await db
    .from("workflows")
    .select("id")
    .eq("id", workflowId)
    .eq("user_id", userId)
    .single();
  if (!wf) return void res.status(404).json({ detail: "Workflow not found or not editable" });

  const rows = normalizedEmails.map((email: string) => ({
    workflow_id: workflowId,
    shared_by_user_id: userId,
    shared_with_email: email,
    allow_edit: allow_edit ?? false,
  }));
  // Upsert on (workflow_id, shared_with_email) so re-sharing to the same
  // person updates the existing row instead of stacking duplicates.
  const { error } = await db
    .from("workflow_shares")
    .upsert(rows, { onConflict: "workflow_id,shared_with_email" });
  if (error) return void res.status(500).json({ detail: error.message });

  res.status(204).send();
}));

// ---------------------------------------------------------------------------
// Blueprint / duplicate / conversational editing / pre-flight
//
//   GET  /workflows/:id/blueprint          — cached structured process spec
//   POST /workflows/:id/blueprint          — (re)generate it
//   POST /workflows/:id/duplicate          — user-owned editable copy
//   POST /workflows/:id/edit-chat          — LLM-proposed revision
//   POST /workflows/:id/preflight          — silent-failure gate for a run
// ---------------------------------------------------------------------------

/** Resolve a workflow for reading, covering both system and DB workflows. */
async function resolveWorkflowSource(
  workflowId: string,
  userId: string,
  userEmail: string | undefined,
  db: Db,
): Promise<{
  source: import("../lib/workflows/blueprint").WorkflowSource;
  ownerId: string | null;
  allowEdit: boolean;
} | null> {
  const systemWorkflow = SYSTEM_WORKFLOWS.find((w) => w.id === workflowId);
  if (systemWorkflow) {
    return {
      source: {
        id: systemWorkflow.id,
        title: systemWorkflow.metadata.title,
        type: systemWorkflow.metadata.type,
        prompt_md: systemWorkflow.skill_md,
        columns_config: systemWorkflow.columns_config,
      },
      ownerId: null,
      allowEdit: false,
    };
  }
  const access = await resolveWorkflowAccess(workflowId, userId, userEmail, db);
  if (!access) return null;
  const w = access.workflow;
  return {
    source: {
      id: w.id,
      title: w.title ?? "Untitled workflow",
      type: workflowTypeFrom(w.type),
      prompt_md: (w.prompt_md as string | null) ?? null,
      columns_config: w.columns_config ?? null,
    },
    ownerId: w.user_id ?? null,
    allowEdit: access.allowEdit,
  };
}

async function blueprintModel(userId: string, db: Db) {
  const { getUserApiKeys } = await import("../lib/userApiKeys");
  const { resolveModel, DEFAULT_MAIN_MODEL } = await import("../lib/llm");
  return {
    model: resolveModel(null, DEFAULT_MAIN_MODEL),
    apiKeys: await getUserApiKeys(userId, db),
  };
}

// GET /workflows/:workflowId/blueprint
workflowsRouter.get(
  "/:workflowId/blueprint",
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = res.locals.userId as string;
    const userEmail = res.locals.userEmail as string | undefined;
    const db = createServerSupabase();
    const resolved = await resolveWorkflowSource(
      req.params.workflowId,
      userId,
      userEmail,
      db,
    );
    if (!resolved)
      return void res.status(404).json({ detail: "Workflow not found" });

    const { getOrCreateBlueprint } = await import("../lib/workflows/blueprint");
    const { model, apiKeys } = await blueprintModel(userId, db);
    const { blueprint, cached } = await getOrCreateBlueprint({
      db,
      userId,
      ownerId: resolved.ownerId,
      source: resolved.source,
      model,
      apiKeys,
    });
    res.json({ blueprint, cached });
  }),
);

// POST /workflows/:workflowId/blueprint — force regeneration.
workflowsRouter.post(
  "/:workflowId/blueprint",
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = res.locals.userId as string;
    const userEmail = res.locals.userEmail as string | undefined;
    const db = createServerSupabase();
    const resolved = await resolveWorkflowSource(
      req.params.workflowId,
      userId,
      userEmail,
      db,
    );
    if (!resolved)
      return void res.status(404).json({ detail: "Workflow not found" });

    const { getOrCreateBlueprint } = await import("../lib/workflows/blueprint");
    const { model, apiKeys } = await blueprintModel(userId, db);
    const { blueprint } = await getOrCreateBlueprint({
      db,
      userId,
      ownerId: resolved.ownerId,
      source: resolved.source,
      model,
      apiKeys,
      force: true,
    });
    res.json({ blueprint, cached: false });
  }),
);

// POST /workflows/:workflowId/duplicate { title? }
// Works for system workflows too — that is the point: you cannot edit a
// built-in workflow, so you take your own copy and edit that.
workflowsRouter.post(
  "/:workflowId/duplicate",
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = res.locals.userId as string;
    const userEmail = res.locals.userEmail as string | undefined;
    const db = createServerSupabase();
    const resolved = await resolveWorkflowSource(
      req.params.workflowId,
      userId,
      userEmail,
      db,
    );
    if (!resolved)
      return void res.status(404).json({ detail: "Workflow not found" });

    const systemWorkflow = SYSTEM_WORKFLOWS.find(
      (w) => w.id === req.params.workflowId,
    );
    const original = systemWorkflow
      ? null
      : ((
          await db
            .from("workflows")
            .select("*")
            .eq("id", req.params.workflowId)
            .maybeSingle()
        ).data as WorkflowRecord | null);

    const requestedTitle = normalizeOptionalString(req.body?.title);
    const title = (
      requestedTitle ?? `${resolved.source.title} (copy)`
    ).slice(0, 200);

    const { data, error } = await db
      .from("workflows")
      .insert({
        user_id: userId,
        title,
        type: resolved.source.type,
        prompt_md: resolved.source.prompt_md,
        columns_config: resolved.source.columns_config ?? null,
        language:
          systemWorkflow?.metadata.language ??
          original?.language ??
          DEFAULT_WORKFLOW_LANGUAGE,
        practice:
          systemWorkflow?.metadata.practice ??
          original?.practice ??
          DEFAULT_WORKFLOW_PRACTICE,
        jurisdictions:
          systemWorkflow?.metadata.jurisdictions ??
          original?.jurisdictions ??
          DEFAULT_WORKFLOW_JURISDICTIONS,
      })
      .select("*")
      .single();
    if (error || !data)
      return void res
        .status(500)
        .json({ detail: error?.message ?? "Failed to duplicate workflow" });

    // Carry the blueprint across — the copy has identical instructions, so
    // the cached blueprint is still valid and the copy opens fully described
    // rather than blank while it regenerates.
    try {
      const { readCachedBlueprint, workflowSourceHash, writeCachedBlueprint } =
        await import("../lib/workflows/blueprint");
      const hash = workflowSourceHash(resolved.source);
      const existing = await readCachedBlueprint(
        db,
        resolved.source.id,
        hash,
      );
      if (existing) {
        const copySource = { ...resolved.source, id: data.id, title };
        await writeCachedBlueprint(db, {
          workflowId: data.id as string,
          ownerId: userId,
          blueprint: {
            ...existing,
            source_hash: workflowSourceHash(copySource),
          },
          sourceHash: workflowSourceHash(copySource),
          model: "inherited",
        });
      }
    } catch (err) {
      console.error("[workflows/duplicate] blueprint copy failed", err);
    }

    res.status(201).json(
      withWorkflowAccess(withDatabaseWorkflow(data as WorkflowRecord), {
        allowEdit: true,
        isOwner: true,
      }),
    );
  }),
);

// POST /workflows/:workflowId/edit-chat { messages: [{role, content}] }
// Returns a proposed revision. Nothing is saved until the caller PATCHes.
workflowsRouter.post(
  "/:workflowId/edit-chat",
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = res.locals.userId as string;
    const userEmail = res.locals.userEmail as string | undefined;
    const db = createServerSupabase();
    const resolved = await resolveWorkflowSource(
      req.params.workflowId,
      userId,
      userEmail,
      db,
    );
    if (!resolved)
      return void res.status(404).json({ detail: "Workflow not found" });
    if (!resolved.allowEdit)
      return void res.status(403).json({
        detail:
          "This workflow is read-only. Duplicate it first, then edit your copy.",
      });

    const messages = (Array.isArray(req.body?.messages) ? req.body.messages : [])
      .map((m: unknown) => {
        if (!m || typeof m !== "object") return null;
        const r = m as Record<string, unknown>;
        const content = typeof r.content === "string" ? r.content.trim() : "";
        if (!content) return null;
        return {
          role: r.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content,
        };
      })
      .filter(
        (m: unknown): m is { role: "user" | "assistant"; content: string } => !!m,
      );
    if (messages.length === 0)
      return void res.status(400).json({ detail: "messages is required" });

    const { readCachedBlueprint, workflowSourceHash } = await import(
      "../lib/workflows/blueprint"
    );
    const { proposeWorkflowEdit } = await import("../lib/workflows/editChat");
    const { model, apiKeys } = await blueprintModel(userId, db);
    const blueprint = await readCachedBlueprint(
      db,
      resolved.source.id,
      workflowSourceHash(resolved.source),
    );
    const columns = Array.isArray(resolved.source.columns_config)
      ? (resolved.source.columns_config as {
          index: number;
          name: string;
          prompt: string;
          format?: string;
          type?: string;
        }[])
      : [];

    const proposal = await proposeWorkflowEdit({
      db,
      userId,
      title: resolved.source.title,
      type: resolved.source.type,
      promptMd: resolved.source.prompt_md,
      columns,
      blueprint,
      messages,
      model,
      apiKeys,
    });
    res.json(proposal);
  }),
);

// POST /workflows/:workflowId/preflight { document_ids?, request?, project_id? }
workflowsRouter.post(
  "/:workflowId/preflight",
  requireAuth,
  asyncRoute(async (req, res) => {
    const userId = res.locals.userId as string;
    const userEmail = res.locals.userEmail as string | undefined;
    const db = createServerSupabase();
    const resolved = await resolveWorkflowSource(
      req.params.workflowId,
      userId,
      userEmail,
      db,
    );
    if (!resolved)
      return void res.status(404).json({ detail: "Workflow not found" });

    const { getOrCreateBlueprint } = await import("../lib/workflows/blueprint");
    const { runPreflight } = await import("../lib/workflows/preflight");
    const { filterAccessibleDocumentIds } = await import("../lib/access");
    const { model, apiKeys } = await blueprintModel(userId, db);

    const { blueprint } = await getOrCreateBlueprint({
      db,
      userId,
      ownerId: resolved.ownerId,
      source: resolved.source,
      model,
      apiKeys,
    });
    const documentIds = await filterAccessibleDocumentIds(
      (Array.isArray(req.body?.document_ids) ? req.body.document_ids : []).filter(
        (v: unknown): v is string => typeof v === "string",
      ),
      userId,
      userEmail,
      db,
    );
    const preflight = await runPreflight({
      db,
      userId,
      blueprint,
      documentIds,
      request:
        typeof req.body?.request === "string"
          ? req.body.request
          : `Run the workflow "${resolved.source.title}".`,
      model,
      apiKeys,
    });
    res.json({ preflight, blueprint });
  }),
);

workflowsRouter.use(
  (err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    console.error("[workflows] unhandled route error", err);
    res.status(500).json({ detail: "Failed to process workflow request" });
  },
);

// ---------------------------------------------------------------------------
// C014 — Workflows orchestration layer.
// POST /workflows/:workflowId/compile { instructions? } — NL → plan template
// POST /workflows/:workflowId/run { request?, document_ids? } — run as agent
// ---------------------------------------------------------------------------
workflowsRouter.post("/:workflowId/compile", requireAuth, asyncRoute(
  async (req, res) => {
    const userId = res.locals.userId as string;
    const db = createServerSupabase();
    // NOTE: the column is `prompt_md`; `skill_md` is the API-facing alias.
    const { data: workflow } = await db
      .from("workflows")
      .select("id, title, prompt_md")
      .eq("id", req.params.workflowId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!workflow)
      return void res.status(404).json({ detail: "Workflow not found" });

    const instructions =
      typeof req.body?.instructions === "string" && req.body.instructions.trim()
        ? req.body.instructions.trim()
        : `Workflow "${workflow.title}":\n${workflow.prompt_md ?? ""}`;
    const { planRun } = await import("../lib/agents/planner");
    const { getUserApiKeys } = await import("../lib/userApiKeys");
    const { resolveModel, DEFAULT_MAIN_MODEL } = await import("../lib/llm");
    const apiKeys = await getUserApiKeys(userId, db);
    const plan = await planRun({
      request: instructions,
      model: resolveModel(null, DEFAULT_MAIN_MODEL),
      apiKeys,
    });
    const { error } = await db
      .from("workflows")
      .update({ plan_template: plan })
      .eq("id", workflow.id);
    if (error) return void res.status(500).json({ detail: error.message });
    res.json({ plan });
  },
));

// POST /workflows/:workflowId/run
//   { request?, document_ids?, project_id?, preflight?, force? }
//
// The run is created from the workflow's BLUEPRINT — the same steps,
// objectives and acceptance criteria the user reviewed on the workflow page —
// so what runs is what was shown. Before anything executes we re-assess the
// silent-failure risk against the documents actually attached; if that comes
// back high the run is parked at the gate (status 'paused') and the caller
// must confirm with force=true, or stop and edit the workflow.
workflowsRouter.post("/:workflowId/run", requireAuth, asyncRoute(
  async (req, res) => {
    const userId = res.locals.userId as string;
    const userEmail = res.locals.userEmail as string | undefined;
    const db = createServerSupabase();
    const resolved = await resolveWorkflowSource(
      req.params.workflowId,
      userId,
      userEmail,
      db,
    );
    if (!resolved)
      return void res.status(404).json({ detail: "Workflow not found" });

    const { getOrCreateBlueprint, blueprintToPlan } = await import(
      "../lib/workflows/blueprint"
    );
    const { runPreflight } = await import("../lib/workflows/preflight");
    const { filterAccessibleDocumentIds, checkProjectAccess } = await import(
      "../lib/access"
    );
    const { getJadeAccessApproved } = await import("../lib/appSettings");
    const { model, apiKeys } = await blueprintModel(userId, db);

    const projectId =
      typeof req.body?.project_id === "string" ? req.body.project_id : null;
    if (projectId) {
      const { can } = await import("../lib/rbac");
      const access = await checkProjectAccess(projectId, userId, userEmail, db);
      if (!access.ok || !can(access.role, "run"))
        return void res
          .status(403)
          .json({ detail: "No run access to that project" });
    }

    const request =
      typeof req.body?.request === "string" && req.body.request.trim()
        ? req.body.request.trim()
        : `Run the workflow "${resolved.source.title}".`;
    const documentIds = await filterAccessibleDocumentIds(
      (Array.isArray(req.body?.document_ids) ? req.body.document_ids : []).filter(
        (v: unknown): v is string => typeof v === "string",
      ),
      userId,
      userEmail,
      db,
    );

    const { blueprint } = await getOrCreateBlueprint({
      db,
      userId,
      ownerId: resolved.ownerId,
      source: resolved.source,
      model,
      apiKeys,
    });

    // Re-assess against the documents actually attached, unless the caller
    // already ran the gate and is passing its result back.
    const supplied =
      req.body?.preflight && typeof req.body.preflight === "object"
        ? (req.body.preflight as Record<string, unknown>)
        : null;
    const preflight =
      supplied && supplied.version === 1
        ? (supplied as unknown as import("../lib/workflows/preflight").PreflightAssessment)
        : await runPreflight({
            db,
            userId,
            blueprint,
            documentIds,
            request,
            model,
            apiKeys,
          });

    const forced = req.body?.force === true;
    const blocked = preflight.requires_confirmation && !forced;

    const plan = blueprintToPlan(
      blueprint,
      resolved.source.title,
      resolved.source.prompt_md,
      await getJadeAccessApproved(),
    );

    const { data: created, error } = await db
      .from("agent_runs")
      .insert({
        owner_id: userId,
        project_id: projectId,
        kind: "workflow",
        // 'paused' = held at the silent-failure gate awaiting the user's
        // decision; 'awaiting_approval' = normal plan approval.
        status: blocked ? "paused" : "awaiting_approval",
        title: resolved.source.title,
        request,
        model: null,
        plan,
        blueprint,
        preflight: {
          ...preflight,
          ...(forced
            ? { decision: "continue", decided_at: new Date().toISOString() }
            : {}),
        },
        document_ids: documentIds,
        workflow_id: resolved.source.id,
      })
      .select("id")
      .single();
    if (error || !created)
      return void res
        .status(500)
        .json({ detail: error?.message ?? "insert failed" });

    await db.from("agent_steps").insert(
      plan.steps.map((s) => ({
        run_id: created.id,
        position: s.position,
        depends_on: s.depends_on,
        role: s.role,
        instruction: s.instruction,
        tool_allowlist: s.tool_allowlist,
      })),
    );

    res.status(201).json({
      run_id: created.id,
      plan,
      blueprint,
      preflight,
      // The caller must resolve the gate before the plan can be approved.
      gated: blocked,
    });
  },
));
