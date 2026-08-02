/**
 * Kendry & Slate WRITES for the Rose backend.
 *
 * Rose's agents, workflows and chat can change a matter — tasks, assignments,
 * time, calendar, documents and matter fields — so a change plan that says
 * "record time contemporaneously" can actually do it rather than describe it.
 *
 * THREE RULES, and the whole safety of this file rests on them.
 *
 * 1. THE BACKEND RUNS AS SERVICE-ROLE, SO RLS DOES NOT APPLY.
 *    Every function here must enforce scope itself. `assertMatterAccess()` in
 *    lib/ks.ts is the membership test and is called on every path. Skipping it
 *    turns the assistant into a way to edit another group's assessment data.
 *
 * 2. THE SHARED TEACHING MATTER IS APPEND-ONLY.
 *    NexaCare is `ks.matters.shared_teaching` and is worked by all six groups —
 *    36 students against the same 49 task rows. Anyone may ADD to it, but only
 *    the person who created a row may change or delete it. That keeps the
 *    Week-9 evidence base (49 tasks, 0 complete, all overdue, 27 recorded
 *    hours) reproducible for every group, while still letting a student act on
 *    the shared matter. `assertRowWritable()` is the single place this is
 *    decided; it fails CLOSED — a row with no `performed_by` is seeded data and
 *    is never editable on a shared matter.
 *
 * 3. `performed_by` IS THE REAL STUDENT, EVERY OTHER ACTOR COLUMN IS A PERSONA.
 *    `performed_by` REFERENCES auth.users. But `tasks.created_by`,
 *    `tasks.assigned_to`, `calendar_events.created_by`, `documents.uploaded_by`,
 *    `time_entries.user_id` and `task_assignments.user_id` all REFERENCE
 *    ks.profiles — the fee-earner personas. Putting an auth user id in any of
 *    them violates the foreign key and the write fails outright.
 *    Every insert stamps `performed_by` with the authenticated user so the
 *    ledger stays attributable, which is the Week-8 ethics hook. Never let a
 *    caller supply it.
 *
 * All of these tools are in WRITE_TOOLS (lib/agents/types.ts), so any agent
 * plan containing one stops at the approval gate before it runs.
 */

import { createServerSupabase } from "./supabase";
import { assertMatterAccess } from "./ks";

const KS = () => createServerSupabase().schema("ks");

/** Tables whose rows carry `performed_by` and belong to a matter. */
type OwnedTable =
    | "tasks"
    | "task_assignments"
    | "time_entries"
    | "calendar_events"
    | "documents";

async function isSharedTeachingMatter(matterId: string): Promise<boolean> {
    const { data } = await KS()
        .from("matters")
        .select("shared_teaching")
        .eq("id", matterId)
        .maybeSingle();
    return Boolean((data as { shared_teaching?: boolean } | null)?.shared_teaching);
}

/**
 * Membership check for any write against a matter. Returns whether the matter
 * is the shared teaching one, which the row-level guard then uses.
 */
export async function assertMatterWritable(userId: string, matterId: string) {
    await assertMatterAccess(userId, matterId);
    return { shared: await isSharedTeachingMatter(matterId) };
}

/**
 * Guard for changing or deleting an EXISTING row.
 *
 * On an ordinary matter the membership check is enough — the group owns its
 * own matter. On the shared teaching matter you may only touch what you
 * created. Fails closed on seeded rows (`performed_by` null).
 */
export async function assertRowWritable(
    userId: string,
    table: OwnedTable,
    rowId: string,
): Promise<{ matterId: string }> {
    const selectCols =
        table === "task_assignments"
            ? "id, performed_by, task_id"
            : "id, performed_by, matter_id";

    const { data: row } = await KS()
        .from(table)
        .select(selectCols)
        .eq("id", rowId)
        .maybeSingle();
    if (!row) throw new Error("That record does not exist.");

    const r = row as { performed_by: string | null; matter_id?: string; task_id?: string };

    // task_assignments hang off a task, not a matter.
    let matterId = r.matter_id ?? null;
    if (!matterId && r.task_id) {
        const { data: task } = await KS()
            .from("tasks")
            .select("matter_id")
            .eq("id", r.task_id)
            .maybeSingle();
        matterId = (task as { matter_id?: string } | null)?.matter_id ?? null;
    }
    if (!matterId) throw new Error("That record is not attached to a matter.");

    const { shared } = await assertMatterWritable(userId, matterId);

    if (shared && r.performed_by !== userId) {
        throw new Error(
            "NexaCare is the shared teaching matter — everyone works the same records, so you can only change rows you created yourself. " +
                "You can still add new tasks, time and events to it, and you have full control on your own group's matter.",
        );
    }

    return { matterId };
}


