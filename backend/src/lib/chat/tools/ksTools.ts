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
 * `ks_record_time_entry` is the only write. It re-checks membership, stamps
 * `performed_by` with the real student (never the persona), and is listed in
 * WRITE_TOOLS so any agent plan containing it hits the approval gate.
 */

export const KS_TOOL_NAMES = {
  listMatters: "ks_list_matters",
  getMatter: "ks_get_matter",
  listTasks: "ks_list_tasks",
  timeLedger: "ks_time_ledger",
  listStaff: "ks_list_staff",
  recordTimeEntry: "ks_record_time_entry",
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
];
