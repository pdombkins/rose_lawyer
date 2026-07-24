/**
 * P1 — Planner (C030). One LLM call turns a natural-language request into a
 * typed, editable plan. The plan is shown to the user for approval before
 * execution (unless it is a single read-only step).
 */

import { completeText, type UserApiKeys } from "../llm";
import { getJadeAccessApproved } from "../appSettings";
import {
    roleToolsets,
    type AgentPlan,
    type AgentRole,
    type PlanStep,
} from "./types";

/**
 * The planner's own description of what "research" can draw on must match
 * what's actually true: Jade.io is only live when an admin has approved it
 * (jade_access_approved); otherwise Rose falls back to AustLII manual
 * verification only (the user opens the link and verifies themselves).
 */
function buildPlannerPrompt(jadeApproved: boolean): string {
    const researchLine = jadeApproved
        ? "- research: legal/document research via knowledge base + Jade.io case law/legislation search (read-only)"
        : "- research: legal/document research via knowledge base + citation verification (read-only). Jade.io access is NOT currently approved on this instance — case-law lookups fall back to a human-verified AustLII search link, not automated Jade.io search.";
    const caseLawLine = jadeApproved
        ? "- Australian law context; Jade.io is the case-law source when citations need verifying; AGLC4 citations."
        : "- Australian law context; Jade.io access is not approved — citation verification falls back to AustLII, which the user must check themselves; AGLC4 citations.";

    return `You are the planning module of Rose, an AI legal assistant. Decompose the user's request into a short plan of specialist agent steps.

Available roles and their capabilities:
- intake: characterise the matter, parties, jurisdiction, inputs (read-only)
${researchLine}
- drafting: produce or edit documents (write-capable)
- review: review drafts/documents against playbooks and AU law (read-only)
- verify: validate citations and check they support assertions (read-only)

Rules:
- 1 to 6 steps. Use the fewest steps that genuinely fit the request.
- Steps that do not depend on each other should have disjoint depends_on so they can run in parallel.
- depends_on lists the positions (1-based) of prerequisite steps.
- Every instruction must be self-contained and specific to THIS request.
${caseLawLine}

Respond with ONLY a JSON object, no markdown fences:
{"title": "<short run title>", "steps": [{"position": 1, "depends_on": [], "role": "intake|research|drafting|review|verify", "instruction": "<what this step must do>"}]}`;
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

export function sanitizePlan(
    raw: unknown,
    fallbackTitle: string,
    jadeApproved: boolean,
): AgentPlan {
    const toolsets = roleToolsets(jadeApproved);
    const obj =
        raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const rawSteps = Array.isArray(obj.steps) ? obj.steps : [];
    const steps: PlanStep[] = [];
    for (const [i, s] of rawSteps.entries()) {
        if (!s || typeof s !== "object") continue;
        const step = s as Record<string, unknown>;
        const role = isRole(step.role) ? step.role : "research";
        const instruction =
            typeof step.instruction === "string" ? step.instruction.trim() : "";
        if (!instruction) continue;
        const position = steps.length + 1;
        const dependsRaw = Array.isArray(step.depends_on)
            ? step.depends_on
            : [];
        const depends = dependsRaw
            .map((d) => (typeof d === "number" ? Math.trunc(d) : NaN))
            .filter((d) => Number.isFinite(d) && d >= 1 && d < position);
        steps.push({
            position,
            depends_on: [...new Set(depends)],
            role,
            instruction: instruction.slice(0, 4000),
            // Tool allowlists are ALWAYS derived server-side from the role and
            // the live Jade-access toggle — never trusted from model output
            // (C013 guardrails).
            tool_allowlist: toolsets[role],
        });
        if (steps.length >= 6) break;
        void i;
    }
    if (steps.length === 0) {
        steps.push({
            position: 1,
            depends_on: [],
            role: "research",
            instruction: fallbackTitle,
            tool_allowlist: toolsets.research,
        });
    }
    const title =
        typeof obj.title === "string" && obj.title.trim()
            ? obj.title.trim().slice(0, 200)
            : fallbackTitle.slice(0, 200);
    return { title, steps };
}

export async function planRun(args: {
    request: string;
    model: string;
    apiKeys?: UserApiKeys;
}): Promise<AgentPlan> {
    const jadeApproved = await getJadeAccessApproved();
    const text = await completeText({
        model: args.model,
        systemPrompt: buildPlannerPrompt(jadeApproved),
        user: args.request,
        maxTokens: 2048,
        apiKeys: args.apiKeys,
    });
    let parsed: unknown = null;
    try {
        const jsonText = text
            .trim()
            .replace(/^```(?:json)?/i, "")
            .replace(/```$/, "")
            .trim();
        parsed = JSON.parse(jsonText);
    } catch {
        parsed = null;
    }
    return sanitizePlan(parsed, args.request.slice(0, 120), jadeApproved);
}
