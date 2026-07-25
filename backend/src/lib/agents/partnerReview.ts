/**
 * Senior-partner review gate.
 *
 * Every blueprint step declares testable acceptance criteria. After a step
 * produces its output, a separate "senior partner" pass adjudicates that
 * output against those criteria: it gives a verdict per criterion with
 * reasons, assesses how much of the output is inference rather than sourced
 * fact, and either accepts the work or sends it back with specific rework
 * instructions. The executor re-runs the step with that feedback appended,
 * up to the step's max_rework.
 *
 * Two deliberate design choices:
 *   * The reviewer never rewrites the work. It only adjudicates and explains.
 *     A reviewer that fixes things quietly is itself a silent failure.
 *   * The reviewer has no tools. It sees the step's instruction, criteria and
 *     output, plus the source excerpts the step reported using. It is asked
 *     to flag anything it cannot verify from that rather than assume it holds.
 */

import { completeText, type UserApiKeys } from "../llm";
import { calculateCostAud } from "../pricing";
import { createServerSupabase } from "../supabase";
import { parseJsonObject, type BlueprintStep } from "../workflows/blueprint";

type Db = ReturnType<typeof createServerSupabase>;

export type InferenceLevel = "verbatim" | "low" | "moderate" | "high";

export type CriterionVerdict = {
    id: string;
    criterion: string;
    verdict: "met" | "partially_met" | "not_met" | "cannot_assess";
    reason: string;
};

export type PartnerReview = {
    attempt: number;
    decision: "accept" | "rework";
    /** Plain-English reason for the overall decision. */
    reason: string;
    criteria: CriterionVerdict[];
    inference: {
        level: InferenceLevel;
        /** Specific statements that go beyond what the sources support. */
        examples: string[];
        note: string;
    };
    /** Present when decision === "rework": what the step must do differently. */
    rework_instruction: string | null;
    reviewed_at: string;
    /** True when the reviewer itself failed and the step was let through. */
    degraded?: boolean;
};

const REVIEW_SYSTEM_PROMPT = `You are a supervising senior partner in an Australian law firm reviewing one step of work produced by a junior (an AI agent) before it moves down the line.

You are given: the step's objective, its acceptance criteria, the instruction the junior was given, and the junior's output. You do NOT have the source documents in front of you — you have the junior's output and whatever it quoted or cited.

Adjudicate the output against EACH acceptance criterion:
- "met" — the output plainly satisfies it.
- "partially_met" — satisfied for some of the material but not all.
- "not_met" — it does not satisfy it.
- "cannot_assess" — the output does not give you enough to tell. Treat this as a defect, not a pass: work you cannot check is work you cannot rely on.

Then assess INFERENCE — how much of this output is the junior's own construction rather than something traceable to a source:
- "verbatim" — operative content is quoted or clause-referenced throughout.
- "low" — mostly sourced; minor connective reasoning.
- "moderate" — meaningful synthesis, characterisation or gap-filling on top of the sources.
- "high" — substantially the junior's own construction, or asserts specifics
  (dates, parties, thresholds, notice periods, holdings) with no visible source.
Give concrete examples of the inferential statements. Be exacting: a fluent
paraphrase of an operative clause IS inference, even when it reads as fact.

Then decide:
- "accept" — every criterion is met (or the only shortfalls are immaterial and you say why).
- "rework" — anything is not_met, or something material is cannot_assess, or inference is "high" where the criteria required sourced extraction.

If you decide rework, write rework_instruction as a direct, specific instruction to the junior — what to redo and how. Name the criterion. Do not rewrite the work yourself, and do not be vague ("be more thorough" is useless).

Every verdict needs a reason. Never approve on the basis that the output "looks comprehensive".

Respond with ONLY a JSON object, no markdown fences:
{"decision":"accept|rework",
 "reason":"<2-3 sentences>",
 "criteria":[{"id":"S1-Q1","verdict":"met|partially_met|not_met|cannot_assess","reason":"…"}],
 "inference":{"level":"verbatim|low|moderate|high","examples":["…"],"note":"…"},
 "rework_instruction":"<null when accepting>"}`;

function verdictOf(v: unknown): CriterionVerdict["verdict"] {
    return v === "met" ||
        v === "partially_met" ||
        v === "not_met" ||
        v === "cannot_assess"
        ? v
        : "cannot_assess";
}

