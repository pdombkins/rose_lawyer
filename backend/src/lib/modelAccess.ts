/**
 * Student model access — admin-configured, site-wide restriction on which
 * LLM models a student can use.
 *
 * "Student" here means: ANY user who is not an admin. It used to mean "a
 * member of a user_group", which quietly exempted anyone added outside a
 * group — a real hole, since a new account is created before it is put in a
 * group, and an account never added to one would have stayed unrestricted
 * forever. Instructors/admins are never restricted. With no admin-configured
 * list (the default) nobody is restricted — the feature is opt-in.
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

/**
 * Everyone who is not an admin is restricted. Deliberately NOT keyed on group
 * membership: a user added outside a group is still a student, and the point
 * of the setting is that it binds every non-admin.
 */
export async function isRestrictedStudent(
  db: Db,
  userId: string,
): Promise<boolean> {
  return !(await isAdminUser(db, userId));
}

/**
 * The list of model ids this specific user may use, or null if unrestricted
 * (no admin-configured restriction, or they're an admin). Used to build the
 * frontend model picker — null means "show everything."
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
