/**
 * Pre-flight silent-AI-failure assessment.
 *
 * The blueprint's risk overview is written against the workflow in the
 * abstract. Once a user has picked a project and attached documents, the real
 * risk changes: a "summarise the indemnity position" step is a different
 * proposition against a 4-page NDA than against a 180-page project agreement
 * with a schedule of carve-outs, and a workflow that expects executed
 * contracts behaves very differently when handed a scanned image PDF with no
 * extractable text.
 *
 * So before anything runs we sample the actual documents, re-assess each
 * blueprint step against them, and — if anything comes back high risk — stop
 * and hand the decision to the user: continue anyway, or stop and edit the
 * workflow. Nothing executes until they choose.
 */

import { completeText, type UserApiKeys } from "../llm";
import { calculateCostAud } from "../pricing";
import { createServerSupabase } from "../supabase";
import { downloadFile } from "../storage";
import { attachActiveVersionPaths } from "../documentVersions";
import { extractDocumentMarkdown } from "../extractText";
import {
    parseJsonObject,
    type RiskLevel,
    type WorkflowBlueprint,
} from "./blueprint";

type Db = ReturnType<typeof createServerSupabase>;

export type PreflightFinding = {
    /** Blueprint step position this concerns, or 0 for workflow-wide. */
    position: number;
    step_name: string;
    risk: RiskLevel;
    /** What about THESE documents raises the risk. */
    issue: string;
    /** What the user should change — in the workflow, or in the inputs. */
    recommendation: string;
};

export type DocumentProbe = {
    document_id: string;
    filename: string;
    /** Rough size signal, in extracted characters. */
    chars: number;
    /** True when extraction produced effectively no text (scan / image PDF). */
    unreadable: boolean;
    note: string | null;
};

export type PreflightAssessment = {
    version: 1;
    overall_risk: RiskLevel;
    /** True when the user must explicitly decide before the run starts. */
    requires_confirmation: boolean;
    summary: string;
    findings: PreflightFinding[];
    documents: DocumentProbe[];
    assessed_at: string;
    /** Set once the user answers the gate. */
    decision?: "continue" | "stopped";
    decided_at?: string;
};

const MAX_DOCS = 12;
const SAMPLE_CHARS = 6000;
/** Below this many extracted characters a document is treated as unreadable. */
const UNREADABLE_THRESHOLD = 200;

const PREFLIGHT_SYSTEM_PROMPT = `You are the pre-flight risk reviewer for Rose, an AI legal assistant used in Australian legal practice and teaching.

A user is about to run a defined legal workflow over specific documents. You are given the workflow's step blueprint (each step's objective, inputs, outputs, acceptance criteria and known silent-failure modes) and a sample of the ACTUAL documents attached to this run.

Your job is to decide, for these documents specifically, whether any step is now at HIGH risk of silent AI failure — an output that reads as fluent, confident and plausible but is wrong, with nothing on its face to reveal the error.

Weigh in particular:
- Steps that ask for a summary / overview / assessment of operative legal text where the documents contain dense, heavily-qualified or cross-referenced provisions. Summarisation of such clauses loses provisos, carve-outs, thresholds and defined-term links — the model should have been asked to extract verbatim and then analyse.
- Documents whose text did not extract (scans, image PDFs, near-empty extractions): any step depending on them will confabulate rather than report an inability to read.
- Volume: a step asked to reason across many long documents at once will silently drop or average over the non-conforming one.
- Mismatch: documents that are not the type the step's inputs describe (e.g. the step expects executed agreements, the attachments are drafts, term sheets, or correspondence).
- Jurisdiction: Australian state/territory differences where the workflow assumes one regime.
- Steps that must find something and treat absence as absence — "not found" silently becoming "not applicable".

Be discriminating. Do NOT mark everything high. Reserve "high" for risks that would plausibly change a lawyer's answer and that the user could actually act on. If the inputs suit the workflow, say so and return an empty or low-risk finding list.

Respond with ONLY a JSON object, no markdown fences:
{"overall_risk":"low|medium|high",
 "summary":"<2-3 sentences: what you checked and the bottom line>",
 "findings":[{"position":<blueprint step position, or 0 for workflow-wide>,
   "step_name":"…","risk":"low|medium|high",
   "issue":"<what about THESE documents raises it>",
   "recommendation":"<the concrete change: edit step N to extract verbatim before analysing / attach the executed version / split into per-document runs / …>"}]}`;

// ---------------------------------------------------------------------------

