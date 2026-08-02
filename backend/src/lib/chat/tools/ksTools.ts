/**
 * Kendry & Slate practice-management tools.
 *
 * These replace the public MCP endpoint the old Lovable project exposed. Since
 * the 30 Jul 2026 merge, K&S lives in the `ks` schema of Rose's own Supabase
 * project, so the backend queries it directly — no per-user connector to
 * register, which is what previously blocked students (Settings is admin-only).
 *
 * ACCESS MODEL — read this before adding a tool.
 *
 * The backend holds the service-role key, so RLS does NOT apply to these
 * queries. Every tool must therefore enforce scope itself, and the scope must
 * match the RLS policy a student would get in the browser:
 *
 *   · a student sees their group's matter plus the shared NexaCare matter,
 *     via ks.matter_members (see migration 20260730_02);
 *   · admins (public.user_profiles.is_admin) see everything.
 *
 * `ksAccessibleMatterIds()` is the single place that decides this. Anything
 * that returns matter data must filter through it — otherwise the AI becomes a
 * trivial way to read another group's assessment data, which would defeat the
 * RLS work entirely.
 *
 * The write tools (`ks_record_time_entry` plus the task / assignment / time /
 * calendar / matter / document writes implemented in lib/ksWrites.ts) re-check
 * membership, stamp `performed_by` with the real student (never the persona),
 * and are all listed in WRITE_TOOLS so any agent plan containing one hits the
 * approval gate.
 *
 * The shared teaching matter (NexaCare) is append-only: anyone may add rows to
 * it, but only the person who created a row may change or delete it, and its
 * matter-level fields cannot be changed at all. That is enforced in
 * lib/ksWrites.ts (`assertRowWritable`), not here — the tool descriptions just
 * say so, so the model does not plan work that is bound to fail.
 */

export const KS_TOOL_NAMES = {
  listMatters: "ks_list_matters",
  getMatter: "ks_get_matter",
  listTasks: "ks_list_tasks",
  timeLedger: "ks_time_ledger",
  listStaff: "ks_list_staff",
  recordTimeEntry: "ks_record_time_entry",
  createTask: "ks_create_task",
  updateTask: "ks_update_task",
  deleteTask: "ks_delete_task",
  assignTask: "ks_assign_task",
  unassignTask: "ks_unassign_task",
  updateTimeEntry: "ks_update_time_entry",
  deleteTimeEntry: "ks_delete_time_entry",
  createEvent: "ks_create_event",
  updateEvent: "ks_update_event",
  deleteEvent: "ks_delete_event",
  updateMatter: "ks_update_matter",
  addMatterDocument: "ks_add_matter_document",
  deleteMatterDocument: "ks_delete_matter_document",
} as const;

export const KS_READ_TOOL_NAMES: string[] = [
  KS_TOOL_NAMES.listMatters,
  KS_TOOL_NAMES.getMatter,
  KS_TOOL_NAMES.listTasks,
  KS_TOOL_NAMES.timeLedger,
  KS_TOOL_NAMES.listStaff,
];

