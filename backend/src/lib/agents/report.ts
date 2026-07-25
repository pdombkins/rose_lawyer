/**
 * Run completion report.
 *
 * Two artefacts come out of a completed run:
 *   1. the output — the work product the last productive steps produced;
 *   2. this report — the audit trail: every step, what it was asked to do,
 *      what it reasoned, what sources it touched, the senior partner's
 *      adjudication against the acceptance criteria, how many rework rounds
 *      it took, and how much of the result is inference rather than sourced
 *      fact.
 *
 * The report is assembled from persisted data only (agent_steps rows and
 * their event digests) — no extra LLM call — so it cannot itself hallucinate.
 */

import type {
    InferenceLevel,
    PartnerReview,
} from "./partnerReview";
import type { WorkflowBlueprint } from "../workflows/blueprint";

export type StepSources = {
    playbooks: string[];
    documents: string[];
    knowledge_searches: string[];
    citations_checked: string[];
    documents_created: string[];
};

export type ReportStep = {
    position: number;
    role: string;
    name: string;
    objective: string;
    depends_on: number[];
    status: string;
    attempt: number;
    instruction: string;
    output_text: string | null;
    /** The model's own reasoning trace for this step, in order. */
    reasoning: string[];
    sources: StepSources;
    reviews: PartnerReview[];
    inference: InferenceLevel | null;
    started_at: string | null;
    finished_at: string | null;
};

export type RunReport = {
    version: 1;
    run_id: string;
    title: string;
    request: string;
    status: string;
    model: string | null;
    workflow_id: string | null;
    started_at: string | null;
    finished_at: string | null;
    /** Overall inference level = the worst level any accepted step carried. */
    overall_inference: InferenceLevel | null;
    /** Steps the senior partner sent back at least once. */
    reworked_positions: number[];
    /** Steps that were passed through without a completed review. */
    unreviewed_positions: number[];
    preflight: unknown;
    blueprint_summary: string | null;
    silent_failure_overview: WorkflowBlueprint["silent_failure_overview"] | null;
    steps: ReportStep[];
};

type StepRow = {
    position: number;
    depends_on: number[] | null;
    role: string;
    instruction: string;
    status: string;
    output_text: string | null;
    output: unknown;
    review: unknown;
    attempt: number | null;
    started_at: string | null;
    finished_at: string | null;
};

const INFERENCE_ORDER: Record<InferenceLevel, number> = {
    verbatim: 0,
    low: 1,
    moderate: 2,
    high: 3,
};

function eventsOf(output: unknown): Record<string, unknown>[] {
    if (
        output &&
        typeof output === "object" &&
        Array.isArray((output as { events?: unknown }).events)
    ) {
        return (output as { events: unknown[] }).events as Record<
            string,
            unknown
        >[];
    }
    return [];
}

/** Reasoning traces the model emitted while working the step. */
export function reasoningOf(output: unknown): string[] {
    return eventsOf(output)
        .filter((e) => e.type === "reasoning" && typeof e.text === "string")
        .map((e) => (e.text as string).trim())
        .filter(Boolean);
}

export function sourcesOf(output: unknown): StepSources {
    const playbooks = new Set<string>();
    const documents = new Set<string>();
    const created = new Set<string>();
    const citations = new Set<string>();
    const knowledgeSearches: string[] = [];

    for (const ev of eventsOf(output)) {
        const type = ev.type as string | undefined;
        if (type === "playbook_reviewed" && typeof ev.name === "string") {
            playbooks.add(ev.name);
        } else if (type === "playbook_listed" && Array.isArray(ev.names)) {
            for (const n of ev.names as unknown[])
                if (typeof n === "string") playbooks.add(n);
        } else if (
            (type === "doc_read" || type === "doc_find") &&
            typeof ev.filename === "string"
        ) {
            documents.add(ev.filename);
        } else if (type === "knowledge_search" && typeof ev.query === "string") {
            const hits = typeof ev.hits === "number" ? ev.hits : 0;
            knowledgeSearches.push(`${ev.query} (${hits})`);
        } else if (
            (type === "doc_created" || type === "doc_generated") &&
            typeof ev.filename === "string"
        ) {
            created.add(ev.filename);
        } else if (
            (type === "citation_verified" || type === "citation_checked") &&
            typeof ev.citation === "string"
        ) {
            citations.add(
                `${ev.citation}${typeof ev.status === "string" ? ` — ${ev.status}` : ""}`,
            );
        }
    }
    return {
        playbooks: [...playbooks],
        documents: [...documents],
        knowledge_searches: knowledgeSearches,
        citations_checked: [...citations],
        documents_created: [...created],
    };
}