/**
 * Deep link to the K&S page for a matter, inside Rose's shell.
 *
 * Returned with every write so the model has a real URL to put in its
 * confirmation instead of inventing one or leaving the user to guess whether
 * anything happened. /workspace is the Rose page that frames the K&S app
 * (see frontend (pages)/workspace); /firm is the raw SPA and would drop the
 * user out of the sidebar.
 */
export function ksMatterLink(matterId: string): string {
    return `/workspace/dashboard/matter/${matterId}`;
}

/** Confirm a task belongs to the matter the caller named. */
async function assertTaskInMatter(taskId: string, matterId: string) {
    const { data } = await KS()
        .from("tasks")
        .select("id, matter_id")
        .eq("id", taskId)
        .maybeSingle();
    if (!data || (data as { matter_id: string }).matter_id !== matterId) {
        throw new Error("That task does not belong to the specified matter.");
    }
}

/** Resolve exactly one fee earner by name, or explain why not. */
async function resolveFeeEarner(name: string): Promise<{ id: string; full_name: string }> {
    const { data } = await KS()
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", `%${name.trim()}%`)
        .limit(2);
    const matches = (data ?? []) as { id: string; full_name: string }[];
    if (matches.length === 0) {
        throw new Error(`No fee earner matched "${name}". Use ks_list_staff for exact names.`);
    }
    if (matches.length > 1) {
        throw new Error(`"${name}" matched more than one fee earner. Be more specific.`);
    }
    return matches[0];
}

const TASK_STATUSES = new Set(["not_started", "in_progress", "completed", "blocked", "on_hold"]);

/**
 * Refuse a create that would duplicate a task already on the matter.
 *
 * WHY THIS IS A HARD GUARD AND NOT A PROMPT.
 * A user created "Doument review" and then said "set the due date for this
 * task". The model called ks_create_task a second time instead of
 * ks_update_task, and the matter ended up with two identical tasks — the
 * assistant reporting success both times. Nothing in the data distinguished
 * the second write from a legitimate one, so nothing caught it.
 *
 * The tool description already asked the model to check first. It didn't.
 * Instructions are advisory; this is not. The error deliberately carries the
 * existing task's id so the model's next move is obvious and correct: update
 * that task. `allow_duplicate` remains for the genuine case where a matter
 * really does need two tasks of the same name.
 *
 * Scoped to the matter, so two groups may each have their own "Document
 * review" — only a repeat within one matter is refused.
 */
async function assertNoDuplicateTask(
    matterId: string,
    title: string,
    allowDuplicate?: boolean,
) {
    if (allowDuplicate) return;

    const { data } = await KS()
        .from("tasks")
        .select("id, title, status, due_date")
        .eq("matter_id", matterId)
        .ilike("title", title.trim())
        .limit(1);

    const existing = (data ?? [])[0] as
        | { id: string; title: string; status: string; due_date: string | null }
        | undefined;
    if (!existing) return;

    throw new Error(
        `A task called "${existing.title}" already exists on this matter (id ${existing.id}, ` +
            `status ${existing.status}, due ${existing.due_date ?? "not set"}). ` +
            `To change it — including setting or moving a due date — use ks_update_task with that id. ` +
            `Only pass allow_duplicate: true if the matter genuinely needs a second, separate task with the same name.`,
    );
}

// ── tasks ────────────────────────────────────────────────────────────────

