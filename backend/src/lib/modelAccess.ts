/**
 * Student model access — admin-configured, site-wide restriction on which
 * LLM models a student can use.
 *
 * "Student" here means: a member of any user_group (see groupAccess.ts) who
 * is not an admin. Instructors/admins are never restricted. Group members
 * with no admin-configured restriction (the default) are unrestricted too —
 * this is opt-in.
 *
 * The restriction is a single flat list of model ids stored in app_settings
 * (key STUDENT_ALLOWED_MODELS_KEY). It applies everywhere a model choice
 * reaches an LLM call: chat, project chat and agent runs all funnel through
 * runLLMStream (see chat/streaming.ts), which calls resolveModelForUser
 * instead of the bare resolveModel; per-user model preferences (title/
 * tabular model) are checked in routes/user.ts and lib/userSettings.ts.
 */

import { createServerSupabase } from "./supabase";
import { getAppSetting, setAppSetting } from "./appSettings";
import { listUserGroupIds } from "./groupAccess";
import { resolveModel } from "./llm/models";

type Db = ReturnType<typeof createServerSupabase>;

export const STUDENT_ALLOWED_MODELS_KEY = "student_allowed_models";

/** Site-wide allow-list for student-group members. Null = unrestricted. */
export async function getStudentAllowedModels(
  db?: Db,
): Promise<string[] | null> {
  const value = await getAppSetting<string[] | null>(
    STUDENT_ALLOWED_MODELS_KEY,
    null,
    db,
  );
  return Array.isArray(value) && value.length > 0 ? value : null;
}

/** Pass an empty array (or null) to lift the restriction entirely. */
export async function setStudentAllowedModels(
  modelIds: string[] | null,
  updatedBy: string | undefined,
  db?: Db,
): Promise<void> {
  const normalized =
    modelIds && modelIds.length > 0 ? [...new Set(modelIds)] : null;
  await setAppSetting(STUDENT_ALLOWED_MODELS_KEY, normalized, updatedBy, db);
}

async function isAdminUser(db: Db, userId: string): Promise<boolean> {
  const { data } = await db
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as { is_admin?: boolean } | null)?.is_admin === true;
}

/** Is this user a member of any student group, and not an admin? */
export async function isRestrictedStudent(
  db: Db,
  userId: string,
): Promise<boolean> {
  if (await isAdminUser(db, userId)) return false;
  const groupIds = await listUserGroupIds(userId, null, db);
  return groupIds.length > 0;
}

/**
 * The list of model ids this specific user may use, or null if unrestricted
 * (no admin-configured restriction, this user isn't a student-group member,
 * or they're an admin). Used to build the frontend model picker — null
 * means "show everything."
 */
export async function allowedModelIdsForUser(
  db: Db,
  userId: string,
): Promise<string[] | null> {
  const allowed = await getStudentAllowedModels(db);
  if (!allowed) return null;
  if (!(await isRestrictedStudent(db, userId))) return null;
  return allowed;
}

/**
 * Resolve a client- or profile-supplied model id to one this user is
 * actually allowed to use. First applies the registry whitelist
 * (resolveModel: unknown ids fall back to `fallback`), then — only for a
 * restricted student — clamps to the admin-configured allow-list if the
 * candidate isn't in it.
 */
export async function resolveModelForUser(
  db: Db,
  userId: string,
  requested: string | null | undefined,
  fallback: string,
): Promise<string> {
  const candidate = resolveModel(requested, fallback);
  const allowed = await allowedModelIdsForUser(db, userId);
  if (!allowed) return candidate;
  if (allowed.includes(candidate)) return candidate;
  return allowed.includes(fallback) ? fallback : allowed[0];
}