export function reviewsOf(review: unknown): PartnerReview[] {
    if (Array.isArray(review)) return review as PartnerReview[];
    if (review && typeof review === "object") return [review as PartnerReview];
    return [];
}

export function buildRunReport(args: {
    run: {
        id: string;
        title: string | null;
        request: string;
        status: string;
        model: string | null;
        workflow_id: string | null;
        started_at: string | null;
        finished_at: string | null;
        blueprint: unknown;
        preflight: unknown;
    };
    steps: StepRow[];
}): RunReport {
    const blueprint =
        args.run.blueprint && typeof args.run.blueprint === "object"
            ? (args.run.blueprint as WorkflowBlueprint)
            : null;
    const blueprintByPosition = new Map(
        (blueprint?.steps ?? []).map((s) => [s.position, s]),
    );

    const steps: ReportStep[] = args.steps
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => {
            const bp = blueprintByPosition.get(s.position);
            const reviews = reviewsOf(s.review);
            const last = reviews[reviews.length - 1];
            return {
                position: s.position,
                role: s.role,
                name: bp?.name ?? `Step ${s.position}`,
                objective:
                    bp?.objective ?? s.instruction.split("\n")[0].slice(0, 300),
                depends_on: s.depends_on ?? [],
                status: s.status,
                attempt: s.attempt ?? 1,
                instruction: s.instruction,
                output_text: s.output_text,
                reasoning: reasoningOf(s.output),
                sources: sourcesOf(s.output),
                reviews,
                inference: last?.inference?.level ?? null,
            started_at: s.started_at,
                finished_at: s.finished_at,
            };
        });

    let overall: InferenceLevel | null = null;
    for (const s of steps) {
        if (!s.inference) continue;
        if (!overall || INFERENCE_ORDER[s.inference] > INFERENCE_ORDER[overall]) {
            overall = s.inference;
        }
    }

    return {
        version: 1,
        run_id: args.run.id,
        title: args.run.title ?? args.run.request.slice(0, 120),
        request: args.run.request,
        status: args.run.status,
        model: args.run.model,
        workflow_id: args.run.workflow_id,
        started_at: args.run.started_at,
        finished_at: args.run.finished_at,
        overall_inference: overall,
        reworked_positions: steps
            .filter((s) => s.reviews.some((r) => r.decision === "rework"))
            .map((s) => s.position),
        unreviewed_positions: steps
            .filter(
                (s) =>
                    s.status === "completed" &&
                    (s.reviews.length === 0 ||
                        s.reviews.some((r) => r.degraded)),
            )
            .map((s) => s.position),
        preflight: args.run.preflight ?? null,
        blueprint_summary: blueprint?.summary ?? null,
        silent_failure_overview: blueprint?.silent_failure_overview ?? null,
        steps,
    };
}

// ---------------------------------------------------------------------------
// Markdown rendering — used by the Export action and the report download.
// ---------------------------------------------------------------------------

const INFERENCE_LABEL: Record<InferenceLevel, string> = {
    verbatim: "Verbatim — operative content quoted or clause-referenced throughout",
    low: "Low — mostly sourced, minor connective reasoning",
    moderate: "Moderate — meaningful synthesis or gap-filling on top of the sources",
    high: "High — substantially the model's own construction",
};

