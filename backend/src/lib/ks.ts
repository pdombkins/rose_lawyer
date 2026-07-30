/**
 * Kendry & Slate data access for the Rose backend.
 *
 * Since the merge, K&S lives in the `ks` schema of Rose's Supabase project.
 * The backend connects with the service-role key, which BYPASSES RLS — so
 * every function here must enforce the student's scope itself. That scope is
 * defined once, in `accessibleMatterIds()`, and mirrors the RLS policy the
 * browser gets (migration 20260730_02):
 *
 *   admin            → every matter
 *   everyone else     → matters they are a member of, which provisioning sets
 *                       to their group's matter plus the shared NexaCare one
 *
 * If you add a function that returns matter data, filter it through
 * `accessibleMatterIds()` or `assertMatterAccess()`. Skipping that turns the
 * assistant into a way to read another group's assessment data.
 */

import { createServerSupabase } from "./supabase";

const KS = () => createServerSupabase().schema("ks");

export type KsAccess = {
  isAdmin: boolean;
  matterIds: string[];
};

/** Matters this user may see. Empty array means "no access to anything". */
export async function accessibleMatterIds(userId: string): Promise<KsAccess> {
  const db = createServerSupabase();

  const { data: profile } = await db
    .from("user_profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .maybeSingle();

  const isAdmin = Boolean((profile as { is_admin?: boolean } | null)?.is_admin);

  if (isAdmin) {
    const { data } = await KS().from("matters").select("id");
    return { isAdmin, matterIds: (data ?? []).map((r) => r.id as string) };
  }

  const { data } = await KS()
    .from("matter_members")
    .select("matter_id")
    .eq("user_id", userId);

  return { isAdmin, matterIds: (data ?? []).map((r) => r.matter_id as string) };
}

/** Throws a caller-safe error unless the user may access this matter. */
export async function assertMatterAccess(
  userId: string,
  matterId: string,
): Promise<KsAccess> {
  const access = await accessibleMatterIds(userId);
  if (!access.matterIds.includes(matterId)) {
    throw new Error(
      "You don't have access to that matter. Use ks_list_matters to see the matters available to you.",
    );
  }
  return access;
}

// ── reads ────────────────────────────────────────────────────────────────

export async function ksListMatters(userId: string, search?: string) {
  const { matterIds } = await accessibleMatterIds(userId);
  if (matterIds.length === 0) return [];

  let q = KS()
    .from("matters")
    .select(
      "id, title, status, matter_type, fee_type, hourly_rate, fixed_fee, total_fees, start_date, end_date, clients(name), profiles!matters_lead_partner_id_fkey(full_name)",
    )
    .in("id", matterIds)
    .order("title");

  if (search) q = q.ilike("title", `%${search}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return (data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id,
    title: m.title,
    status: m.status,
    matter_type: m.matter_type,
    client: (m.clients as { name?: string } | null)?.name ?? null,
    lead_partner: (m.profiles as { full_name?: string } | null)?.full_name ?? null,
    fee_type: m.fee_type,
    hourly_rate: m.hourly_rate,
    fixed_fee: m.fixed_fee,
    fees_recorded_to_date: m.total_fees,
    start_date: m.start_date,
    end_date: m.end_date,
  }));
}

export async function ksGetMatter(userId: string, matterId: string) {
  await assertMatterAccess(userId, matterId);

  const { data: matter, error } = await KS()
    .from("matters")
    .select(
      "id, title, description, status, matter_type, fee_type, hourly_rate, fixed_fee, total_fees, start_date, end_date, clients(name, email, phone), profiles!matters_lead_partner_id_fkey(full_name, role, hourly_rate)",
    )
    .eq("id", matterId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!matter) throw new Error("Matter not found.");

  const { data: tasks } = await KS()
    .from("tasks")
    .select("status, phase, estimated_total_hours, actual_hours")
    .eq("matter_id", matterId);

  const rows = tasks ?? [];
  const byStatus: Record<string, number> = {};
  const byPhase: Record<string, number> = {};
  let est = 0;
  let act = 0;
  for (const t of rows) {
    const s = (t.status as string) ?? "unknown";
    const p = (t.phase as string) ?? "unassigned";
    byStatus[s] = (byStatus[s] ?? 0) + 1;
    byPhase[p] = (byPhase[p] ?? 0) + 1;
    est += Number(t.estimated_total_hours ?? 0);
    act += Number(t.actual_hours ?? 0);
  }

  const m = matter as Record<string, unknown>;
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    status: m.status,
    matter_type: m.matter_type,
    client: m.clients,
    lead_partner: m.profiles,
    fee_type: m.fee_type,
    hourly_rate: m.hourly_rate,
    fixed_fee: m.fixed_fee,
    fees_recorded_to_date: m.total_fees,
    start_date: m.start_date,
    end_date: m.end_date,
    task_count: rows.length,
    tasks_by_status: byStatus,
    tasks_by_phase: byPhase,
    estimated_hours_total: Number(est.toFixed(2)),
    actual_hours_total: Number(act.toFixed(2)),
    hours_variance: Number((act - est).toFixed(2)),
  };
}

export async function ksListTasks(
  userId: string,
  args: {
    matter_id: string;
    phase?: string;
    workstream?: string;
    status?: string;
    assignee_name?: string;
    overdue_only?: boolean;
  },
) {
  await assertMatterAccess(userId, args.matter_id);

  let q = KS()
    .from("tasks")
    .select(
      "id, title, status, priority, phase, workstream, commencement_date, due_date, completed_at, estimated_total_hours, actual_hours, order_position, profiles!tasks_assigned_to_fkey(full_name, role)",
    )
    .eq("matter_id", args.matter_id)
    .order("order_position");

  if (args.phase) q = q.eq("phase", args.phase);
  if (args.workstream) q = q.eq("workstream", args.workstream);
  if (args.status) q = q.eq("status", args.status);
  if (args.overdue_only) {
    q = q.lt("due_date", new Date().toISOString()).neq("status", "completed");
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows = (data ?? []).map((t: Record<string, unknown>) => {
    const est = Number(t.estimated_total_hours ?? 0);
    const act = Number(t.actual_hours ?? 0);
    return {
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      phase: t.phase,
      workstream: t.workstream,
      assignee: (t.profiles as { full_name?: string } | null)?.full_name ?? null,
      assignee_role: (t.profiles as { role?: string } | null)?.role ?? null,
      commencement_date: t.commencement_date,
      due_date: t.due_date,
      completed_at: t.completed_at,
      estimated_total_hours: est,
      actual_hours: act,
      hours_variance: Number((act - est).toFixed(2)),
    };
  });

  if (args.assignee_name) {
    const needle = args.assignee_name.toLowerCase();
    rows = rows.filter((r) => (r.assignee ?? "").toLowerCase().includes(needle));
  }

  return rows;
}

export async function ksTimeLedger(
  userId: string,
  args: {
    matter_id: string;
    from_date?: string;
    to_date?: string;
    source?: string;
    limit?: number;
  },
) {
  await assertMatterAccess(userId, args.matter_id);

  const limit = Math.min(Math.max(args.limit ?? 200, 1), 1000);

  let q = KS()
    .from("matter_time_ledger")
    .select(
      "entry_id, date, task_title, phase, lawyer_name, operator_name, hours, hourly_rate, cost, description, source",
    )
    .eq("matter_id", args.matter_id)
    .order("date", { ascending: false })
    .limit(limit);

  if (args.from_date) q = q.gte("date", args.from_date);
  if (args.to_date) q = q.lte("date", args.to_date);
  if (args.source) q = q.eq("source", args.source);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const totalHours = rows.reduce((s, r) => s + Number(r.hours ?? 0), 0);
  const totalCost = rows.reduce((s, r) => s + Number(r.cost ?? 0), 0);
  const bySource: Record<string, number> = {};
  for (const r of rows) {
    const s = (r.source as string) ?? "unknown";
    bySource[s] = (bySource[s] ?? 0) + 1;
  }

  return {
    entries: rows,
    totals: {
      entry_count: rows.length,
      hours: Number(totalHours.toFixed(2)),
      cost: Number(totalCost.toFixed(2)),
      by_source: bySource,
    },
    truncated: rows.length === limit,
  };
}

export async function ksListStaff() {
  // The fee-earner directory is firm-wide reference data by design — a student
  // needs it to read assignments and rate mixes on their own matter.
  const { data, error } = await KS()
    .from("profiles")
    .select("id, full_name, role, hourly_rate, cost_rate")
    .order("full_name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ── write ────────────────────────────────────────────────────────────────

export async function ksRecordTimeEntry(
  userId: string,
  args: {
    matter_id: string;
    task_id?: string;
    fee_earner_name: string;
    date?: string;
    hours: number;
    description: string;
    billable?: boolean;
  },
) {
  // Membership re-checked here even though the plan was approved: approval
  // covers intent, not authorisation.
  await assertMatterAccess(userId, args.matter_id);

  if (!Number.isFinite(args.hours) || args.hours === 0) {
    throw new Error("hours must be a non-zero number.");
  }
  if (!args.description?.trim()) {
    throw new Error("description is required — an unnarrated entry is not auditable.");
  }

  const { data: staff } = await KS()
    .from("profiles")
    .select("id, full_name")
    .ilike("full_name", `%${args.fee_earner_name.trim()}%`)
    .limit(2);

  const matches = staff ?? [];
  if (matches.length === 0) {
    throw new Error(
      `No fee earner matched "${args.fee_earner_name}". Use ks_list_staff for exact names.`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `"${args.fee_earner_name}" matched more than one fee earner. Be more specific.`,
    );
  }

  // If a task is named, confirm it belongs to this matter — otherwise the
  // entry would silently land on another group's task.
  if (args.task_id) {
    const { data: task } = await KS()
      .from("tasks")
      .select("id, matter_id")
      .eq("id", args.task_id)
      .maybeSingle();
    if (!task || task.matter_id !== args.matter_id) {
      throw new Error("That task does not belong to the specified matter.");
    }
  }

  const { data, error } = await KS()
    .from("time_entries")
    .insert({
      matter_id: args.matter_id,
      task_id: args.task_id ?? null,
      user_id: matches[0].id, // fee earner (persona)
      performed_by: userId, // the real student who approved this
      date: args.date ?? new Date().toISOString().slice(0, 10),
      hours: args.hours,
      description: args.description.trim(),
      billable: args.billable ?? true,
      source: "assistant",
    })
    .select("id, date, hours, hourly_rate, description, source")
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    recorded: data,
    booked_to: matches[0].full_name,
    recorded_by_user_id: userId,
    note: "Entry written to the K&S time ledger. It is attributed to the fee earner above and to your own account (performed_by).",
  };
}