export async function ksCreateTask(
    userId: string,
    args: {
        matter_id: string;
        title: string;
        description?: string;
        status?: string;
        priority?: string;
        workstream?: string;
        phase?: string;
        commencement_date?: string;
        due_date?: string;
        estimated_total_hours?: number;
        assigned_to_name?: string;
        allow_duplicate?: boolean;
    },
) {
    await assertMatterWritable(userId, args.matter_id);
    if (!args.title?.trim()) throw new Error("title is required.");
    if (args.status && !TASK_STATUSES.has(args.status)) {
        throw new Error(`status must be one of: ${[...TASK_STATUSES].join(", ")}`);
    }
    await assertNoDuplicateTask(args.matter_id, args.title, args.allow_duplicate);

    const assignee = args.assigned_to_name
        ? await resolveFeeEarner(args.assigned_to_name)
        : null;

    const { data, error } = await KS()
        .from("tasks")
        .insert({
            matter_id: args.matter_id,
            title: args.title.trim(),
            description: args.description ?? null,
            status: args.status ?? "not_started",
            priority: args.priority ?? "medium",
            workstream: args.workstream ?? null,
            phase: args.phase ?? null,
            commencement_date: args.commencement_date ?? null,
            due_date: args.due_date ?? null,
            estimated_total_hours: args.estimated_total_hours ?? 0,
            assigned_to: assignee?.id ?? null,
            // created_by REFERENCES ks.profiles(id) — the persona, not the
            // student. Passing the auth user id here violates the FK, so it is
            // the assignee persona when one was named and null otherwise.
            // Attribution to the real person is `performed_by` (auth.users).
            created_by: assignee?.id ?? null,
            performed_by: userId,
        })
        .select("id, title, status, due_date")
        .single();
    if (error) throw new Error(error.message);
    return {
        ...data,
        assigned_to: assignee?.full_name ?? null,
        link: ksMatterLink(args.matter_id),
        // The id is stated in the confirmation, not just carried in the row,
        // so a follow-up like "set the due date for this task" has something
        // concrete to bind to and calls ks_update_task rather than creating
        // the task a second time.
        confirmation: `Created task "${data.title}" (id ${data.id})${
            assignee ? ` assigned to ${assignee.full_name}` : ""
        }${args.due_date ? `, due ${args.due_date}` : ""}. To change this task later, use ks_update_task with id ${data.id}.`,
    };
}

export async function ksUpdateTask(
    userId: string,
    args: {
        task_id: string;
        title?: string;
        description?: string;
        status?: string;
        priority?: string;
        workstream?: string;
        phase?: string;
        commencement_date?: string;
        due_date?: string;
        estimated_total_hours?: number;
        assigned_to_name?: string;
    },
) {
    await assertRowWritable(userId, "tasks", args.task_id);
    if (args.status && !TASK_STATUSES.has(args.status)) {
        throw new Error(`status must be one of: ${[...TASK_STATUSES].join(", ")}`);
    }

    const patch: Record<string, unknown> = {};
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.status !== undefined) {
        patch.status = args.status;
        // Keep completed_at honest rather than leaving a stale timestamp.
        patch.completed_at = args.status === "completed" ? new Date().toISOString() : null;
    }
    if (args.priority !== undefined) patch.priority = args.priority;
    if (args.workstream !== undefined) patch.workstream = args.workstream;
    if (args.phase !== undefined) patch.phase = args.phase;
    if (args.commencement_date !== undefined) patch.commencement_date = args.commencement_date;
    if (args.due_date !== undefined) patch.due_date = args.due_date;
    if (args.estimated_total_hours !== undefined) {
        patch.estimated_total_hours = args.estimated_total_hours;
    }
    if (args.assigned_to_name !== undefined) {
        patch.assigned_to = (await resolveFeeEarner(args.assigned_to_name)).id;
    }
    if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");
    patch.performed_by = userId;

    const { data, error } = await KS()
        .from("tasks")
        .update(patch)
        .eq("id", args.task_id)
        .select("id, title, status, due_date, estimated_total_hours, matter_id")
        .single();
    if (error) throw new Error(error.message);
    return {
        ...data,
        link: ksMatterLink((data as { matter_id: string }).matter_id),
        confirmation: `Updated task "${data.title}" (id ${data.id}): changed ${Object.keys(patch)
            .filter((k) => k !== "performed_by")
            .join(", ")}. No new task was created.`,
    };
}

export async function ksDeleteTask(userId: string, args: { task_id: string }) {
    const { matterId } = await assertRowWritable(userId, "tasks", args.task_id);
    const { error } = await KS().from("tasks").delete().eq("id", args.task_id);
    if (error) throw new Error(error.message);
    return {
        deleted: args.task_id,
        link: ksMatterLink(matterId),
        confirmation: "Task deleted.",
    };
}

// ── assignments ──────────────────────────────────────────────────────────