export function renderReportMarkdown(report: RunReport): string {
    const lines: string[] = [
        `# ${report.title} — process report`,
        "",
        `**Status:** ${report.status}  `,
        `**Model:** ${report.model ?? "default"}  `,
        report.started_at
            ? `**Started:** ${new Date(report.started_at).toLocaleString()}  `
            : "",
        report.finished_at
            ? `**Finished:** ${new Date(report.finished_at).toLocaleString()}  `
            : "",
        report.overall_inference
            ? `**Overall inference:** ${INFERENCE_LABEL[report.overall_inference]}`
            : "",
        "",
        `## Request`,
        "",
        report.request,
        "",
    ];

    if (report.blueprint_summary) {
        lines.push("## What this workflow does", "", report.blueprint_summary, "");
    }

    if (report.silent_failure_overview) {
        const o = report.silent_failure_overview;
        lines.push(
            "## Silent AI failure exposure",
            "",
            `Overall risk: **${o.overall_risk}**`,
            "",
        );
        for (const h of o.hotspots) {
            lines.push(
                `- **Step ${h.position} — ${h.step_name}** (${h.risk}): ${h.why}${
                    h.mitigation ? ` _Mitigation:_ ${h.mitigation}` : ""
                }`,
            );
        }
        if (o.notes) lines.push("", o.notes);
        lines.push("");
    }

    if (report.reworked_positions.length) {
        lines.push(
            `> The senior-partner review sent step${report.reworked_positions.length > 1 ? "s" : ""} ${report.reworked_positions.join(", ")} back for re-processing before accepting.`,
            "",
        );
    }
    if (report.unreviewed_positions.length) {
        lines.push(
            `> ⚠ Step${report.unreviewed_positions.length > 1 ? "s" : ""} ${report.unreviewed_positions.join(", ")} completed without a full senior-partner review. Check ${report.unreviewed_positions.length > 1 ? "them" : "it"} manually.`,
            "",
        );
    }

    lines.push("## Steps", "");
    for (const s of report.steps) {
        lines.push(
            `### Step ${s.position} — ${s.name} (${s.role})`,
            "",
            `**Objective:** ${s.objective}  `,
            `**Status:** ${s.status}${s.attempt > 1 ? ` (accepted on attempt ${s.attempt})` : ""}  `,
            s.depends_on.length
                ? `**Depends on:** step ${s.depends_on.join(", ")}  `
                : "",
            s.inference ? `**Inference:** ${INFERENCE_LABEL[s.inference]}` : "",
            "",
        );

        const src = s.sources;
        const srcLines = [
            src.documents.length ? `- Documents read: ${src.documents.join("; ")}` : "",
            src.playbooks.length ? `- Playbooks: ${src.playbooks.join("; ")}` : "",
            src.knowledge_searches.length
                ? `- Knowledge searches: ${src.knowledge_searches.join("; ")}`
                : "",
            src.citations_checked.length
                ? `- Citations checked: ${src.citations_checked.join("; ")}`
                : "",
            src.documents_created.length
                ? `- Documents produced: ${src.documents_created.join("; ")}`
                : "",
        ].filter(Boolean);
        if (srcLines.length) {
            lines.push("**Sources relied on**", "", ...srcLines, "");
        } else {
            lines.push(
                "**Sources relied on:** none recorded — this step reasoned from the run context alone.",
                "",
            );
        }

        if (s.reasoning.length) {
            lines.push("**Reasoning**", "");
            for (const r of s.reasoning) lines.push(`> ${r.replaceAll("\n", "\n> ")}`, "");
        }

        for (const review of s.reviews) {
            lines.push(
                `**Senior-partner review (attempt ${review.attempt}) — ${review.decision === "accept" ? "accepted" : "sent back"}**`,
                "",
                review.reason,
                "",
            );
            for (const c of review.criteria) {
                lines.push(
                    `- \`${c.id}\` **${c.verdict.replaceAll("_", " ")}** — ${c.criterion || ""}${c.reason ? ` _${c.reason}_` : ""}`,
                );
            }
            if (review.inference.examples.length) {
                lines.push(
                    "",
                    `Inferential statements flagged: ${review.inference.examples.join("; ")}`,
                );
            }
            if (review.rework_instruction) {
                lines.push("", `Rework instruction: ${review.rework_instruction}`);
            }
            lines.push("");
        }

        if (s.output_text) {
            lines.push("**Output**", "", s.output_text, "");
        }
        lines.push("---", "");
    }

    return lines.filter((l) => l !== undefined).join("\n");
}

/** The work product: the outputs of steps nothing else depended on. */
export function renderRunOutput(report: RunReport): string {
    const dependedOn = new Set<number>();
    for (const s of report.steps) for (const d of s.depends_on) dependedOn.add(d);
    const terminal = report.steps.filter(
        (s) => !dependedOn.has(s.position) && s.output_text,
    );
    const chosen = terminal.length
        ? terminal
        : report.steps.filter((s) => s.output_text);
    return chosen
        .map((s) => `## ${s.name}\n\n${s.output_text}`)
        .join("\n\n");
}
