/**
 * Workflow blueprint — the structured spec behind a workflow.
 *
 * A workflow in Rose is authored as free-text instructions (`prompt_md`) or a
 * set of tabular columns. That's enough to run, but not enough to *inspect*:
 * a user picking a workflow off the shelf can't see what the steps are, what
 * each step is supposed to achieve, what it consumes and emits, how anyone
 * would know the output is good, or where an LLM is most likely to fail
 * silently (e.g. paraphrasing a limitation-of-liability clause instead of
 * extracting it verbatim).
 *
 * This module derives that spec once (one LLM call), caches it in
 * `workflow_blueprints` keyed by a hash of the workflow source, and exposes
 * it to:
 *   * the workflow detail page (process map + step cards + risk overview),
 *   * the pre-flight gate (re-assessed against the actual documents),
 *   * the agent planner (blueprint steps become plan steps),
 *   * the senior-partner reviewer (quality criteria become the rubric),
 *   * the completion report.
 *
 * The blueprint is descriptive, not authoritative: it never widens tool
 * access. Tool allowlists are still derived server-side from the role.
 */

import { createHash } from "node:crypto";
import { completeText, type UserApiKeys } from "../llm";
import { calculateCostAud } from "../pricing";
import { createServerSupabase } from "../supabase";
import { roleToolsets, type AgentPlan, type AgentRole } from "../agents/types";

type Db = ReturnType<typeof createServerSupabase>;

export type RiskLevel = "low" | "medium" | "high";

export type BlueprintIO = {
    /** Short label, e.g. "Executed lease (PDF)". */
    name: string;
    /** What it is and why the step needs it. */
    description: string;
    /** Where it comes from / goes to: "user upload", "step 2 output", … */
    source: string;
};

export type BlueprintCriterion = {
    id: string;
    /** Whether this gates the step's inputs or its outputs. */
    applies_to: "input" | "output";
    /** A testable statement — the senior partner adjudicates against this. */
    criterion: string;
    /** Why it matters (used in the report and in rework feedback). */
    why: string;
};

export type BlueprintStep = {
    position: number;
    depends_on: number[];
    role: AgentRole;
    name: string;
    objective: string;
    inputs: BlueprintIO[];
    outputs: BlueprintIO[];
    quality_criteria: BlueprintCriterion[];
    silent_failure: {
        risk: RiskLevel;
        /** Concrete ways this step can look right and be wrong. */
        modes: string[];
        /** What the step instruction does to reduce that. */
        mitigation: string;
    };
    /** How many senior-partner rework rounds this step may go through. */
    max_rework: number;
};

export type SilentFailureOverview = {
    overall_risk: RiskLevel;
    hotspots: {
        position: number;
        step_name: string;
        risk: RiskLevel;
        why: string;
        mitigation: string;
    }[];
    notes: string;
};

export type WorkflowBlueprint = {
    version: 1;
    summary: string;
    steps: BlueprintStep[];
    silent_failure_overview: SilentFailureOverview;
    generated_at: string;
    source_hash: string;
    /** True when the blueprint could not be derived and a stub is shown. */
    degraded?: boolean;
};

export type WorkflowSource = {
    id: string;
    title: string;
    type: "assistant" | "tabular";
    prompt_md: string | null;
    columns_config: unknown;
};

const MAX_STEPS = 8;
const MAX_REWORK_CEILING = 2;

// ---------------------------------------------------------------------------
// Hashing — a blueprint is only valid for the exact instructions it came from
// ---------------------------------------------------------------------------

export function workflowSourceHash(source: WorkflowSource): string {
    return createHash("sha256")
        .update(
            JSON.stringify({
                t: source.title,
                y: source.type,
                p: source.prompt_md ?? "",
                c: source.columns_config ?? null,
            }),
        )
        .digest("hex")
        .slice(0, 32);
}

// ---------------------------------------------------------------------------
// Prompting
// ---------------------------------------------------------------------------

