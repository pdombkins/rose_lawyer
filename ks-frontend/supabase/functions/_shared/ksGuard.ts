/**
 * Shared guard for the Kendry & Slate batch edge functions.
 *
 * All four of these (gantt import, rebaseline, term reset, hours prefill) were
 * previously deployed with `verify_jwt: false` and the service-role key —
 * unauthenticated endpoints with unrestricted database access. Anyone who knew
 * a URL could reset the term. They are all instructor operations, so the fix
 * is the same in each: require a real JWT and confirm the caller is an admin
 * before doing anything.
 *
 * Two clients are returned deliberately:
 *   · `admin`  — service-role, used for the batch work itself. These jobs
 *                legitimately need to write across every matter.
 *   · `caller` — the user's own JWT, used ONLY to resolve their identity.
 *
 * Never do the batch work with `caller`, and never skip `requireAdmin`.
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Service-role client scoped to the `ks` schema. */
export function ksAdminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { db: { schema: "ks" }, auth: { persistSession: false } },
  );
}

export type GuardResult =
  | { ok: true; userId: string; admin: SupabaseClient }
  | { ok: false; response: Response };

/**
 * Verifies the bearer token and that the caller is a Rose admin
 * (public.user_profiles.is_admin).
 */
export async function requireAdmin(req: Request): Promise<GuardResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { ok: false, response: json({ error: "Authentication required." }, 401) };
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  // Resolve the caller from their own token.
  const caller = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userErr } = await caller.auth.getUser();
  if (userErr || !userData?.user) {
    return { ok: false, response: json({ error: "Invalid or expired session." }, 401) };
  }

  const admin = ksAdminClient();

  // is_admin lives in Rose's `public` schema; this client defaults to `ks`.
  const { data: profile } = await admin
    .schema("public")
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return {
      ok: false,
      response: json({ error: "This operation is restricted to instructors." }, 403),
    };
  }

  return { ok: true, userId: userData.user.id, admin };
}

/**
 * Recompute derived totals after a batch.
 *
 * The old functions each called
 *   supabase.rpc('set_config', { 'app.suppress_task_adjustment', '1' })
 * and then wrote `actual_hours` / `status` / matter fees themselves, relying on
 * the 27-trigger cascade to reconcile. That cascade no longer exists: the `ks`
 * schema uses statement-level triggers plus `ks.recompute()`, which manages
 * its own suppression GUC internally.
 *
 * So those set_config calls must be REMOVED (not renamed — they would suppress
 * nothing), and each batch should finish with one call to this instead.
 */
export async function ksRecompute(
  admin: SupabaseClient,
  taskIds: string[] | null,
  matterIds: string[] | null,
): Promise<void> {
  const { error } = await admin.schema("ks").rpc("recompute", {
    task_ids: taskIds && taskIds.length ? taskIds : null,
    matter_ids: matterIds && matterIds.length ? matterIds : null,
  });
  if (error) console.error("ks.recompute failed:", error.message);
}
