import { supabase } from "@/integrations/supabase/client";

/**
 * Calls to the Rose backend (Express on Railway).
 *
 * Two K&S operations need server-side privileges: batch task reordering and
 * the connectivity check. They used to be Supabase edge functions deployed
 * with `verify_jwt: false` and the service-role key — i.e. unauthenticated
 * endpoints that could mutate any matter. They now live behind Rose's
 * `requireAuth` at /ks, so every call carries the student's JWT and is scoped
 * to the matters they are a member of.
 *
 * The long-running batch jobs (Gantt import, rebaseline, term reset, hours
 * prefill) remain Supabase edge functions — they need EdgeRuntime.waitUntil —
 * but were re-deployed with verify_jwt and an admin check.
 */

const API_BASE =
  (import.meta.env.VITE_ROSE_API_BASE as string | undefined) ??
  "https://rose-lawyer-production.up.railway.app";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You are not signed in.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(await authHeaders()), ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { detail: text };
  }
  if (!res.ok) {
    const detail =
      (body as { detail?: string } | null)?.detail ?? `Request failed (${res.status})`;
    throw new Error(detail);
  }
  return body as T;
}

/** Batch-update task order within one matter. Replaces `batch-update-tasks`. */
export function reorderTasks(
  matterId: string,
  positions: { id: string; order_position: number }[],
): Promise<{ ok: true; updated: number }> {
  return request("/ks/tasks/reorder", {
    method: "POST",
    body: JSON.stringify({ matter_id: matterId, positions }),
  });
}

/** Connectivity + scope check. Replaces the `webhook-time-entry` ping. */
export function ksHealth(): Promise<{
  ok: boolean;
  is_admin: boolean;
  accessible_matters: number;
  latency_ms: number;
}> {
  return request("/ks/health");
}