export const KS_TOOLS = [
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.listMatters,
      description:
        "List the Kendry & Slate matters you have access to (your assignment group's matter, plus the shared NexaCare/Whitegum case study). Returns title, client, status, matter type, fee basis and fees recorded to date. Call this first when a question concerns 'the matter' and you don't yet know its id.",
      parameters: {
        type: "object",
        properties: {
          search: {
            type: "string",
            description: "Optional case-insensitive filter on the matter title.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.getMatter,
      description:
        "Get one Kendry & Slate matter in detail: client, lead partner, fee type (hourly_rates or fixed_fee), hourly rate, fixed fee, fees recorded to date, start and end dates, and task counts by status and phase. Use for questions about a matter's commercial shape or overall health.",
      parameters: {
        type: "object",
        properties: {
          matter_id: {
            type: "string",
            description: "The matter's id (from ks_list_matters).",
          },
        },
        required: ["matter_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.listTasks,
      description:
        "List tasks on a matter with their phase, workstream, status, priority, assignee, dates, and — importantly — estimated_total_hours against actual_hours. That pair is the estimate-variance evidence: use it for scoping accuracy, scope creep, workload distribution and 'is this matter really on track' questions. Do not infer variance from anything else.",
      parameters: {
        type: "object",
        properties: {
          matter_id: { type: "string", description: "The matter's id." },
          phase: { type: "string", description: "Optional phase filter." },
          workstream: { type: "string", description: "Optional workstream filter." },
          status: {
            type: "string",
            description: "Optional status filter (e.g. open, in_progress, completed).",
          },
          assignee_name: {
            type: "string",
            description: "Optional filter by the assigned fee earner's name (partial match).",
          },
          overdue_only: {
            type: "boolean",
            description: "If true, return only tasks past their due date and not completed.",
          },
        },
        required: ["matter_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.timeLedger,
      description:
        "Read the time ledger for a matter: date, task, phase, the fee earner the time is booked to, hours, rate, cost, narrative and source. Also returns `operator_name` — the real person who recorded the entry, which may differ from the fee earner. That distinction matters: it is how you tell who actually booked an hour versus whose name it was billed under. `source` distinguishes manual entries from 'auto-sync', 'adjustment' and 'prefill'. Use for costs disclosure, write-downs, rate mix and time-recording integrity questions.",
      parameters: {
        type: "object",
        properties: {
          matter_id: { type: "string", description: "The matter's id." },
          from_date: { type: "string", description: "Optional ISO date lower bound (inclusive)." },
          to_date: { type: "string", description: "Optional ISO date upper bound (inclusive)." },
          source: {
            type: "string",
            description:
              "Optional filter: manual | auto-sync | adjustment | prefill. Filter to 'adjustment' to examine write-downs and corrections.",
          },
          limit: {
            type: "integer",
            description: "Max entries to return (default 200, max 1000).",
          },
        },
        required: ["matter_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.listStaff,
      description:
        "List the Kendry & Slate fee earners: name, role (partner, senior_associate, junior_associate, legal_assistant), charge-out rate and internal cost rate. Use for rate-mix analysis, right-sourcing questions, and to check whether work sits at the appropriate level of seniority.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.recordTimeEntry,
      description:
        "Record a time entry against a matter (and optionally a task) in the Kendry & Slate practice-management system. This WRITES to the firm's time ledger and requires approval before it runs. The entry is attributed to the fee earner you name AND to the real user who approved it, so it is auditable. Only use this when the user has explicitly asked to record time — never to 'tidy up' or reconcile a ledger on your own initiative.",
      parameters: {
        type: "object",
        properties: {
          matter_id: { type: "string", description: "The matter's id." },
          task_id: {
            type: "string",
            description: "Optional task id to book the time against.",
          },
          fee_earner_name: {
            type: "string",
            description:
              "The fee earner the time is booked to (e.g. 'Aisha Rahman'). Use ks_list_staff to get exact names.",
          },
          date: {
            type: "string",
            description: "Entry date, ISO format (YYYY-MM-DD). Defaults to today.",
          },
          hours: { type: "number", description: "Hours worked (may be negative for a correction)." },
          description: {
            type: "string",
            description: "The narrative for the entry. Required — an unnarrated entry is not auditable.",
          },
          billable: { type: "boolean", description: "Whether the time is billable (default true)." },
        },
        required: ["matter_id", "fee_earner_name", "hours", "description"],
      },
    },
  },

  // ── writes (lib/ksWrites.ts) ───────────────────────────────────────────
  // All approval-gated. On the shared teaching matter (NexaCare) you may add
  // new rows freely but may only change or delete rows you created yourself;
  // its matter-level fields are fixed. Your own group's matter is unrestricted.

  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.createTask,
      description:
        "Create a NEW task on a Kendry & Slate matter. WRITES to the practice-management system and requires approval before it runs. Adding is always permitted, including on the shared NexaCare teaching matter. Use ks_list_staff for exact fee-earner names. This tool is ONLY for tasks that do not exist yet: to change a task that already exists — including one you created a moment ago — use ks_update_task. A create whose title already exists on the matter is refused and returns the existing task's id.",
      parameters: {
        type: "object",
        properties: {
          matter_id: { type: "string", description: "The matter's id (from ks_list_matters)." },
          title: { type: "string", description: "Short task title." },
          description: { type: "string", description: "Optional longer description of the work." },
          status: {
            type: "string",
            description:
              "One of: not_started, in_progress, completed, blocked, on_hold. Defaults to not_started.",
          },
          priority: { type: "string", description: "Priority (e.g. low, medium, high). Defaults to medium." },
          workstream: { type: "string", description: "Optional workstream the task belongs to." },
          phase: { type: "string", description: "Optional matter phase the task belongs to." },
          commencement_date: { type: "string", description: "Optional start date, ISO (YYYY-MM-DD)." },
          due_date: { type: "string", description: "Optional due date, ISO (YYYY-MM-DD)." },
          estimated_total_hours: {
            type: "number",
            description: "Estimated hours for the task. Defaults to 0.",
          },
          assigned_to_name: {
            type: "string",
            description:
              "Optional fee earner to own the task (e.g. 'Aisha Rahman'). Must match exactly one person.",
          },
          allow_duplicate: {
            type: "boolean",
            description:
              "Only set true when the matter genuinely needs a second, separate task with a title that already exists. Never set it to work around the duplicate error after being asked to change an existing task — use ks_update_task instead.",
          },
        },
        required: ["matter_id", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.updateTask,
      description:
        "Update fields on an existing Kendry & Slate task — status, dates, estimate, owner, description. WRITES and requires approval. On the shared NexaCare teaching matter this only works on tasks you created yourself; the seeded 49 tasks are fixed for every group, so create a new task instead of amending one. Only the fields you supply are changed; setting status to 'completed' stamps the completion time.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The task's id (from ks_list_tasks)." },
          title: { type: "string", description: "New title." },
          description: { type: "string", description: "New description." },
          status: {
            type: "string",
            description: "One of: not_started, in_progress, completed, blocked, on_hold.",
          },
          priority: { type: "string", description: "New priority (e.g. low, medium, high)." },
          workstream: { type: "string", description: "New workstream." },
          phase: { type: "string", description: "New phase." },
          commencement_date: { type: "string", description: "New start date, ISO (YYYY-MM-DD)." },
          estimated_total_hours: {
            type: "number",
            description:
              "New estimated hours. This REPLACES the existing estimate — it is not added to it. If the user asks for a task of 10 hours and the task already carries 10, the correct value is 10, not 20. Omit this field entirely unless the current request asks for the estimate to change.",
          },
          due_date: {
            type: "string",
            description:
              "New due date, ISO (YYYY-MM-DD). Omit unless the current request asks for the due date to change — do not restate a date from an earlier turn, and never overwrite an existing due date that the user has not mentioned.",
          },
          assigned_to_name: {
            type: "string",
            description: "Reassign the task to this fee earner. Must match exactly one person.",
          },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.deleteTask,
      description:
        "Delete a Kendry & Slate task. WRITES and requires approval. On the shared NexaCare teaching matter you may only delete tasks you created yourself. Deleting removes the task's assignments and history with it — prefer setting status to 'blocked' or 'on_hold' unless the user has asked for deletion.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The task's id (from ks_list_tasks)." },
        },
        required: ["task_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.assignTask,
      description:
        "Assign a fee earner to a Kendry & Slate task, or update their hours on an existing assignment. WRITES and requires approval. This is a change to the task, so on the shared NexaCare teaching matter it only works on tasks you created yourself. A task may carry several assignees; this adds or updates one of them without disturbing the others. Use ks_list_staff for exact names.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The task's id." },
          fee_earner_name: {
            type: "string",
            description: "The fee earner to assign (e.g. 'Mia Rossi'). Must match exactly one person.",
          },
          estimated_hours: {
            type: "number",
            description: "Hours this person is expected to spend. Defaults to 0 on a new assignment.",
          },
          actual_hours: {
            type: "number",
            description:
              "Hours actually spent. Prefer ks_record_time_entry for real time recording — this is the assignment aggregate.",
          },
        },
        required: ["task_id", "fee_earner_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.unassignTask,
      description:
        "Remove a fee earner's assignment from a Kendry & Slate task. WRITES and requires approval. On the shared NexaCare teaching matter this only works on tasks you created yourself. Time entries already booked are not removed — only the assignment.",
      parameters: {
        type: "object",
        properties: {
          task_id: { type: "string", description: "The task's id." },
          fee_earner_name: {
            type: "string",
            description: "The fee earner to unassign. Must match exactly one person.",
          },
        },
        required: ["task_id", "fee_earner_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.updateTimeEntry,
      description:
        "Amend an existing time entry — hours, date, narrative or billable flag. WRITES to the firm's time ledger and requires approval. On the shared NexaCare teaching matter you may only amend entries you recorded yourself; the seeded ledger is fixed. Amending recorded time is a conduct-sensitive act: only do it when the user has explicitly asked, and keep the narrative honest about the correction.",
      parameters: {
        type: "object",
        properties: {
          time_entry_id: { type: "string", description: "The time entry's id (from ks_time_ledger)." },
          hours: { type: "number", description: "New hours. Must be non-zero; may be negative for a correction." },
          date: { type: "string", description: "New entry date, ISO (YYYY-MM-DD)." },
          description: { type: "string", description: "New narrative for the entry." },
          billable: { type: "boolean", description: "Whether the time is billable." },
        },
        required: ["time_entry_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.deleteTimeEntry,
      description:
        "Delete a time entry from the Kendry & Slate ledger. WRITES and requires approval. On the shared NexaCare teaching matter you may only delete entries you recorded yourself. Deleting recorded time destroys the audit trail — prefer a negative correcting entry via ks_record_time_entry unless the user has specifically asked for deletion.",
      parameters: {
        type: "object",
        properties: {
          time_entry_id: { type: "string", description: "The time entry's id (from ks_time_ledger)." },
        },
        required: ["time_entry_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.createEvent,
      description:
        "Create a calendar event on a Kendry & Slate matter — a client touchpoint, review, hearing or internal checkpoint. WRITES and requires approval. Adding is always permitted, including on the shared NexaCare teaching matter. Times are ISO 8601 and end_time must be after start_time.",
      parameters: {
        type: "object",
        properties: {
          matter_id: { type: "string", description: "The matter's id." },
          title: { type: "string", description: "Event title." },
          start_time: { type: "string", description: "Start, ISO 8601 (e.g. 2026-08-05T09:00:00+10:00)." },
          end_time: { type: "string", description: "End, ISO 8601. Must be after start_time." },
          description: { type: "string", description: "Optional agenda or purpose." },
          attendee_names: {
            type: "array",
            items: { type: "string" },
            description: "Optional list of attendee names, recorded as free text.",
          },
        },
        required: ["matter_id", "title", "start_time", "end_time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.updateEvent,
      description:
        "Update a Kendry & Slate calendar event — retitle, reschedule, change the agenda or attendees. WRITES and requires approval. On the shared NexaCare teaching matter you may only change events you created yourself. Only the fields you supply are changed; attendee_names replaces the whole attendee list.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "The event's id." },
          title: { type: "string", description: "New title." },
          description: { type: "string", description: "New agenda or purpose." },
          start_time: { type: "string", description: "New start, ISO 8601." },
          end_time: { type: "string", description: "New end, ISO 8601." },
          attendee_names: {
            type: "array",
            items: { type: "string" },
            description: "Replacement attendee list (supply every attendee, not just the additions).",
          },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.deleteEvent,
      description:
        "Delete a Kendry & Slate calendar event. WRITES and requires approval. On the shared NexaCare teaching matter you may only delete events you created yourself.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", description: "The event's id." },
        },
        required: ["event_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.updateMatter,
      description:
        "Update matter-level details on a Kendry & Slate matter: description, status, matter_type, fee_type, fixed_fee, hourly_rate, start_date, end_date. No other field is editable. WRITES and requires approval. This does NOT work on the shared NexaCare teaching matter at all — its matter-level details are fixed so all six groups see the same case; you can only change your own group's matter. Changing fee_type or the fee figures alters how the matter is costed, so confirm with the user first.",
      parameters: {
        type: "object",
        properties: {
          matter_id: { type: "string", description: "The matter's id (from ks_list_matters)." },
          description: { type: "string", description: "New matter description." },
          status: { type: "string", description: "New matter status (e.g. active, on_hold, closed)." },
          matter_type: { type: "string", description: "New matter type." },
          fee_type: { type: "string", description: "Fee basis: hourly_rates or fixed_fee." },
          fixed_fee: { type: "number", description: "Fixed fee amount (AUD), when fee_type is fixed_fee." },
          hourly_rate: { type: "number", description: "Matter hourly rate (AUD), when fee_type is hourly_rates." },
          start_date: { type: "string", description: "Matter start date, ISO (YYYY-MM-DD)." },
          end_date: { type: "string", description: "Matter end date, ISO (YYYY-MM-DD)." },
        },
        required: ["matter_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.addMatterDocument,
      description:
        "Register a document against a Kendry & Slate matter (and optionally a task) — this records the document in the matter file; it does not upload a file. WRITES and requires approval. Adding is always permitted, including on the shared NexaCare teaching matter. Any task_id supplied must belong to the same matter.",
      parameters: {
        type: "object",
        properties: {
          matter_id: { type: "string", description: "The matter's id." },
          title: { type: "string", description: "Document title as it should appear in the matter file." },
          task_id: {
            type: "string",
            description: "Optional task the document relates to. Must belong to the same matter.",
          },
          description: { type: "string", description: "Optional description of the document's purpose." },
          file_name: { type: "string", description: "Optional file name, if there is an underlying file." },
          file_type: { type: "string", description: "Optional file type (e.g. pdf, docx)." },
        },
        required: ["matter_id", "title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: KS_TOOL_NAMES.deleteMatterDocument,
      description:
        "Remove a document record from a Kendry & Slate matter file. WRITES and requires approval. On the shared NexaCare teaching matter you may only delete document records you created yourself.",
      parameters: {
        type: "object",
        properties: {
          document_id: { type: "string", description: "The K&S document record's id." },
        },
        required: ["document_id"],
      },
    },
  },
];

/**
 * Told to the model whenever K&S tools are available.
 *
 * Two problems this fixes.
 *
 * 1. After successfully creating a task, the assistant ended its turn with
 *    nothing but "Completed in 6 steps" and a reasoning trace. The work had
 *    happened, but the user had no way to tell — no statement, no link, no way
 *    to check. A silent success is indistinguishable from a silent failure.
 *
 * 2. Asked to "set the due date for this task" immediately after creating one,
 *    the assistant created a SECOND identical task and reported it as a
 *    success — leaving the matter with a duplicate. Amending an existing
 *    record is now stated as a rule, and ksCreateTask refuses same-title
 *    creates outright, because a rule the model may skip is not a control.
 */
export const KS_SYSTEM_PROMPT = `KENDRY & SLATE (practice management):
The ks_* tools read and change real matter data — tasks, assignments, time, calendar, documents.

WRITE ONLY WHAT WAS ASKED FOR IN THE CURRENT REQUEST. Do not carry a value over from an earlier turn unless the user has referred back to it. If this request names no due date, create the task with no due date rather than reusing one you set before. Earlier turns are history, not standing instructions — and a date you stated earlier is not evidence that the date was right.

AMEND, DO NOT RE-CREATE. If the user asks you to change something that already exists — including a record you created earlier in this same conversation ("set the due date for this task", "move that deadline", "reassign it") — use the matching ks_update_* tool with that record's id. Never create a second record to apply a change to an existing one. If you do not have the id, find it with ks_list_tasks (or ks_time_ledger, or the matter's events) before writing anything. Creating a duplicate is a failure even when the tool call succeeds.

AFTER ANY ks_* WRITE, your final answer MUST:
- State plainly what changed, in one or two sentences of ordinary prose, outside any reasoning. Never let a write be reported only by a step count or a thought process.
- Quote the specifics back: task title, who it is assigned to, hours, due date — so the user can check it is what they asked for without opening anything.
- Include the link the tool returned, as a markdown link, e.g. [Open the matter in Kendry & Slate](/workspace/dashboard/matter/<id>). Use the tool's \`link\` value verbatim; never construct a URL yourself.
- If a write failed, say so directly and say why. Do not describe an intended action as though it happened.

Writes on the shared teaching matter (NexaCare) are append-only: anyone may add records, but only the person who created a record may change or delete it. If a change is refused for that reason, explain it plainly rather than retrying.`;