const BLUEPRINT_SYSTEM_PROMPT = `You are the workflow analyst for Rose, an AI legal assistant used in Australian/NZ legal practice for research and teaching.

You are given a legal workflow written as free-text instructions (and, for tabular workflows, a list of extraction columns). Decompose it into an explicit, inspectable process.

For EVERY step you must state:
- name: a short imperative label (max 8 words).
- objective: one sentence — what this step must achieve. Not how.
- role: one of intake | research | drafting | review | verify.
    intake = characterise the matter, parties, jurisdiction and the input documents
    research = find and ground legal/factual material (read-only)
    drafting = produce or edit the work product
    review = test the work product against playbooks, policy and AU law
    verify = check citations exist and support the assertions made
- depends_on: positions of steps whose OUTPUT this step consumes. Steps that
  do not depend on each other will run in parallel, so only list real
  dependencies.
- inputs: each with name, description, and source ("user upload", "project
  documents", "step N output", "knowledge base", …).
- outputs: each with name, description, and source (the format/artefact, e.g.
  "markdown table", "Word document", "numbered findings list").
- quality_criteria: 2-5 TESTABLE statements a supervising senior partner could
  adjudicate an input or output against. Each has applies_to ("input" or
  "output"), criterion, and why. Criteria must be checkable from the artefact
  itself — "every extracted clause is quoted verbatim with its clause number"
  is testable; "the analysis is high quality" is not.
- silent_failure: how this step can look correct and be wrong.
    risk: low | medium | high
    modes: 1-4 concrete failure modes phrased as observable symptoms.
    mitigation: what the step should do to reduce it.
- max_rework: 0, 1 or 2 — how many times it is worth sending this step back
  for re-processing before escalating to the human.

SILENT AI FAILURE — this is the point of the exercise. A silent failure is an
output that is fluent, plausible and confidently wrong, with nothing on the
face of it to signal the error. In legal work the recurring ones are:
- summarising or paraphrasing an operative clause instead of extracting it
  verbatim, losing carve-outs, provisos, thresholds and defined-term links;
- averaging across documents so a single non-conforming instrument disappears;
- silently treating "not found" as "not applicable" (or vice versa);
- resolving a defined term by its ordinary meaning rather than the contract's;
- inferring an obligation from a heading or recital rather than the operative
  provision;
- interpolating a plausible date, party name, monetary threshold or notice
  period that is not in the source;
- citing a real case for a proposition it does not stand for;
- applying the wrong Australian jurisdiction's statute where the states differ.
Steps that ask for a "summary", "overview", "assessment" or "key points" of
operative legal text are HIGH risk. Steps that extract verbatim with a
citation, or that verify against a source, are lower risk.

Then give silent_failure_overview across the whole workflow: overall_risk,
hotspots (the steps most exposed, with why + mitigation), and notes.

Rules:
- Between 2 and ${MAX_STEPS} steps. Use the fewest that genuinely fit.
- Steps must reflect what the instructions ACTUALLY say. Do not invent scope.
- Australian law context; AGLC4 citation format.
- Be specific to this workflow. Generic boilerplate is a failed answer.

Respond with ONLY a JSON object, no markdown fences:
{"summary":"<2-3 sentence plain-English description of what this workflow does>",
 "steps":[{"position":1,"depends_on":[],"role":"intake","name":"…","objective":"…",
   "inputs":[{"name":"…","description":"…","source":"…"}],
   "outputs":[{"name":"…","description":"…","source":"…"}],
   "quality_criteria":[{"applies_to":"output","criterion":"…","why":"…"}],
   "silent_failure":{"risk":"medium","modes":["…"],"mitigation":"…"},
   "max_rework":1}],
 "silent_failure_overview":{"overall_risk":"medium",
   "hotspots":[{"position":2,"step_name":"…","risk":"high","why":"…","mitigation":"…"}],
   "notes":"…"}}`;