async function probeDocuments(
    db: Db,
    documentIds: string[],
): Promise<{ probes: DocumentProbe[]; samples: string[] }> {
    if (documentIds.length === 0) return { probes: [], samples: [] };
    const { data } = await db
        .from("documents")
        .select("id, filename, file_type, storage_path, current_version_id")
        .in("id", documentIds.slice(0, MAX_DOCS));
    const rows = (data ?? []) as {
        id: string;
        filename?: string;
        file_type?: string;
        storage_path?: string;
        current_version_id?: string | null;
    }[];
    await attachActiveVersionPaths(db, rows);

    const probes: DocumentProbe[] = [];
    const samples: string[] = [];
    for (const doc of rows) {
        const filename = doc.filename?.trim() || "Untitled document";
        try {
            const path =
                typeof doc.storage_path === "string" ? doc.storage_path : "";
            const buf = path ? await downloadFile(path) : null;
            if (!buf) {
                probes.push({
                    document_id: doc.id,
                    filename,
                    chars: 0,
                    unreadable: true,
                    note: "Document file could not be retrieved from storage.",
                });
                continue;
            }
            const text = await extractDocumentMarkdown(buf, doc.file_type ?? "");
            const chars = text.trim().length;
            const unreadable = chars < UNREADABLE_THRESHOLD;
            probes.push({
                document_id: doc.id,
                filename,
                chars,
                unreadable,
                note: unreadable
                    ? "Almost no text extracted — likely a scan or image-only PDF."
                    : null,
            });
            samples.push(
                `--- ${filename} (${chars.toLocaleString()} characters extracted${
                    unreadable ? "; TEXT EXTRACTION ESSENTIALLY FAILED" : ""
                }) ---\n${text.slice(0, SAMPLE_CHARS)}`,
            );
        } catch (err) {
            probes.push({
                document_id: doc.id,
                filename,
                chars: 0,
                unreadable: true,
                note: `Extraction failed: ${
                    err instanceof Error ? err.message : "unknown error"
                }`,
            });
        }
    }
    return { probes, samples };
}

function describeBlueprint(blueprint: WorkflowBlueprint): string {
    return [
        `WORKFLOW SUMMARY: ${blueprint.summary}`,
        `BASELINE SILENT-FAILURE RISK: ${blueprint.silent_failure_overview.overall_risk}`,
        "STEPS:",
        ...blueprint.steps.map((s) =>
            [
                `Step ${s.position} — ${s.name} (${s.role}) [baseline risk: ${s.silent_failure.risk}]`,
                `  Objective: ${s.objective}`,
                s.inputs.length
                    ? `  Expects: ${s.inputs.map((i) => `${i.name} (${i.source})`).join("; ")}`
                    : "",
                s.outputs.length
                    ? `  Produces: ${s.outputs.map((o) => o.name).join("; ")}`
                    : "",
                s.quality_criteria.length
                    ? `  Must satisfy: ${s.quality_criteria.map((c) => c.criterion).join(" | ")}`
                    : "",
                s.silent_failure.modes.length
                    ? `  Known failure modes: ${s.silent_failure.modes.join(" | ")}`
                    : "",
            ]
                .filter(Boolean)
                .join("\n"),
        ),
    ].join("\n");
}

/** Deterministic findings we don't need (or want) an LLM to notice. */
function structuralFindings(
    probes: DocumentProbe[],
    blueprint: WorkflowBlueprint,
): PreflightFinding[] {
    const findings: PreflightFinding[] = [];
    const unreadable = probes.filter((p) => p.unreadable);
    if (unreadable.length > 0) {
        findings.push({
            position: 0,
            step_name: "Document intake",
            risk: "high",
            issue: `${unreadable.length} of ${probes.length} attached document${
                probes.length === 1 ? "" : "s"
            } produced little or no extractable text (${unreadable
                .map((p) => p.filename)
                .join(", ")}). Every step that relies on them will be reasoning from an empty or near-empty source, which typically produces confident, entirely fabricated output rather than an error.`,
            recommendation:
                "Replace these with text-based versions (or OCR them) before running, or remove them from the run.",
        });
    }
    if (probes.length === 0) {
        findings.push({
            position: 0,
            step_name: "Document intake",
            risk: "medium",
            issue: "No documents are attached to this run, so every step will work from the workflow instructions and your prompt alone.",
            recommendation:
                "Attach the source documents, or confirm this workflow is genuinely intended to run without them.",
        });
    }
    const totalChars = probes.reduce((sum, p) => sum + p.chars, 0);
    if (totalChars > 400_000) {
        findings.push({
            position: 0,
            step_name: "Volume",
            risk: "medium",
            issue: `The attached documents total roughly ${Math.round(
                totalChars / 1000,
            ).toLocaleString()}k characters. Steps that reason across all of them at once tend to average across documents, so a single non-conforming instrument can disappear without any signal.`,
            recommendation:
                "Consider splitting this into per-document runs, or adding a step that reports findings document-by-document before any cross-document synthesis.",
        });
    }
    // Surface the blueprint's own high-risk steps so the gate is never empty
    // just because the document probe found nothing notable.
    for (const hotspot of blueprint.silent_failure_overview.hotspots) {
        if (hotspot.risk !== "high") continue;
        findings.push({
            position: hotspot.position,
            step_name: hotspot.step_name,
            risk: "high",
            issue: hotspot.why,
            recommendation:
                hotspot.mitigation ||
                "Edit this step so it extracts the operative text verbatim before analysing it.",
        });
    }
    return findings;
}