export async function ksAssignTask(
    userId: string,
    args: {
        task_id: string;
        fee_earner_name: string;
        estimated_hours?: number;
        actual_hours?: number;
    },
) {
    // Assigning is a change to the task, so the task's own guard applies.
    const { matterId } = await assertRowWritable(userId, "tasks", args.task_id);
    const person = await resolveFeeEarner(args.fee_earner_name);

    const { data: existing } = await KS()
        .from("task_assignments")
        .select("id")
        .eq("task_id", args.task_id)
        .eq("user_id", person.id)
        .maybeSingle();

    if (existing) {
        const patch: Record<string, unknown> = { performed_by: userId };
        if (args.estimated_hours !== undefined) patch.estimated_hours = args.estimated_hours;
        if (args.actual_hours !== undefined) patch.actual_hours = args.actual_hours;
        const { data, error } = await KS()
            .from("task_assignments")
            .update(patch)
            .eq("id", (existing as { id: string }).id)
            .select("id, user_id, estimated_hours, actual_hours")
            .single();
        if (error) throw new Error(error.message);
        return {
            ...data,
            fee_earner: person.full_name,
            updated: true,
            link: ksMatterLink(matterId),
            confirmation: `Updated ${person.full_name}'s assignment on this task.`,
        };
    }

    const { data, error } = await KS()
        .from("task_assignments")
        .insert({
            task_id: args.task_id,
            user_id: person.id,
            estimated_hours: args.estimated_hours ?? 0,
            actual_hours: args.actual_hours ?? 0,
            performed_by: userId,
        })
        .select("id, user_id, estimated_hours, actual_hours")
        .single();
    if (error) throw new Error(error.message);
    return {
        ...data,
        fee_earner: person.full_name,
        updated: false,
        link: ksMatterLink(matterId),
        confirmation: `Assigned ${person.full_name} to this task.`,
    };
}

export async function ksUnassignTask(
    userId: string,
    args: { task_id: string; fee_earner_name: string },
) {
    const { matterId } = await assertRowWritable(userId, "tasks", args.task_id);
    const person = await resolveFeeEarner(args.fee_earner_name);
    const { error } = await KS()
        .from("task_assignments")
        .delete()
        .eq("task_id", args.task_id)
        .eq("user_id", person.id);
    if (error) throw new Error(error.message);
    return {
        unassigned: person.full_name,
        link: ksMatterLink(matterId),
        confirmation: `Removed ${person.full_name} from this task.`,
    };
}

// ── time ─────────────────────────────────────────────────────────────────

export async function ksUpdateTimeEntry(
    userId: string,
    args: {
        time_entry_id: string;
        hours?: number;
        date?: string;
        description?: string;
        billable?: boolean;
    },
) {
    await assertRowWritable(userId, "time_entries", args.time_entry_id);
    if (args.hours !== undefined && (!Number.isFinite(args.hours) || args.hours === 0)) {
        throw new Error("hours must be a non-zero number.");
    }

    const patch: Record<string, unknown> = { performed_by: userId };
    if (args.hours !== undefined) patch.hours = args.hours;
    if (args.date !== undefined) patch.date = args.date;
    if (args.description !== undefined) patch.description = args.description;
    if (args.billable !== undefined) patch.billable = args.billable;

    const { data, error } = await KS()
        .from("time_entries")
        .update(patch)
        .eq("id", args.time_entry_id)
        .select("id, hours, date, description, billable, matter_id")
        .single();
    if (error) throw new Error(error.message);
    return {
        ...data,
        link: ksMatterLink((data as { matter_id: string }).matter_id),
        confirmation: `Updated the time entry (${data.hours}h on ${data.date}).`,
    };
}

export async function ksDeleteTimeEntry(userId: string, args: { time_entry_id: string }) {
    const { matterId } = await assertRowWritable(userId, "time_entries", args.time_entry_id);
    const { error } = await KS().from("time_entries").delete().eq("id", args.time_entry_id);
    if (error) throw new Error(error.message);
    return {
        deleted: args.time_entry_id,
        link: ksMatterLink(matterId),
        confirmation: "Time entry deleted.",
    };
}

// ── calendar ─────────────────────────────────────────────────────────────

export async function ksCreateEvent(
    userId: string,
    args: {
        matter_id: string;
        title: string;
        start_time: string;
        end_time: string;
        description?: string;
        attendee_names?: string[];
    },
) {
    await assertMatterWritable(userId, args.matter_id);
    if (!args.title?.trim()) throw new Error("title is required.");
    if (!args.start_time || !args.end_time) {
        throw new Error("start_time and end_time are required (ISO 8601).");
    }
    if (new Date(args.end_time) <= new Date(args.start_time)) {
        throw new Error("end_time must be after start_time.");
    }

    const { data, error } = await KS()
        .from("calendar_events")
        .insert({
            matter_id: args.matter_id,
            title: args.title.trim(),
            description: args.description ?? null,
            start_time: args.start_time,
            end_time: args.end_time,
            attendees: args.attendee_names ?? [],
            // Same FK shape as tasks.created_by: a persona, not the student.
            created_by: null,
            performed_by: userId,
        })
        .select("id, title, start_time, end_time")
        .single();
    if (error) throw new Error(error.message);
    return {
        ...data,
        link: ksMatterLink(args.matter_id),
        confirmation: `Added "${data.title}" to the matter calendar.`,
    };
}

