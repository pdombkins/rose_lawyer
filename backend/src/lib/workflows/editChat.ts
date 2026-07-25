/**
 * Conversational workflow editing.
 *
 * A user duplicates a workflow, then describes the changes they want in
 * plain English ("make step 2 extract the indemnity clause verbatim before
 * summarising it", "add a NSW-specific check", "drop the costs column"). This
 * turns that conversation into a concrete proposed revision of the workflow's
 * instructions and — for tabular workflows — its columns.
 *
 * Nothing is saved automatically. The model returns a proposal plus a summary
 * of what changed; the user applies it explicitly from the editor.
 */

import { completeText, type UserApiKeys } from "../llm";
import { calculateCostAud } from "../pricing";
import { createServerSupabase } from "../supabase";
import { parseJsonObject, type WorkflowBlueprint } from "./blueprint";

type Db = ReturnType<typeof createServerSupabase>;

export type EditChatMessage = { role: "user" | "assistant"; content: string };

export type ColumnDraft = {
    index: number;
    name: string;
    prompt: string;
    format?: string;
    type?: string;
};

export type WorkflowEditProposal = {
    /** Conversational answer shown in the chat transcript. */
    reply: string;
    /** Full replacement instructions, or null when nothing should change. */
    skill_md: string | null;
    /** Full replacement columns (tabular only), or null to leave as-is. */
    columns_config: ColumnDraft[] | null;
    /** Bullet summary of the concrete changes made. */
    changes: string[];
    /** Any request the model declined or could not action. */
    notes: string | null;
};

const MAX_HISTORY = 12;

function systemPrompt(type: "assistant" | "tabular"): string {
    return `You are the workflow editor for Rose, an AI legal assistant used in Australian/NZ legal practice and legal education.

The user has their own editable copy of a legal workflow and is describing changes they want. You rewrite the workflow to match, and explain what you changed.

A workflow is defined by:
- INSTRUCTIONS (markdown): the authoritative description of the process. This is what the workflow engine decomposes into steps.
${
    type === "tabular"
        ? "- COLUMNS: the extraction columns applied to every document independently. Each has a name, a prompt, and a format (text, date, money, duration, boolean, risk, bulleted_list)."
        : ""
}

Rules for the instructions you produce:
- Return the COMPLETE revised instructions, not a diff or a fragment.
- Keep the user's structure and voice where you can; change what they asked for and leave the rest alone.
- Write the process as explicit numbered steps with, for each: what it must achieve, what it consumes, what it produces, and how you would know the output is correct. This is what makes the workflow inspectable.
- Prefer verbatim extraction of operative legal text before any analysis or summary of it. Summarising an operative clause loses provisos, carve-outs, thresholds and defined-term links, and the loss is invisible in the output. If the user asks for a step that summarises operative text, do it — but add an explicit sub-step that extracts the underlying text first, and say so in your reply.
- Instruct steps to report "not found in the provided documents" rather than substituting a plausible value.
- Australian law context; AGLC4 for citations. Do not present this as legal advice.
- Do not invent scope the user did not ask for.

If the user asks a question rather than requesting a change, answer it and return null for skill_md${type === "tabular" ? " and columns_config" : ""}.

Respond with ONLY a JSON object, no markdown fences:
{"reply":"<your conversational answer to the user>",
 "skill_md":"<the complete revised instructions, or null>",
${
    type === "tabular"
        ? ' "columns_config":[{"index":0,"name":"…","prompt":"…","format":"text"}] or null,\n'
        : ""
} "changes":["<one line per concrete change>"],
 "notes":"<anything you declined or could not action, or null>"}`;
}

function describeCurrent(args: {
    title: string;
    type: "assistant" | "tabular";
    promptMd: string | null;
    columns: ColumnDraft[];
    blueprint: WorkflowBlueprint | null;
}): string {
    const parts = [
        `WORKFLOW TITLE: ${args.title}`,
        `CURRENT INSTRUCTIONS:\n${args.promptMd?.trim() || "(empty)"}`,
    ];
    if (args.type === "tabular") {
        parts.push(
            `CURRENT COLUMNS:\n${
                args.columns.length
                    ? args.columns
                          .map(
                              (c) =>
                                  `${c.index}. ${c.name} [${c.format ?? c.type ?? "text"}] — ${c.prompt}`,
                          )
                          .join("\n")
                    : "(none)"
            }`,
        );
    }
    if (args.blueprint) {
        parts.push(
            `CURRENT STEP BLUEPRINT (derived from the instructions above — use it to refer to steps by number):\n${args.blueprint.steps
                .map(
                    (s) =>
                        `Step ${s.position} — ${s.name} (${s.role}, silent-failure risk ${s.silent_failure.risk}): ${s.objective}`,
                )
                .join("\n")}`,
        );
    }
    return parts.join("\n\n");
}