function levelOf(v: unknown): InferenceLevel {
    return v === "verbatim" || v === "low" || v === "moderate" || v === "high"
        ? v
        : "moderate";
}

function buildReviewInput(args: {
    step: BlueprintStep;
    instruction: string;
    output: string;
    attempt: number;
    previousRework: string | null;
}): string {
    const parts = [
        `STEP ${args.step.position} — ${args.step.name} (${args.step.role})`,
        `OBJECTIVE: ${args.step.objective}`,
        args.step.outputs.length
            ? `EXPECTED OUTPUTS: ${args.step.outputs
                  .map((o) => `${o.name} — ${o.description}`)
                  .join("; ")}`
            : "",
        `ACCEPTANCE CRITERIA:\n${
            args.step.quality_criteria.length
                ? args.step.quality_criteria
                      .map((c) => `- [${c.id}] (${c.applies_to}) ${c.criterion} — why it matters: ${c.why}`)
                      .join("\n")
                : "- [S-GEN] (output) Every material statement is traceable to a specific passage in a source document, with operative language quoted verbatim rather than paraphrased."
        }`,
        args.step.silent_failure.modes.length
            ? `KNOWN FAILURE MODES to test for:\n${args.step.silent_failure.modes
                  .map((m) => `- ${m}`)
                  .join("\n")}`
            : "",
        args.attempt > 1 && args.previousRework
            ? `THIS IS ATTEMPT ${args.attempt}. You previously sent this back with:\n${args.previousRework}\nCheck specifically whether that has been addressed.`
            : "",
        `INSTRUCTION GIVEN TO THE JUNIOR:\n${args.instruction.slice(0, 6000)}`,
        `THE JUNIOR'S OUTPUT:\n${args.output.slice(0, 40_000)}`,
    ];
    return parts.filter(Boolean).join("\n\n");
}