export async function ksUpdateEvent(
    userId: string,
    args: {
        event_id: string;
        title?: string;
        description?: string;
        start_time?: string;
        end_time?: string;
        attendee_names?: string[];
    },
) {
    await assertRowWritable(userId, "calendar_events", args.event_id);
    const patch: Record<string, unknown> = { performed_by: userId };
    if (args.title !== undefined) patch.title = args.title;
    if (args.description !== undefined) patch.description = args.description;
    if (args.start_time !== undefined) patch.start_time = args.start_time;
    if (args.end_time !== undefined) patch.end_time = args.end_time;
    if (args.attendee_names !== undefined) patch.attendees = args.attendee_names;

    const { data, error } = await KS()
        .from("calendar_events")
        .update(patch)
        .eq("id", args.event_id)
        .select("id, title, start_time, end_time, matter_id")
        .single();
    if (error) throw new Error(error.message);
    return {
        ...data,
        link: ksMatterLink((data as { matter_id: string }).matter_id),
        confirmation: `Updated calendar event "${data.title}".`,
    };
}

export async function ksDeleteEvent(userId: string, args: { event_id: string }) {
    const { matterId } = await assertRowWritable(userId, "calendar_events", args.event_id);
    const { error } = await KS().from("calendar_events").delete().eq("id", args.event_id);
    if (error) throw new Error(error.message);
    return {
        deleted: args.event_id,
        link: ksMatterLink(matterId),
        confirmation: "Calendar event deleted.",
    };
}

// ── matter ───────────────────────────────────────────────────────────────

const MATTER_FIELDS = new Set([
    "description",
    "status",
    "matter_type",
    "fee_type",
    "fixed_fee",
    "hourly_rate",
    "start_date",
    "end_date",
]);

export async function ksUpdateMatter(
    userId: string,
    args: { matter_id: string; [k: string]: unknown },
) {
    const { shared } = await assertMatterWritable(userId, args.matter_id);
    if (shared) {
        // Matter-level fields are not row-owned, so the "only your own rows"
        // rule cannot protect them. Changing the fee arrangement or closing
        // NexaCare would hit all six groups at once.
        throw new Error(
            "NexaCare is the shared teaching matter — its matter-level details are fixed so every group sees the same case. You can change your own group's matter.",
        );
    }

    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(args)) {
        if (k === "matter_id") continue;
        if (!MATTER_FIELDS.has(k)) {
            throw new Error(
                `"${k}" is not an editable matter field. Editable: ${[...MATTER_FIELDS].join(", ")}`,
            );
        }
        patch[k] = v;
    }
    if (Object.keys(patch).length === 0) throw new Error("Nothing to update.");

    const { data, error } = await KS()
        .from("matters")
        .update(patch)
        .eq("id", args.matter_id)
        .select("id, title, status, fee_type, start_date, end_date")
        .single();
    if (error) throw new Error(error.message);
    return {
        ...data,
        link: ksMatterLink(args.matter_id),
        confirmation: `Updated matter "${data.title}".`,
    };
}

// ── documents ────────────────────────────────────────────────────────────

export async function ksAddMatterDocument(
    userId: string,
    args: {
        matter_id: string;
        title: string;
        task_id?: string;
        description?: string;
        file_name?: string;
        file_type?: string;
    },
) {
    await assertMatterWritable(userId, args.matter_id);
    if (!args.title?.trim()) throw new Error("title is required.");
    if (args.task_id) await assertTaskInMatter(args.task_id, args.matter_id);

    const { data, error } = await KS()
        .from("documents")
        .insert({
            matter_id: args.matter_id,
            task_id: args.task_id ?? null,
            title: args.title.trim(),
            description: args.description ?? null,
            file_name: args.file_name ?? null,
            file_type: args.file_type ?? null,
            // uploaded_by REFERENCES ks.profiles(id) — persona, not student.
            uploaded_by: null,
            performed_by: userId,
        })
        .select("id, title, created_at")
        .single();
    if (error) throw new Error(error.message);
    return {
        ...data,
        link: ksMatterLink(args.matter_id),
        confirmation: `Added "${data.title}" to the matter documents.`,
    };
}

export async function ksDeleteMatterDocument(userId: string, args: { document_id: string }) {
    const { matterId } = await assertRowWritable(userId, "documents", args.document_id);
    const { error } = await KS().from("documents").delete().eq("id", args.document_id);
    if (error) throw new Error(error.message);
    return {
        deleted: args.document_id,
        link: ksMatterLink(matterId),
        confirmation: "Matter document deleted.",
    };
}