function sanitizeColumns(raw: unknown): ColumnDraft[] | null {
    if (!Array.isArray(raw)) return null;
    const cols = raw
        .map((c): ColumnDraft | null => {
            if (!c || typeof c !== "object") return null;
            const r = c as Record<string, unknown>;
            const name = typeof r.name === "string" ? r.name.trim() : "";
            const prompt = typeof r.prompt === "string" ? r.prompt.trim() : "";
            if (!name || !prompt) return null;
            return {
                index: 0,
                name: name.slice(0, 200),
                prompt: prompt.slice(0, 4000),
                ...(typeof r.format === "string"
                    ? { format: r.format.slice(0, 40) }
                    : {}),
                ...(typeof r.type === "string"
                    ? { type: r.type.slice(0, 40) }
                    : {}),
            };
        })
        .filter((x): x is ColumnDraft => !!x)
        .slice(0, 60)
        .map((c, i) => ({ ...c, index: i }));
    return cols.length ? cols : null;
}

export async function proposeWorkflowEdit(args: {
    db: Db;
    userId: string;
    title: string;
    type: "assistant" | "tabular";
    promptMd: string | null;
    columns: ColumnDraft[];
    blueprint: WorkflowBlueprint | null;
    messages: EditChatMessage[];
    model: string;
    apiKeys?: UserApiKeys;
}): Promise<WorkflowEditProposal> {
    const history = args.messages.slice(-MAX_HISTORY);
    const transcript = history
        .map(
            (m) =>
                `${m.role === "user" ? "USER" : "YOU (previously)"}: ${m.content.slice(0, 6000)}`,
        )
        .join("\n\n");
    const system = systemPrompt(args.type);
    const user = [
        describeCurrent(args),
        `CONVERSATION SO FAR:\n${transcript}`,
        "Now respond to the latest USER message.",
    ].join("\n\n");

    const text = await completeText({
        model: args.model,
        systemPrompt: system,
        user,
        maxTokens: 8000,
        apiKeys: args.apiKeys,
    });

    try {
        const cost = await calculateCostAud(
            args.model,
            Math.ceil((system.length + user.length) / 4),
            Math.ceil(text.length / 4),
        );
        await args.db.from("query_costs").insert({
            user_id: args.userId,
            chat_id: null,
            project_id: null,
            model: cost.model,
            input_tokens: cost.inputTokens,
            output_tokens: cost.outputTokens,
            cost_usd: cost.costUsd,
            cost_aud: cost.costAud,
            aud_rate: cost.audRate,
            source: "workflow_edit",
        });
    } catch (err) {
        console.error("[workflowEdit] failed to record spend:", err);
    }

    const parsed = parseJsonObject(text);
    if (!parsed || typeof parsed !== "object") {
        // Non-JSON reply: still useful as conversation, just not applicable.
        return {
            reply: text.trim().slice(0, 8000),
            skill_md: null,
            columns_config: null,
            changes: [],
            notes: "The model's reply could not be parsed into a workflow revision, so nothing is proposed for saving.",
        };
    }
    const obj = parsed as Record<string, unknown>;
    return {
        reply:
            typeof obj.reply === "string"
                ? obj.reply.trim().slice(0, 8000)
                : "Updated.",
        skill_md:
            typeof obj.skill_md === "string" && obj.skill_md.trim()
                ? obj.skill_md.trim().slice(0, 120_000)
                : null,
        columns_config:
            args.type === "tabular" ? sanitizeColumns(obj.columns_config) : null,
        changes: Array.isArray(obj.changes)
            ? obj.changes
                  .map((c) => (typeof c === "string" ? c.trim().slice(0, 400) : ""))
                  .filter(Boolean)
                  .slice(0, 20)
            : [],
        notes:
            typeof obj.notes === "string" && obj.notes.trim()
                ? obj.notes.trim().slice(0, 2000)
                : null,
    };
}