function mergeFindings(
    structural: PreflightFinding[],
    model: PreflightFinding[],
): PreflightFinding[] {
    const seen = new Set<string>();
    const out: PreflightFinding[] = [];
    for (const f of [...structural, ...model]) {
        const key = `${f.position}|${f.issue.slice(0, 80).toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(f);
    }
    const order: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
    return out.sort((a, b) => order[a.risk] - order[b.risk]).slice(0, 12);
}

function parseFindings(
    raw: unknown,
    blueprint: WorkflowBlueprint,
): { findings: PreflightFinding[]; summary: string; risk: RiskLevel | null } {
    const obj =
        raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const names = new Map(blueprint.steps.map((s) => [s.position, s.name]));
    const findings = (Array.isArray(obj.findings) ? obj.findings : [])
        .map((f): PreflightFinding | null => {
            if (!f || typeof f !== "object") return null;
            const r = f as Record<string, unknown>;
            const issue =
                typeof r.issue === "string" ? r.issue.trim().slice(0, 1200) : "";
            if (!issue) return null;
            const position =
                typeof r.position === "number" ? Math.trunc(r.position) : 0;
            return {
                position: names.has(position) ? position : 0,
                step_name:
                    (typeof r.step_name === "string" && r.step_name.trim()) ||
                    names.get(position) ||
                    "Workflow-wide",
                risk:
                    r.risk === "high" || r.risk === "medium" || r.risk === "low"
                        ? r.risk
                        : "medium",
                issue,
                recommendation:
                    typeof r.recommendation === "string"
                        ? r.recommendation.trim().slice(0, 1200)
                        : "",
            };
        })
        .filter((x): x is PreflightFinding => !!x)
        .slice(0, 10);
    return {
        findings,
        summary:
            typeof obj.summary === "string" ? obj.summary.trim().slice(0, 1500) : "",
        risk:
            obj.overall_risk === "high" ||
            obj.overall_risk === "medium" ||
            obj.overall_risk === "low"
                ? obj.overall_risk
                : null,
    };
}

export async function runPreflight(args: {
    db: Db;
    userId: string;
    blueprint: WorkflowBlueprint;
    documentIds: string[];
    request: string;
    model: string;
    apiKeys?: UserApiKeys;
}): Promise<PreflightAssessment> {
    const { probes, samples } = await probeDocuments(args.db, args.documentIds);
    const structural = structuralFindings(probes, args.blueprint);

    let modelFindings: PreflightFinding[] = [];
    let modelSummary = "";
    let modelRisk: RiskLevel | null = null;
    try {
        const user = [
            describeBlueprint(args.blueprint),
            `USER REQUEST FOR THIS RUN:\n${args.request.slice(0, 4000)}`,
            probes.length
                ? `ATTACHED DOCUMENTS (${probes.length}):\n${probes
                      .map(
                          (p) =>
                              `- ${p.filename}: ${p.chars.toLocaleString()} chars${
                                  p.note ? ` — ${p.note}` : ""
                              }`,
                      )
                      .join("\n")}`
                : "ATTACHED DOCUMENTS: none",
            samples.length
                ? `DOCUMENT SAMPLES (first ${SAMPLE_CHARS} characters of each):\n\n${samples.join("\n\n")}`
                : "",
        ]
            .filter(Boolean)
            .join("\n\n");

        const text = await completeText({
            model: args.model,
            systemPrompt: PREFLIGHT_SYSTEM_PROMPT,
            user,
            maxTokens: 3000,
            apiKeys: args.apiKeys,
        });
        const parsed = parseFindings(parseJsonObject(text), args.blueprint);
        modelFindings = parsed.findings;
        modelSummary = parsed.summary;
        modelRisk = parsed.risk;

        try {
            const cost = await calculateCostAud(
                args.model,
                Math.ceil((PREFLIGHT_SYSTEM_PROMPT.length + user.length) / 4),
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
                source: "workflow_preflight",
            });
        } catch (err) {
            console.error("[preflight] failed to record spend:", err);
        }
    } catch (err) {
        console.error("[preflight] assessment failed:", err);
        modelSummary =
            "The automated pre-flight assessment could not complete, so only structural checks were applied. Treat the run's outputs with extra scrutiny.";
        modelRisk = "medium";
    }

    const findings = mergeFindings(structural, modelFindings);
    const highest: RiskLevel = findings.some((f) => f.risk === "high")
        ? "high"
        : findings.some((f) => f.risk === "medium")
          ? "medium"
          : "low";
    // The gate always respects the worst of (model verdict, structural checks).
    const order: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
    const overall: RiskLevel =
        modelRisk && order[modelRisk] > order[highest] ? modelRisk : highest;

    return {
        version: 1,
        overall_risk: overall,
        requires_confirmation: overall === "high",
        summary:
            modelSummary ||
            (findings.length === 0
                ? "The attached documents look well matched to this workflow's steps. No elevated silent-failure risk was identified."
                : "Review the findings below before running."),
        findings,
        documents: probes,
        assessed_at: new Date().toISOString(),
    };
}