export async function reviewStepOutput(args: {
    db: Db;
    userId: string;
    projectId: string | null;
    step: BlueprintStep;
    instruction: string;
    output: string;
    attempt: number;
    previousRework: string | null;
    model: string;
    apiKeys?: UserApiKeys;
}): Promise<PartnerReview> {
    const now = new Date().toISOString();

    // An empty output is a failure the reviewer doesn't need to be asked about.
    if (!args.output.trim()) {
        return {
            attempt: args.attempt,
            decision: "rework",
            reason: "The step produced no output.",
            criteria: args.step.quality_criteria.map((c) => ({
                id: c.id,
                criterion: c.criterion,
                verdict: "not_met" as const,
                reason: "No output was produced to assess.",
            })),
            inference: {
                level: "moderate",
                examples: [],
                note: "Not assessable — no output.",
            },
            rework_instruction:
                "Produce the step's required outputs in full, following the acceptance criteria.",
            reviewed_at: now,
        };
    }

    const user = buildReviewInput(args);
    let parsed: Record<string, unknown> | null = null;
    try {
        const text = await completeText({
            model: args.model,
            systemPrompt: REVIEW_SYSTEM_PROMPT,
            user,
            maxTokens: 3000,
            apiKeys: args.apiKeys,
        });
        const obj = parseJsonObject(text);
        parsed =
            obj && typeof obj === "object"
                ? (obj as Record<string, unknown>)
                : null;
        try {
            const cost = await calculateCostAud(
                args.model,
                Math.ceil((REVIEW_SYSTEM_PROMPT.length + user.length) / 4),
                Math.ceil(text.length / 4),
            );
            await args.db.from("query_costs").insert({
                user_id: args.userId,
                chat_id: null,
                project_id: args.projectId,
                model: cost.model,
                input_tokens: cost.inputTokens,
                output_tokens: cost.outputTokens,
                cost_usd: cost.costUsd,
                cost_aud: cost.costAud,
                aud_rate: cost.audRate,
                source: "partner_review",
            });
        } catch (err) {
            console.error("[partnerReview] failed to record spend:", err);
        }
    } catch (err) {
        console.error("[partnerReview] review call failed:", err);
    }

    if (!parsed) {
        // Reviewer unavailable — accept, but say loudly that the step was NOT
        // reviewed. Silently dropping the gate would be the exact failure mode
        // this feature exists to prevent.
        return {
            attempt: args.attempt,
            decision: "accept",
            reason:
                "The senior-partner review could not be completed for this step, so the output was passed through unreviewed. Check it manually before relying on it.",
            criteria: args.step.quality_criteria.map((c) => ({
                id: c.id,
                criterion: c.criterion,
                verdict: "cannot_assess" as const,
                reason: "Review unavailable.",
            })),
            inference: {
                level: "moderate",
                examples: [],
                note: "Not assessed — the review step did not complete.",
            },
            rework_instruction: null,
            reviewed_at: now,
            degraded: true,
        };
    }

    const criteriaById = new Map(
        args.step.quality_criteria.map((c) => [c.id, c.criterion]),
    );
    const criteria: CriterionVerdict[] = (
        Array.isArray(parsed.criteria) ? parsed.criteria : []
    )
        .map((c): CriterionVerdict | null => {
            if (!c || typeof c !== "object") return null;
            const r = c as Record<string, unknown>;
            const id = typeof r.id === "string" ? r.id : "";
            return {
                id: id || "S-GEN",
                criterion:
                    criteriaById.get(id) ??
                    (typeof r.criterion === "string" ? r.criterion : ""),
                verdict: verdictOf(r.verdict),
                reason:
                    typeof r.reason === "string"
                        ? r.reason.trim().slice(0, 1200)
                        : "",
            };
        })
        .filter((x): x is CriterionVerdict => !!x)
        .slice(0, 10);

    const inferenceRaw =
        parsed.inference && typeof parsed.inference === "object"
            ? (parsed.inference as Record<string, unknown>)
            : {};

    const reworkInstruction =
        typeof parsed.rework_instruction === "string" &&
        parsed.rework_instruction.trim()
            ? parsed.rework_instruction.trim().slice(0, 4000)
            : null;

    // The decision is derived, not taken on trust: a "accept" alongside an
    // unmet criterion is treated as rework.
    const modelDecision = parsed.decision === "rework" ? "rework" : "accept";
    const hasFailure = criteria.some((c) => c.verdict === "not_met");
    const decision: PartnerReview["decision"] =
        modelDecision === "rework" || hasFailure ? "rework" : "accept";

    return {
        attempt: args.attempt,
        decision,
        reason:
            typeof parsed.reason === "string"
                ? parsed.reason.trim().slice(0, 2000)
                : "",
        criteria,
        inference: {
            level: levelOf(inferenceRaw.level),
            examples: Array.isArray(inferenceRaw.examples)
                ? inferenceRaw.examples
                      .map((e) =>
                          typeof e === "string" ? e.trim().slice(0, 600) : "",
                      )
                      .filter(Boolean)
                      .slice(0, 6)
                : [],
            note:
                typeof inferenceRaw.note === "string"
                    ? inferenceRaw.note.trim().slice(0, 1500)
                    : "",
        },
        rework_instruction:
            decision === "rework"
                ? (reworkInstruction ??
                  `Address the criteria marked not met or unassessable, and quote the operative source text for each material statement.`)
                : null,
        reviewed_at: now,
    };
}

/** Feedback block appended to a step's instruction on re-processing. */
export function reworkPreamble(review: PartnerReview): string {
    const failed = review.criteria.filter(
        (c) => c.verdict === "not_met" || c.verdict === "partially_met" || c.verdict === "cannot_assess",
    );
    return [
        `SENIOR-PARTNER REWORK (attempt ${review.attempt + 1}) — your previous output was NOT accepted.`,
        `Reason: ${review.reason}`,
        failed.length
            ? `Criteria to fix:\n${failed
                  .map((c) => `- [${c.id}] ${c.verdict.replaceAll("_", " ")}: ${c.reason}`)
                  .join("\n")}`
            : "",
        review.inference.level === "high" || review.inference.level === "moderate"
            ? `Inference assessed as "${review.inference.level}". ${review.inference.note}${
                  review.inference.examples.length
                      ? ` Examples flagged: ${review.inference.examples.join("; ")}`
                      : ""
              }`
            : "",
        `What to do: ${review.rework_instruction ?? "Redo the step against the acceptance criteria."}`,
        `Produce the full output again, corrected. Do not merely describe the changes.`,
    ]
        .filter(Boolean)
        .join("\n\n");
}
