/**
 * P1 — Agent runtime shared types (C013/C030).
 */

export type AgentRole =
    | "intake"
    | "research"
    | "drafting"
    | "review"
    | "verify";

export type AgentRunKind =
    | "assistant"
    | "workflow"
    | "draft_from_precedent"
    | "playbook_builder"
    | "verify"
    | "regulatory_scan";

export type AgentRunStatus =
    | "planning"
    | "awaiting_approval"
    | "running"
    | "paused"
    | "completed"
    | "failed"
    | "cancelled";

export type PlanStep = {
    position: number;
    depends_on: number[];
    role: AgentRole;
    instruction: string;
    tool_allowlist: string[];
};

export type AgentPlan = {
    title: string;
    steps: PlanStep[];
};

/** Tools each specialist role may use (C013 guardrails / tool routing).
 *  Write-capable tools are confined to drafting; research is read-only.
 *
 *  Jade.io's raw search/fetch tools (jade_search_cases, jade_search_legislation,
 *  jade_fetch_document) only do anything when the admin "Jade access approved"
 *  toggle is on — toolDispatcher.ts refuses to call Jade.io otherwise. So
 *  those three are only worth offering to the model when jadeApproved is
 *  true; when it's false the role instead gets `verify_citation`, the
 *  source-agnostic tool that transparently falls back to a human-verified
 *  AustLII search link (see lib/verification). `jade_format_citation` is
 *  pure AGLC4 string formatting — no external access — so it's always safe
 *  to offer regardless of the toggle. */
function roleToolset(role: AgentRole, jadeApproved: boolean): string[] {
    const jadeLiveTools = jadeApproved
        ? ["jade_search_cases", "jade_search_legislation", "jade_fetch_document"]
        : [];
    switch (role) {
        // C076 — list tools: intake & drafting may create/update matter list
        // items (write); research/review/verify read the list only.
        case "intake":
            return [
                "list_documents",
                "read_document",
                "find_in_document",
                "list_list_items",
                "add_list_item",
                "update_list_item_status",
                // K&S: enough to identify the matter being worked on.
                "ks_list_matters",
                "ks_get_matter",
                // Intake sets work up — it may create tasks, put a name
                // against them and book a touchpoint in the calendar. It may
                // NOT amend the record (no update/delete, no time, no matter
                // fields); that is drafting's job. All three are in
                // WRITE_TOOLS, so a plan containing them is approval-gated.
                "ks_create_task",
                "ks_assign_task",
                "ks_create_event",
            ];
        case "research":
            return [
                "list_documents",
                "fetch_documents",
                "read_document",
                "find_in_document",
                "search_knowledge",
                "search_clauses",
                "list_playbooks",
                ...jadeLiveTools,
                "verify_citation",
                "jade_format_citation",
                "tabular_ask",
                "list_list_items",
                // K&S practice-management reads. The estimate-vs-actual and
                // time-ledger data is the evidence base for the Week-8
                // CX/EX and ethics exercises.
                "ks_list_matters",
                "ks_get_matter",
                "ks_list_tasks",
                "ks_time_ledger",
                "ks_list_staff",
            ];
        case "drafting":
            return [
                "list_documents",
                "fetch_documents",
                "read_document",
                "find_in_document",
                "search_knowledge",
                "search_clauses",
                "list_playbooks",
                "generate_docx",
                "generate_excel",
                "generate_ppt",
                "edit_document",
                "replicate_document",
                "jade_format_citation",
                "list_list_items",
                "add_list_item",
                "update_list_item_status",
                "ks_list_matters",
                "ks_get_matter",
                "ks_list_tasks",
                "ks_time_ledger",
                "ks_list_staff",
                // K&S writes — drafting is the only role that may change the
                // matter record. All of these are in WRITE_TOOLS, so any plan
                // containing one is approval-gated (C030), and ksWrites.ts
                // keeps the shared NexaCare matter append-only.
                "ks_record_time_entry",
                "ks_create_task",
                "ks_update_task",
                "ks_delete_task",
                "ks_assign_task",
                "ks_unassign_task",
                "ks_update_time_entry",
                "ks_delete_time_entry",
                "ks_create_event",
                "ks_update_event",
                "ks_delete_event",
                "ks_update_matter",
                "ks_add_matter_document",
                "ks_delete_matter_document",
            ];
        case "review":
            return [
                "list_documents",
                "fetch_documents",
                "read_document",
                "find_in_document",
                "list_playbooks",
                "review_against_playbook",
                "search_knowledge",
                "search_clauses",
                "verify_citation",
                "jade_format_citation",
                "list_list_items",
                "ks_get_matter",
                "ks_list_tasks",
                "ks_time_ledger",
            ];
        case "verify":
            return [
                "read_document",
                "find_in_document",
                "verify_citation",
                ...(jadeApproved ? ["jade_fetch_document"] : []),
                "jade_format_citation",
                "verify_assertions",
                "list_list_items",
            ];
    }
}

/** Tool allowlists for all five roles, for a given Jade-access state.
 *  Prefer `roleToolset(role, jadeApproved)` directly when you only need one. */
export function roleToolsets(jadeApproved: boolean): Record<AgentRole, string[]> {
    return {
        intake: roleToolset("intake", jadeApproved),
        research: roleToolset("research", jadeApproved),
        drafting: roleToolset("drafting", jadeApproved),
        review: roleToolset("review", jadeApproved),
        verify: roleToolset("verify", jadeApproved),
    };
}

/** Tools that mutate state — any plan containing them requires approval (C030). */
export const WRITE_TOOLS = new Set([
    "generate_docx",
    "generate_excel",
    "generate_ppt",
    "edit_document",
    "replicate_document",
    "create_playbook",
    "upsert_playbook_rule",
    "delete_playbook_rule",
    "save_clause",
    // C076 — list mutations gate plans behind approval too.
    "add_list_item",
    "update_list_item_status",
    // Writes to the K&S matter record — time, tasks, assignments, calendar,
    // matter fields and documents. Deliberately gated: this is assessment
    // data, and Week 8 treats the time ledger as evidence of conduct.
    "ks_record_time_entry",
    "ks_create_task",
    "ks_update_task",
    "ks_delete_task",
    "ks_assign_task",
    "ks_unassign_task",
    "ks_update_time_entry",
    "ks_delete_time_entry",
    "ks_create_event",
    "ks_update_event",
    "ks_delete_event",
    "ks_update_matter",
    "ks_add_matter_document",
    "ks_delete_matter_document",
]);

export function planNeedsApproval(plan: AgentPlan): boolean {
    if (plan.steps.length > 1) return true;
    return plan.steps.some((s) =>
        s.tool_allowlist.some((t) => WRITE_TOOLS.has(t)),
    );
}
