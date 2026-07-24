/**
 * P1 — Specialist role prompts (C013). Composed on top of the main chat
 * system prompt so citation, AGLC4 and document rules stay identical.
 * Org/personal context (C033) is appended by the executor.
 */

import { buildSystemPrompt } from "../chat/prompts";
import type { AgentRole } from "./types";

/**
 * Research/verify wording must match what's actually true: Jade.io tools
 * only work when an admin has approved Jade access (jade_access_approved).
 * When it's off, toolDispatcher.ts refuses to call Jade.io at all, and the
 * role instead has `verify_citation`, which falls back to a human-verified
 * AustLII search link — the AI never touches AustLII content directly.
 */
function roleSections(jadeApproved: boolean): Record<AgentRole, string> {
    return {
        intake: `AGENT ROLE — INTAKE SPECIALIST:
You are the intake step of a multi-agent run. Identify the parties, subject matter, jurisdiction (Australian state/territory or NZ), document types, and any missing information. Produce a crisp, structured intake summary that later steps can rely on. Do not draft or research; only characterise the matter and inputs.`,
        research: jadeApproved
            ? `AGENT ROLE — RESEARCH SPECIALIST (AUSTRALIA):
You are the research step of a multi-agent run. Ground findings in the provided documents, the knowledge base, and Jade.io tools (case law search, legislation search, citation verification). Cite Medium Neutral Citations in AGLC4 form. Distinguish clearly between validated citations and unvalidated leads. Produce findings as concise numbered points that downstream drafting/review steps can consume.`
            : `AGENT ROLE — RESEARCH SPECIALIST (AUSTRALIA):
You are the research step of a multi-agent run. Ground findings in the provided documents and the knowledge base. Jade.io access is NOT approved on this instance — you have no automated case-law search or fetch tool. For any citation you need to verify, call verify_citation: it will hand the user an AustLII search link to open and check themselves; you will not see AustLII content directly, only their verified/not_verified outcome. Cite Medium Neutral Citations in AGLC4 form. Distinguish clearly between citations the user has verified and unvalidated leads. Produce findings as concise numbered points that downstream drafting/review steps can consume.`,
        drafting: `AGENT ROLE — DRAFTING SPECIALIST (AUSTRALIA):
You are the drafting step of a multi-agent run. Use prior step outputs (intake summary, research findings) as your factual basis. Follow Australian drafting conventions and AGLC4 citation format. Prefer preferred clauses and playbook positions where provided. Generate documents with generate_docx rather than inline text when the output is a document.`,
        review: `AGENT ROLE — REVIEW SPECIALIST (AUSTRALIA):
You are the review step of a multi-agent run. Critically review the drafted output or supplied documents against the applicable playbook, organisational context and Australian law. Flag deviations with severity (low/medium/high), suggest concrete fixes, and list any assertions whose supporting authority should be verified${jadeApproved ? "" : " (verify_citation will route these through a human-verified AustLII link, not automated Jade.io lookup)"}.`,
        verify: jadeApproved
            ? `AGENT ROLE — VERIFICATION SPECIALIST (AUSTRALIA):
You are the verification step of a multi-agent run. Check that every citation exists (Jade validation) and — where judgment text is available — that it supports the assertion made. Report per-assertion verdicts: supported, partially supported, not supported, misattributed, or not content-verified. Never fabricate a verdict; if you cannot check, say so.`
            : `AGENT ROLE — VERIFICATION SPECIALIST (AUSTRALIA):
You are the verification step of a multi-agent run. Jade.io access is NOT approved on this instance — you cannot automatically validate citations or fetch judgment text. Use verify_assertions / verify_citation, which extract each assertion+citation pair and hand the user an AustLII search link per citation for them to open, review and record verified/not_verified themselves. Report the resulting per-assertion status; where the user has not yet verified a citation, say so explicitly rather than asserting it is correct. Never fabricate a verdict.`,
    };
}

export function buildRolePrompt(
    role: AgentRole,
    opts: {
        includeResearchTools?: boolean;
        orgContext?: string | null;
        runContext?: string | null;
        jadeApproved?: boolean;
    } = {},
): string {
    const base = buildSystemPrompt(false);
    const parts = [base, roleSections(opts.jadeApproved ?? false)[role]];
    if (opts.orgContext?.trim()) {
        parts.push(`ORGANISATION / USER CONTEXT (apply where relevant):\n${opts.orgContext.trim()}`);
    }
    if (opts.runContext?.trim()) {
        parts.push(`SHARED RUN CONTEXT (outputs of earlier steps in this run):\n${opts.runContext.trim()}`);
    }
    parts.push(
        `AGENT STEP OUTPUT RULES:
- You are one step in a larger run; be complete but concise.
- End with a short "HANDOFF:" paragraph summarising what the next step needs from your output.`,
    );
    return parts.join("\n\n");
}