function describeWorkflow(source: WorkflowSource): string {
    const parts: string[] = [
        `WORKFLOW TITLE: ${source.title}`,
        `WORKFLOW TYPE: ${source.type}`,
    ];
    if (source.prompt_md?.trim()) {
        parts.push(`INSTRUCTIONS:\n${source.prompt_md.trim().slice(0, 40_000)}`);
    }
    const columns = Array.isArray(source.columns_config)
        ? (source.columns_config as Record<string, unknown>[])
        : [];
    if (columns.length) {
        parts.push(
            `EXTRACTION COLUMNS (each is applied to every document independently):\n${columns
                .map(
                    (c, i) =>
                        `${i + 1}. ${String(c.name ?? "Untitled")} [${String(
                            c.format ?? c.type ?? "text",
                        )}] — ${String(c.prompt ?? "")}`,
                )
                .join("\n")
                .slice(0, 20_000)}`,
        );
    }
    if (!source.prompt_md?.trim() && columns.length === 0) {
        parts.push(
            "INSTRUCTIONS: (none supplied — describe the minimal sensible process for a workflow with this title and flag the missing definition as a high silent-failure risk).",
        );
    }
    return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Sanitising — model output is never trusted structurally
// ---------------------------------------------------------------------------

function str(v: unknown, max = 600): string {
    return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function risk(v: unknown): RiskLevel {
    return v === "high" || v === "medium" || v === "low" ? v : "medium";
}

function isRole(v: unknown): v is AgentRole {
    return (
        v === "intake" ||
        v === "research" ||
        v === "drafting" ||
        v === "review" ||
        v === "verify"
    );
}

function ioList(v: unknown, fallbackSource: string): BlueprintIO[] {
    if (!Array.isArray(v)) return [];
    return v
        .map((item): BlueprintIO | null => {
            if (!item || typeof item !== "object") return null;
            const r = item as Record<string, unknown>;
            const name = str(r.name, 160);
            if (!name) return null;
            return {
                name,
                description: str(r.description, 600),
                source: str(r.source, 160) || fallbackSource,
            };
        })
        .filter((x): x is BlueprintIO => !!x)
        .slice(0, 8);
}

function criteria(v: unknown, stepPosition: number): BlueprintCriterion[] {
    if (!Array.isArray(v)) return [];
    return v
        .map((item, i): BlueprintCriterion | null => {
            if (!item || typeof item !== "object") return null;
            const r = item as Record<string, unknown>;
            const criterion = str(r.criterion, 600);
            if (!criterion) return null;
            return {
                id: `S${stepPosition}-Q${i + 1}`,
                applies_to: r.applies_to === "input" ? "input" : "output",
                criterion,
                why: str(r.why, 400),
            };
        })
        .filter((x): x is BlueprintCriterion => !!x)
        .slice(0, 6);
}

export function sanitizeBlueprint(
    raw: unknown,
    source: WorkflowSource,
    sourceHash: string,
): WorkflowBlueprint {
    const obj =
        raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const rawSteps = Array.isArray(obj.steps) ? obj.steps : [];
    const steps: BlueprintStep[] = [];

    for (const s of rawSteps) {
        if (!s || typeof s !== "object") continue;
        const r = s as Record<string, unknown>;
        const objective = str(r.objective, 1200);
        const name = str(r.name, 120) || objective.slice(0, 60);
        if (!name && !objective) continue;
        const position = steps.length + 1;
        const dependsRaw = Array.isArray(r.depends_on) ? r.depends_on : [];
        const depends = [
            ...new Set(
                dependsRaw
                    .map((d) => (typeof d === "number" ? Math.trunc(d) : NaN))
                    .filter((d) => Number.isFinite(d) && d >= 1 && d < position),
            ),
        ];
        const sf =
            r.silent_failure && typeof r.silent_failure === "object"
                ? (r.silent_failure as Record<string, unknown>)
                : {};
        steps.push({
            position,
            depends_on: depends,
            role: isRole(r.role) ? r.role : "research",
            name,
            objective: objective || name,
            inputs: ioList(r.inputs, "prior step / user input"),
            outputs: ioList(r.outputs, "step output"),
            quality_criteria: criteria(r.quality_criteria, position),
            silent_failure: {
                risk: risk(sf.risk),
                modes: Array.isArray(sf.modes)
                    ? sf.modes
                          .map((m) => str(m, 400))
                          .filter(Boolean)
                          .slice(0, 5)
                    : [],
                mitigation: str(sf.mitigation, 800),
            },
            max_rework: Math.max(
                0,
                Math.min(
                    MAX_REWORK_CEILING,
                    typeof r.max_rework === "number"
                        ? Math.trunc(r.max_rework)
                        : 1,
                ),
            ),
        });
        if (steps.length >= MAX_STEPS) break;
    }

    const overviewRaw =
        obj.silent_failure_overview &&
        typeof obj.silent_failure_overview === "object"
            ? (obj.silent_failure_overview as Record<string, unknown>)
            : {};
    const byPosition = new Map(steps.map((s) => [s.position, s]));
    const hotspots = (
        Array.isArray(overviewRaw.hotspots) ? overviewRaw.hotspots : []
    )
        .map((h) => {
            if (!h || typeof h !== "object") return null;
            const r = h as Record<string, unknown>;
            const position =
                typeof r.position === "number" ? Math.trunc(r.position) : 0;
            const step = byPosition.get(position);
            if (!step) return null;
            return {
                position,
                step_name: str(r.step_name, 120) || step.name,
                risk: risk(r.risk),
                why: str(r.why, 800),
                mitigation: str(r.mitigation, 800),
            };
        })
        .filter((x): x is SilentFailureOverview["hotspots"][number] => !!x)
        .slice(0, MAX_STEPS);

    // If the model gave no hotspots, derive them from the per-step risks so
    // the overview is never silently empty for a risky workflow.
    const derived =
        hotspots.length > 0
            ? hotspots
            : steps
                  .filter((s) => s.silent_failure.risk !== "low")
                  .map((s) => ({
                      position: s.position,
                      step_name: s.name,
                      risk: s.silent_failure.risk,
                      why:
                          s.silent_failure.modes[0] ??
                          "This step transforms legal text, so an error can be fluent and undetectable on its face.",
                      mitigation: s.silent_failure.mitigation,
                  }));

    const worst: RiskLevel = derived.some((h) => h.risk === "high")
        ? "high"
        : derived.some((h) => h.risk === "medium")
          ? "medium"
          : "low";

    return {
        version: 1,
        summary:
            str(obj.summary, 1500) ||
            `Runs the "${source.title}" workflow over the documents you attach.`,
        steps: steps.length > 0 ? steps : [fallbackStep(source)],
        silent_failure_overview: {
            overall_risk: risk(overviewRaw.overall_risk ?? worst),
            hotspots: derived,
            notes: str(overviewRaw.notes, 2000),
        },
        generated_at: new Date().toISOString(),
        source_hash: sourceHash,
    };
}

function fallbackStep(source: WorkflowSource): BlueprintStep {
    return {
        position: 1,
        depends_on: [],
        role: source.type === "tabular" ? "research" : "drafting",
        name: `Run ${source.title}`,
        objective: `Carry out the "${source.title}" workflow over the attached documents, following its written instructions.`,
        inputs: [
            {
                name: "Attached documents",
                description: "The documents selected for this run.",
                source: "user upload / project documents",
            },
        ],
        outputs: [
            {
                name: "Workflow output",
                description: "The work product described by the instructions.",
                source: "step output",
            },
        ],
        quality_criteria: [
            {
                id: "S1-Q1",
                applies_to: "output",
                criterion:
                    "Every factual statement is traceable to a specific passage in an attached document, quoted or clause-referenced.",
                why: "Untraceable statements are the primary vector for silent AI failure.",
            },
        ],
        silent_failure: {
            risk: "high",
            modes: [
                "The workflow has no explicit step definition, so the model chooses its own approach and any drift is invisible.",
            ],
            mitigation:
                "Define the workflow's steps explicitly, then regenerate this blueprint.",
        },
        max_rework: 1,
    };
}

// ---------------------------------------------------------------------------
// Generation + cache
// ---------------------------------------------------------------------------

async function recordBlueprintSpend(
    db: Db,
    userId: string,
    model: string,
    promptChars: number,
    outputChars: number,
): Promise<void> {
    try {
        const cost = await calculateCostAud(
            model,
            Math.ceil(promptChars / 4),
            Math.ceil(outputChars / 4),
        );
        await db.from("query_costs").insert({
            user_id: userId,
            chat_id: null,
            project_id: null,
            model: cost.model,
            input_tokens: cost.inputTokens,
            output_tokens: cost.outputTokens,
            cost_usd: cost.costUsd,
            cost_aud: cost.costAud,
            aud_rate: cost.audRate,
            source: "workflow_blueprint",
        });
    } catch (err) {
        console.error("[blueprint] failed to record spend:", err);
    }
}

export function parseJsonObject(text: string): unknown {
    const cleaned = text
        .trim()
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/, "")
        .trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        // Models occasionally wrap the object in prose — take the outermost
        // brace-delimited span and try again before giving up.
        const first = cleaned.indexOf("{");
        const last = cleaned.lastIndexOf("}");
        if (first >= 0 && last > first) {
            try {
                return JSON.parse(cleaned.slice(first, last + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
}

export async function generateBlueprint(args: {
    db: Db;
    userId: string;
    source: WorkflowSource;
    model: string;
    apiKeys?: UserApiKeys;
}): Promise<WorkflowBlueprint> {
    const hash = workflowSourceHash(args.source);
    const user = describeWorkflow(args.source);
    const text = await completeText({
        model: args.model,
        systemPrompt: BLUEPRINT_SYSTEM_PROMPT,
        user,
        maxTokens: 6000,
        apiKeys: args.apiKeys,
    });
    void recordBlueprintSpend(
        args.db,
        args.userId,
        args.model,
        BLUEPRINT_SYSTEM_PROMPT.length + user.length,
        text.length,
    );
    const parsed = parseJsonObject(text);
    const blueprint = sanitizeBlueprint(parsed, args.source, hash);
    if (!parsed) blueprint.degraded = true;
    return blueprint;
}

export async function readCachedBlueprint(
    db: Db,
    workflowId: string,
    sourceHash: string,
): Promise<WorkflowBlueprint | null> {
    const { data } = await db
        .from("workflow_blueprints")
        .select("blueprint, source_hash")
        .eq("workflow_id", workflowId)
        .maybeSingle();
    const row = data as
        | { blueprint?: unknown; source_hash?: string }
        | null;
    if (!row?.blueprint || row.source_hash !== sourceHash) return null;
    return row.blueprint as WorkflowBlueprint;
}

export async function writeCachedBlueprint(
    db: Db,
    args: {
        workflowId: string;
        ownerId: string | null;
        blueprint: WorkflowBlueprint;
        sourceHash: string;
        model: string;
    },
): Promise<void> {
    await db.from("workflow_blueprints").upsert(
        {
            workflow_id: args.workflowId,
            owner_id: args.ownerId,
            blueprint: args.blueprint,
            source_hash: args.sourceHash,
            model: args.model,
            generated_at: new Date().toISOString(),
        },
        { onConflict: "workflow_id" },
    );
}

/**
 * Cached read-through. `force` regenerates even when the cache is warm —
 * used by the "Regenerate" action on the workflow overview.
 */
export async function getOrCreateBlueprint(args: {
    db: Db;
    userId: string;
    ownerId: string | null;
    source: WorkflowSource;
    model: string;
    apiKeys?: UserApiKeys;
    force?: boolean;
}): Promise<{ blueprint: WorkflowBlueprint; cached: boolean }> {
    const hash = workflowSourceHash(args.source);
    if (!args.force) {
        const cached = await readCachedBlueprint(args.db, args.source.id, hash);
        if (cached) return { blueprint: cached, cached: true };
    }
    const blueprint = await generateBlueprint({
        db: args.db,
        userId: args.userId,
        source: args.source,
        model: args.model,
        apiKeys: args.apiKeys,
    });
    await writeCachedBlueprint(args.db, {
        workflowId: args.source.id,
        ownerId: args.ownerId,
        blueprint,
        sourceHash: hash,
        model: args.model,
    });
    return { blueprint, cached: false };
}

// ---------------------------------------------------------------------------
// Blueprint → executable plan
// ---------------------------------------------------------------------------

/**
 * Compose the step instruction the executing agent actually receives. The
 * blueprint's objective/inputs/outputs/criteria are inlined so the agent is
 * held to the same spec the user reviewed on the workflow page — and so the
 * senior-partner reviewer is grading against criteria the agent was told
 * about up front.
 */
export function stepInstruction(
    step: BlueprintStep,
    workflowInstructions: string | null,
): string {
    const parts: string[] = [
        `STEP ${step.position} — ${step.name}`,
        `OBJECTIVE: ${step.objective}`,
    ];
    if (step.inputs.length) {
        parts.push(
            `REQUIRED INPUTS:\n${step.inputs
                .map((i) => `- ${i.name} (from ${i.source}): ${i.description}`)
                .join("\n")}`,
        );
    }
    if (step.outputs.length) {
        parts.push(
            `REQUIRED OUTPUTS:\n${step.outputs
                .map((o) => `- ${o.name} (${o.source}): ${o.description}`)
                .join("\n")}`,
        );
    }
    if (step.quality_criteria.length) {
        parts.push(
            `ACCEPTANCE CRITERIA — a supervising senior partner will reject this step unless every one is met:\n${step.quality_criteria
                .map((c) => `- [${c.id}] (${c.applies_to}) ${c.criterion}`)
                .join("\n")}`,
        );
    }
    if (step.silent_failure.modes.length) {
        parts.push(
            `KNOWN FAILURE MODES for this step — actively guard against these:\n${step.silent_failure.modes
                .map((m) => `- ${m}`)
                .join("\n")}${
                step.silent_failure.mitigation
                    ? `\nMitigation: ${step.silent_failure.mitigation}`
                    : ""
            }`,
        );
    }
    parts.push(
        `EVIDENCE RULE: for every material statement, give the document and clause/section it comes from, and quote operative language verbatim rather than paraphrasing it. Where you cannot find something, say "not found in the provided documents" — never substitute a plausible value.`,
    );
    if (workflowInstructions?.trim()) {
        parts.push(
            `WORKFLOW INSTRUCTIONS (authoritative — the steps above implement these):\n${workflowInstructions
                .trim()
                .slice(0, 8000)}`,
        );
    }
    return parts.join("\n\n");
}

export function blueprintToPlan(
    blueprint: WorkflowBlueprint,
    title: string,
    workflowInstructions: string | null,
    jadeApproved: boolean,
): AgentPlan {
    const toolsets = roleToolsets(jadeApproved);
    return {
        title,
        steps: blueprint.steps.map((s) => ({
            position: s.position,
            depends_on: s.depends_on,
            role: s.role,
            instruction: stepInstruction(s, workflowInstructions).slice(0, 8000),
            tool_allowlist: toolsets[s.role],
        })),
    };
}
