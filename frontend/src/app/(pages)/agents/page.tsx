"use client";

/**
 * P1 — Agents page (C013 orchestration, C030 plan approval + parallel runs).
 * List of runs, run creation, plan review/edit/approve, live step progress.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    AlertTriangle,
    Bot,
    Brain,
    Check,
    ChevronDown,
    ChevronRight,
    CircleDashed,
    Gavel,
    Loader2,
    Play,
    Plus,
    RotateCcw,
    Trash2,
    X,
} from "lucide-react";
import { useAuth } from "@/app/contexts/AuthContext";
import {
    approveAgentRun,
    cancelAgentRun,
    createAgentRun,
    decideAgentPreflight,
    getAgentRun,
    getAgentRunReport,
    exportOutput,
    getJadeAccessStatus,
    getLibrary,
    listAgentRuns,
    type AgentPlan,
    type AgentRunSummary,
    type AgentStepDetail,
    type InferenceLevel,
    type PartnerReview,
    type PreflightAssessment,
    type RunReport,
    type WorkflowBlueprint,
} from "@/app/lib/roseApi";
import type { Document } from "@/app/components/shared/types";
import { usePaginatedList } from "@/app/hooks/usePaginatedList";
import { LoadMoreSentinel } from "@/app/components/shared/LoadMoreSentinel";
import {
    WorkflowProcessMap,
    type StepRunStatus,
} from "@/app/components/workflows/WorkflowProcessMap";
import { PreflightGateBody } from "@/app/components/workflows/PreflightGate";

const ROLES = ["intake", "research", "drafting", "review", "verify"] as const;

// Per-role reference (mirrors backend agents/types.ts roleToolset()). Lists
// the specific sources each role can draw on, so it's clear what an agent
// may consult before a run is approved. `playbooks` flags roles that can use
// playbooks (drives the per-step "sources used" note).
//
// Jade.io's search/fetch tools only do anything when an admin has approved
// Jade access (BarNet written permission) — toolDispatcher.ts on the backend
// refuses to call Jade.io otherwise. So this list must reflect the *live*
// jadeAccessApproved setting, not assume Jade is always on: when it's off,
// every role instead falls back to AustLII manual verification (the user
// opens a search link and records the outcome themselves; the AI never
// fetches AustLII content).
function getRoleCapabilities(
    jadeApproved: boolean,
): Record<(typeof ROLES)[number], { blurb: string; playbooks: boolean; sources: string[] }> {
    const caseLawSources = jadeApproved
        ? ["Jade.io — case law", "Jade.io — legislation", "Jade.io — citation validation"]
        : ["AustLII — manual search link (user verifies, Jade access not approved)"];
    const citationValidationSource = jadeApproved
        ? "Jade.io — citation validation"
        : "AustLII — manual search link (user verifies)";
    const verifySources = jadeApproved
        ? ["Jade.io — citation validation", "Jade.io — document fetch", "Assertion checks (Jade.io)"]
        : ["AustLII — manual search link (user verifies)", "Assertion checks (AustLII manual verification only)"];

    return {
        intake: {
            blurb: "Characterises the matter, parties, jurisdiction and inputs (read-only).",
            playbooks: false,
            sources: ["Project & attached documents", "Matter list items"],
        },
        research: {
            blurb: "Researches the question across internal and Australian sources.",
            playbooks: true,
            sources: [
                "Knowledge base",
                "Saved clauses",
                "Playbooks",
                ...caseLawSources,
                "Project documents",
                "Tabular review data",
            ],
        },
        drafting: {
            blurb: "Produces or edits documents, grounded in your precedents.",
            playbooks: true,
            sources: [
                "Knowledge base",
                "Saved clauses",
                "Playbooks",
                "Project documents",
                "AGLC4 citation formatting",
            ],
        },
        review: {
            blurb: "Reviews a document against your playbooks and AU law.",
            playbooks: true,
            sources: [
                "Playbooks (reviews the document against them)",
                "Knowledge base",
                "Saved clauses",
                "Project documents",
                citationValidationSource,
            ],
        },
        verify: {
            blurb: "Validates citations and checks they support the assertions made.",
            playbooks: false,
            sources: ["Project documents", ...verifySources],
        },
    };
}

const STATUS_STYLES: Record<string, string> = {
    planning: "bg-amber-100 text-amber-800",
    awaiting_approval: "bg-blue-100 text-blue-800",
    running: "bg-indigo-100 text-indigo-800",
    completed: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-600",
    paused: "bg-gray-100 text-gray-600",
};

function StatusChip({ status }: { status: string }) {
    return (
        <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"}`}
        >
            {status.replaceAll("_", " ")}
        </span>
    );
}

function StepStatusIcon({ status }: { status: string }) {
    if (status === "completed")
        return <Check className="h-4 w-4 text-green-600" />;
    if (status === "running")
        return <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />;
    if (status === "failed") return <X className="h-4 w-4 text-red-600" />;
    if (status === "skipped")
        return <CircleDashed className="h-4 w-4 text-gray-400" />;
    return <CircleDashed className="h-4 w-4 text-gray-300" />;
}

// Whether a role can draw on playbooks — structural, not affected by the
// Jade-access toggle (unlike the case-law sources in getRoleCapabilities).
const ROLE_USES_PLAYBOOKS: Record<(typeof ROLES)[number], boolean> = {
    intake: false,
    research: true,
    drafting: true,
    review: true,
    verify: false,
};

function SourceRow({ label, items }: { label: string; items: string[] }) {
    if (items.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {label}
            </span>
            {items.map((it, i) => (
                <span
                    key={`${label}-${i}`}
                    className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                >
                    {it}
                </span>
            ))}
        </div>
    );
}

// Per-run transparency: what a step actually consulted.
function StepSources({
    sources,
    role,
}: {
    sources?: import("@/app/lib/roseApi").AgentStepSources;
    role: string;
}) {
    const playbooks = sources?.playbooks ?? [];
    const documents = sources?.documents ?? [];
    const searches = sources?.knowledge_searches ?? [];
    const canUsePlaybooks =
        ROLE_USES_PLAYBOOKS[role as (typeof ROLES)[number]];
    if (
        playbooks.length === 0 &&
        documents.length === 0 &&
        searches.length === 0
    ) {
        // Only note "no sources" for roles that could have used them.
        if (!canUsePlaybooks) return null;
        return (
            <p className="mb-2 text-[11px] text-gray-400">
                No playbooks or knowledge were consulted in this step.
            </p>
        );
    }
    return (
        <div className="mb-3 space-y-1.5 rounded-lg bg-gray-50 p-2.5">
            <p className="text-[11px] font-medium text-gray-500">
                Sources used in this step
            </p>
            <SourceRow label="Playbooks" items={playbooks} />
            <SourceRow label="Documents" items={documents} />
            <SourceRow label="Knowledge" items={searches} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Transparency panels — reasoning and the senior-partner adjudication.
// Both render expanded by default: the whole point is that the working is
// visible without anyone having to go looking for it.
// ---------------------------------------------------------------------------

const INFERENCE_STYLES: Record<
    InferenceLevel,
    { chip: string; label: string; blurb: string }
> = {
    verbatim: {
        chip: "bg-green-100 text-green-800",
        label: "Verbatim",
        blurb: "Operative content is quoted or clause-referenced throughout.",
    },
    low: {
        chip: "bg-green-100 text-green-800",
        label: "Low inference",
        blurb: "Mostly sourced, with minor connective reasoning.",
    },
    moderate: {
        chip: "bg-amber-100 text-amber-800",
        label: "Moderate inference",
        blurb: "Meaningful synthesis or gap-filling on top of the sources.",
    },
    high: {
        chip: "bg-red-100 text-red-700",
        label: "High inference",
        blurb: "Substantially the model's own construction — check it against the sources.",
    },
};

const VERDICT_STYLES: Record<string, string> = {
    met: "bg-green-100 text-green-800",
    partially_met: "bg-amber-100 text-amber-800",
    not_met: "bg-red-100 text-red-700",
    cannot_assess: "bg-gray-200 text-gray-700",
};

function StepReasoning({ reasoning }: { reasoning: string[] }) {
    if (reasoning.length === 0) return null;
    return (
        <div className="mb-3 rounded-lg border border-gray-100 bg-gray-50/70 p-2.5">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                <Brain className="h-3.5 w-3.5 text-gray-400" />
                Thinking
            </p>
            <div className="space-y-2">
                {reasoning.map((r, i) => (
                    <p
                        key={i}
                        className="whitespace-pre-wrap border-l-2 border-gray-200 pl-2.5 text-[12px] leading-relaxed text-gray-600"
                    >
                        {r}
                    </p>
                ))}
            </div>
        </div>
    );
}

function StepReviews({ reviews }: { reviews: PartnerReview[] }) {
    if (reviews.length === 0) return null;
    return (
        <div className="mb-3 space-y-2">
            {reviews.map((review, i) => (
                <div
                    key={i}
                    className={`rounded-lg border p-2.5 ${
                        review.decision === "accept"
                            ? "border-green-200 bg-green-50/50"
                            : "border-amber-200 bg-amber-50/50"
                    }`}
                >
                    <p className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-gray-700">
                        <Gavel className="h-3.5 w-3.5 text-gray-500" />
                        Senior partner review — attempt {review.attempt}
                        <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                review.decision === "accept"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-amber-100 text-amber-800"
                            }`}
                        >
                            {review.decision === "accept"
                                ? "accepted"
                                : "sent back"}
                        </span>
                        <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${INFERENCE_STYLES[review.inference.level].chip}`}
                            title={INFERENCE_STYLES[review.inference.level].blurb}
                        >
                            {INFERENCE_STYLES[review.inference.level].label}
                        </span>
                    </p>
                    {review.degraded && (
                        <p className="mb-1 rounded bg-amber-100 px-2 py-1 text-[11px] text-amber-900">
                            This step was not actually reviewed — the review call
                            did not complete. Check it manually.
                        </p>
                    )}
                    {review.reason && (
                        <p className="text-[11px] leading-snug text-gray-700">
                            {review.reason}
                        </p>
                    )}
                    {review.criteria.length > 0 && (
                        <ul className="mt-1.5 space-y-1">
                            {review.criteria.map((c) => (
                                <li
                                    key={c.id}
                                    className="text-[11px] leading-snug"
                                >
                                    <span
                                        className={`mr-1.5 rounded px-1 py-0.5 text-[10px] font-medium ${
                                            VERDICT_STYLES[c.verdict] ??
                                            "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        {c.verdict.replaceAll("_", " ")}
                                    </span>
                                    <span className="text-gray-700">
                                        {c.criterion}
                                    </span>
                                    {c.reason && (
                                        <span className="text-gray-500">
                                            {" "}
                                            — {c.reason}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {review.inference.examples.length > 0 && (
                        <p className="mt-1.5 text-[11px] leading-snug text-gray-600">
                            <span className="font-medium">
                                Inferential statements flagged:
                            </span>{" "}
                            {review.inference.examples.join("; ")}
                        </p>
                    )}
                    {review.rework_instruction && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-snug text-amber-900">
                            <RotateCcw className="mt-0.5 h-3 w-3 shrink-0" />
                            <span>{review.rework_instruction}</span>
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
}

/**
 * The completion report: the run's audit trail. Every step, what it was asked
 * to achieve, its reasoning, the sources it actually touched, the senior
 * partner's adjudication, and how much of the result is inference rather than
 * sourced fact. Built entirely from persisted run data.
 */
function RunReportView({ report }: { report: RunReport }) {
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-medium text-gray-900">
                    Summary
                </h3>
                {report.blueprint_summary && (
                    <p className="mb-3 text-xs leading-relaxed text-gray-600">
                        {report.blueprint_summary}
                    </p>
                )}
                <div className="flex flex-wrap gap-2">
                    {report.overall_inference && (
                        <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${INFERENCE_STYLES[report.overall_inference].chip}`}
                        >
                            Overall:{" "}
                            {INFERENCE_STYLES[report.overall_inference].label}
                        </span>
                    )}
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700">
                        {report.steps.length} steps
                    </span>
                    {report.reworked_positions.length > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800">
                            Sent back for rework: step
                            {report.reworked_positions.length > 1 ? "s" : ""}{" "}
                            {report.reworked_positions.join(", ")}
                        </span>
                    )}
                    {report.unreviewed_positions.length > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] text-red-700">
                            Not fully reviewed: step
                            {report.unreviewed_positions.length > 1 ? "s" : ""}{" "}
                            {report.unreviewed_positions.join(", ")}
                        </span>
                    )}
                </div>
                {report.overall_inference && (
                    <p className="mt-2 text-[11px] leading-snug text-gray-500">
                        {INFERENCE_STYLES[report.overall_inference].blurb}
                    </p>
                )}
            </div>

            {report.preflight && (
                <details
                    className="rounded-xl border border-gray-200 bg-white p-4"
                    open={report.preflight.overall_risk === "high"}
                >
                    <summary className="cursor-pointer text-sm font-medium text-gray-900">
                        Pre-flight assessment
                        {report.preflight.decision === "continue"
                            ? " — you chose to continue"
                            : ""}
                    </summary>
                    <div className="mt-3">
                        <PreflightGateBody
                            assessment={report.preflight}
                            running={false}
                        />
                    </div>
                </details>
            )}

            {report.steps.map((s) => (
                <div
                    key={s.position}
                    className="rounded-xl border border-gray-200 bg-white p-4"
                >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                            Step {s.position}
                        </span>
                        <h4 className="text-sm font-medium text-gray-900">
                            {s.name}
                        </h4>
                        <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-600">
                            {s.role}
                        </span>
                        {s.inference && (
                            <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${INFERENCE_STYLES[s.inference].chip}`}
                            >
                                {INFERENCE_STYLES[s.inference].label}
                            </span>
                        )}
                        {s.attempt > 1 && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                accepted on attempt {s.attempt}
                            </span>
                        )}
                    </div>
                    <p className="mb-2 text-[11px] leading-snug text-gray-600">
                        <span className="font-medium">Objective:</span>{" "}
                        {s.objective}
                    </p>

                    <div className="mb-2 flex flex-wrap gap-1.5">
                        {[
                            ...s.sources.documents.map(
                                (d) => `doc: ${d}` as const,
                            ),
                            ...s.sources.playbooks.map(
                                (p) => `playbook: ${p}` as const,
                            ),
                            ...s.sources.knowledge_searches.map(
                                (k) => `kb: ${k}` as const,
                            ),
                            ...s.sources.citations_checked.map(
                                (c) => `citation: ${c}` as const,
                            ),
                            ...s.sources.documents_created.map(
                                (c) => `produced: ${c}` as const,
                            ),
                        ].map((label, i) => (
                            <span
                                key={i}
                                className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-700"
                            >
                                {label}
                            </span>
                        ))}
                        {s.sources.documents.length === 0 &&
                            s.sources.playbooks.length === 0 &&
                            s.sources.knowledge_searches.length === 0 && (
                                <span className="text-[11px] text-gray-400">
                                    No external sources recorded — this step
                                    reasoned from the run context alone.
                                </span>
                            )}
                    </div>

                    <StepReasoning reasoning={s.reasoning} />
                    <StepReviews reviews={s.reviews} />

                    {s.output_text && (
                        <details>
                            <summary className="cursor-pointer text-[11px] text-gray-500 hover:text-gray-700">
                                Step output
                            </summary>
                            <pre className="mt-1.5 max-h-96 overflow-auto whitespace-pre-wrap font-sans text-sm text-gray-700">
                                {s.output_text}
                            </pre>
                        </details>
                    )}
                </div>
            ))}
        </div>
    );
}

function AgentsPageInner() {
    const { user } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = searchParams.get("run");

    const [request, setRequest] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Document attachment (C022 precedent + general runs)
    const [showDocs, setShowDocs] = useState(false);
    const [docs, setDocs] = useState<Document[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
    const [draftFromPrecedent, setDraftFromPrecedent] = useState(false);
    const [showRoleRef, setShowRoleRef] = useState(false);
    // Whether Jade.io tools are actually live right now (admin has approved
    // Jade access). Drives which sources the role reference shows — Jade.io
    // when approved, AustLII manual verification when not.
    const [jadeApproved, setJadeApproved] = useState<boolean | null>(null);
    const roleCapabilities = useMemo(
        () => getRoleCapabilities(jadeApproved ?? false),
        [jadeApproved],
    );

    useEffect(() => {
        void getJadeAccessStatus()
            .then((s) => setJadeApproved(s.jadeAccessApproved))
            .catch(() => setJadeApproved(false));
    }, []);

    useEffect(() => {
        if (!showDocs || docs.length > 0) return;
        void Promise.all([getLibrary("files"), getLibrary("templates")])
            .then(([files, templates]) => {
                const all = [...templates.documents, ...files.documents];
                const seen = new Set<string>();
                setDocs(
                    all.filter((d) =>
                        seen.has(d.id) ? false : (seen.add(d.id), true),
                    ),
                );
            })
            .catch(() => {});
    }, [showDocs, docs.length]);

    const [detail, setDetail] = useState<{
        run: AgentRunSummary & {
            plan: AgentPlan | null;
            error: string | null;
            result: unknown;
            blueprint?: WorkflowBlueprint | null;
            preflight?: PreflightAssessment | null;
        };
        steps: AgentStepDetail[];
    } | null>(null);
    const [editPlan, setEditPlan] = useState<AgentPlan | null>(null);
    // Steps are expanded by default — thinking, sources and the partner
    // review are visible without anyone having to click into them. The set
    // holds steps the user has explicitly COLLAPSED.
    const [collapsedSteps, setCollapsedSteps] = useState<Set<number>>(new Set());
    const [view, setView] = useState<"progress" | "report">("progress");
    const [report, setReport] = useState<RunReport | null>(null);
    const [reportMarkdown, setReportMarkdown] = useState<string>("");
    const [reportOutput, setReportOutput] = useState<string>("");
    const [gateBusy, setGateBusy] = useState(false);
    const [exportFormat, setExportFormat] = useState<"docx" | "pdf" | "md">("docx");
    const [exportStyle, setExportStyle] = useState<"as_written" | "aglc4">("as_written");
    const [exportWhat, setExportWhat] = useState<"output" | "report">("output");
    const [exporting, setExporting] = useState(false);

    // C040 — export either the work product or the full process report.
    const handleExport = async () => {
        if (!detail || exporting) return;
        setExporting(true);
        try {
            const fallback = detail.steps
                .filter((s) => s.output_text)
                .map((s) => `## Step ${s.position} (${s.role})\n\n${s.output_text}`)
                .join("\n\n");
            const content =
                exportWhat === "report"
                    ? reportMarkdown || fallback
                    : reportOutput || fallback;
            const blob = await exportOutput({
                title: `${detail.run.title ?? "Agent run"}${exportWhat === "report" ? " — process report" : ""}`,
                content,
                format: exportFormat,
                citation_style: exportStyle,
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${(detail.run.title ?? "agent-run").replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "agent-run"}${exportWhat === "report" ? "-report" : ""}.${exportFormat}`;
            a.click();
            URL.revokeObjectURL(url);
        } finally {
            setExporting(false);
        }
    };

    // Prefill from ?new= (e.g. Playbooks → "Build with AI").
    useEffect(() => {
        const seed = searchParams.get("new");
        if (seed) setRequest(seed);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchRuns = useCallback(
        (limit: number) => {
            if (!user) return Promise.resolve([]);
            return listAgentRuns(limit).then(({ runs }) => runs);
        },
        [user],
    );
    const {
        items: runItems,
        hasMore: hasMoreRuns,
        loadingMore: loadingMoreRuns,
        loadMore: loadMoreRuns,
        refresh: refreshList,
    } = usePaginatedList<AgentRunSummary>(fetchRuns, [user], {
        initialLimit: 50,
        increment: 50,
    });
    const runs = runItems ?? [];

    const refreshDetail = useCallback(async () => {
        if (!selectedId) return;
        try {
            const d = await getAgentRun(selectedId);
            setDetail(d);
            if (d.run.status === "awaiting_approval" && d.run.plan) {
                setEditPlan((prev) => prev ?? d.run.plan);
            } else if (d.run.status !== "awaiting_approval") {
                setEditPlan(null);
            }
        } catch {
            /* transient */
        }
    }, [selectedId]);

    useEffect(() => {
        setDetail(null);
        setEditPlan(null);
        setCollapsedSteps(new Set());
        setReport(null);
        setReportMarkdown("");
        setReportOutput("");
        setView("progress");
        if (!selectedId) return;
        void refreshDetail();
    }, [selectedId, refreshDetail]);

    // The completion report is assembled server-side from persisted data, so
    // it is only fetched once the run has stopped moving.
    const runFinished =
        detail?.run.status === "completed" || detail?.run.status === "failed";
    useEffect(() => {
        if (!selectedId || !runFinished || report) return;
        void getAgentRunReport(selectedId)
            .then((r) => {
                setReport(r.report);
                setReportMarkdown(r.markdown);
                setReportOutput(r.output);
            })
            .catch(() => {
                /* the progress view still works without it */
            });
    }, [selectedId, runFinished, report]);

    const handlePreflightDecision = async (
        decision: "continue" | "stopped",
    ) => {
        if (!selectedId || gateBusy) return;
        setGateBusy(true);
        try {
            await decideAgentPreflight(selectedId, decision);
            await refreshDetail();
            await refreshList();
        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Could not record your decision",
            );
        } finally {
            setGateBusy(false);
        }
    };

    // Poll while active.
    const activeStatus =
        detail?.run.status === "planning" || detail?.run.status === "running";
    useEffect(() => {
        if (!activeStatus) return;
        const t = setInterval(() => {
            void refreshDetail();
            void refreshList();
        }, 2500);
        return () => clearInterval(t);
    }, [activeStatus, refreshDetail, refreshList]);

    const handleCreate = async () => {
        const text = request.trim();
        if (!text || creating) return;
        setCreating(true);
        setError(null);
        try {
            const { run_id } = await createAgentRun({
                request: text,
                document_ids: [...selectedDocs],
                kind: draftFromPrecedent ? "draft_from_precedent" : undefined,
            });
            setRequest("");
            setSelectedDocs(new Set());
            setDraftFromPrecedent(false);
            await refreshList();
            router.push(`/agents?run=${run_id}`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create run");
        } finally {
            setCreating(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedId) return;
        try {
            await approveAgentRun(selectedId, editPlan ?? undefined);
            setEditPlan(null);
            await refreshDetail();
            await refreshList();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Approve failed");
        }
    };

    const handleCancel = async () => {
        if (!selectedId) return;
        await cancelAgentRun(selectedId);
        await refreshDetail();
        await refreshList();
    };

    // Live status for the process map. A step that has produced at least one
    // "rework" review and is still running is shown as reworking rather than
    // just running — that distinction is the whole reason the review exists.
    const statusByPosition = useMemo(() => {
        const map: Record<number, StepRunStatus> = {};
        for (const s of detail?.steps ?? []) {
            const sentBack = (s.reviews ?? []).some(
                (r) => r.decision === "rework",
            );
            map[s.position] =
                s.status === "running" && sentBack
                    ? "reworking"
                    : (s.status as StepRunStatus);
        }
        return map;
    }, [detail]);

    const currentStep = (detail?.steps ?? []).find(
        (s) => s.status === "running",
    );
    const completedCount = (detail?.steps ?? []).filter(
        (s) => s.status === "completed",
    ).length;
    const runBlueprint = detail?.run.blueprint ?? null;

    return (
        <div className="mx-auto flex h-full w-full max-w-6xl items-start gap-6 overflow-y-auto px-4 py-8">
            {/* Left: create + run list */}
            <div className="w-80 shrink-0">
                <h1 className="mb-3 flex items-center gap-2 text-2xl font-medium font-serif text-gray-900">
                    <Bot className="h-5 w-5" /> Agents
                </h1>
                <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3">
                    <textarea
                        value={request}
                        onChange={(e) => setRequest(e.target.value)}
                        placeholder="Describe the multi-step task, e.g. 'Research WHS obligations for NSW labour-hire, then draft a compliance memo and review it against our playbook.'"
                        rows={4}
                        className="w-full resize-none rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-gray-400"
                    />
                    <button
                        onClick={() => setShowDocs((v) => !v)}
                        className="mb-1 text-[11px] text-gray-500 hover:text-gray-800"
                    >
                        {showDocs ? "Hide documents" : `Attach documents${selectedDocs.size ? ` (${selectedDocs.size})` : ""}`}
                    </button>
                    {showDocs && (
                        <div className="mb-2 max-h-40 overflow-auto rounded-md border border-gray-100">
                            {docs.length === 0 ? (
                                <p className="p-2 text-[11px] text-gray-400">
                                    No Library documents found.
                                </p>
                            ) : (
                                docs.map((d) => (
                                    <label
                                        key={d.id}
                                        className="flex cursor-pointer items-center gap-2 border-b border-gray-50 px-2 py-1 text-[11px] text-gray-700 hover:bg-gray-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedDocs.has(d.id)}
                                            onChange={(e) => {
                                                const next = new Set(
                                                    selectedDocs,
                                                );
                                                if (e.target.checked)
                                                    next.add(d.id);
                                                else next.delete(d.id);
                                                setSelectedDocs(next);
                                            }}
                                        />
                                        <span className="truncate">
                                            {d.filename}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>
                    )}
                    <label className="mb-1 flex items-center gap-2 text-[11px] text-gray-600">
                        <input
                            type="checkbox"
                            checked={draftFromPrecedent}
                            onChange={(e) =>
                                setDraftFromPrecedent(e.target.checked)
                            }
                        />
                        Draft from precedent (attach the precedent above; fixed
                        analyse → draft → review plan)
                    </label>
                    <button
                        onClick={() => void handleCreate()}
                        disabled={creating || !request.trim()}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
                    >
                        {creating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="h-4 w-4" />
                        )}
                        Plan agent run
                    </button>
                    {error && (
                        <p className="mt-2 text-xs text-red-600">{error}</p>
                    )}
                    <p className="mt-2 text-[11px] leading-snug text-gray-400">
                        You review and approve the plan before anything runs.
                        Independent steps run in parallel; you are notified when
                        results are ready.
                    </p>
                </div>
                {/* Per-role reference — what each agent role can draw on. */}
                <div className="mb-4 rounded-xl border border-gray-200 bg-white">
                    <button
                        onClick={() => setShowRoleRef((v) => !v)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-600"
                    >
                        {showRoleRef ? (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                        ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                        )}
                        What each agent role uses
                    </button>
                    {showRoleRef && (
                        <ul className="space-y-2 border-t border-gray-100 px-3 py-2.5">
                            <li
                                className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                                    jadeApproved
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-sky-50 text-sky-700"
                                }`}
                            >
                                {jadeApproved === null
                                    ? "Checking Jade.io access…"
                                    : jadeApproved
                                      ? "Jade.io access: approved — research/review/verify steps may search and validate against Jade.io."
                                      : "Jade.io access: not approved — research/review/verify steps will not call Jade.io at all; they fall back to an AustLII search link that you open and verify yourself."}
                            </li>
                            {ROLES.map((role) => {
                                const cap = roleCapabilities[role];
                                return (
                                    <li key={role} className="text-[11px]">
                                        <span className="font-semibold uppercase tracking-wider text-gray-500">
                                            {role}
                                        </span>
                                        <p className="mt-0.5 text-gray-600">
                                            {cap.blurb}
                                        </p>
                                        <p className="mt-1 font-medium text-gray-500">
                                            Sources it can refer to:
                                        </p>
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            {cap.sources.map((src) => (
                                                <span
                                                    key={src}
                                                    className={`rounded-full px-1.5 py-0.5 ${
                                                        src.startsWith("Playbook")
                                                            ? "bg-indigo-50 text-indigo-700"
                                                            : src.startsWith(
                                                                    "Knowledge",
                                                                )
                                                              ? "bg-emerald-50 text-emerald-700"
                                                              : src.startsWith(
                                                                      "Jade",
                                                                  )
                                                                ? "bg-amber-50 text-amber-700"
                                                                : src.startsWith(
                                                                        "AustLII",
                                                                    ) ||
                                                                    src.includes(
                                                                        "AustLII",
                                                                    )
                                                                  ? "bg-sky-50 text-sky-700"
                                                                  : "bg-gray-100 text-gray-600"
                                                    }`}
                                                >
                                                    {src}
                                                </span>
                                            ))}
                                        </div>
                                    </li>
                                );
                            })}
                            <li className="pt-1 text-[11px] text-gray-400">
                                Expand any completed step to see exactly which
                                playbooks and documents it relied on.
                            </li>
                        </ul>
                    )}
                </div>

                <ul className="space-y-1.5">
                    {runs.map((r) => (
                        <li key={r.id}>
                            <button
                                onClick={() => router.push(`/agents?run=${r.id}`)}
                                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                    r.id === selectedId
                                        ? "border-gray-400 bg-gray-50"
                                        : "border-gray-200 bg-white hover:bg-gray-50"
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-sm font-medium text-gray-900">
                                        {r.title ?? r.request}
                                    </span>
                                    <StatusChip status={r.status} />
                                </div>
                                <p className="mt-0.5 truncate text-xs text-gray-500">
                                    {new Date(r.created_at).toLocaleString()}
                                </p>
                            </button>
                        </li>
                    ))}
                    {runs.length === 0 && (
                        <li className="text-sm text-gray-400">No runs yet.</li>
                    )}
                </ul>
                <LoadMoreSentinel
                    hasMore={hasMoreRuns}
                    loading={loadingMoreRuns}
                    onLoadMore={loadMoreRuns}
                />
            </div>

            {/* Right: run detail */}
            <div className="min-w-0 flex-1">
                {!detail ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-400">
                        {selectedId
                            ? "Loading run…"
                            : "Select or create a run to see its plan and progress."}
                    </div>
                ) : (
                    <div>
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <h2 className="truncate text-xl font-medium font-serif text-gray-900">
                                    {detail.run.title ?? detail.run.request}
                                </h2>
                                <div className="mt-1 flex items-center gap-2">
                                    <StatusChip status={detail.run.status} />
                                    {detail.run.model && (
                                        <span className="text-xs text-gray-400">
                                            {detail.run.model}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {detail.run.status === "completed" && (
                                    <>
                                        <select
                                            value={exportWhat}
                                            onChange={(e) =>
                                                setExportWhat(
                                                    e.target.value as
                                                        | "output"
                                                        | "report",
                                                )
                                            }
                                            className="rounded-md border border-gray-300 px-1.5 py-1.5 text-xs"
                                        >
                                            <option value="output">
                                                Output
                                            </option>
                                            <option value="report">
                                                Process report
                                            </option>
                                        </select>
                                        <select
                                            value={exportFormat}
                                            onChange={(e) =>
                                                setExportFormat(
                                                    e.target.value as
                                                        | "docx"
                                                        | "pdf"
                                                        | "md",
                                                )
                                            }
                                            className="rounded-md border border-gray-300 px-1.5 py-1.5 text-xs"
                                        >
                                            <option value="docx">DOCX</option>
                                            <option value="pdf">PDF</option>
                                            <option value="md">Markdown</option>
                                        </select>
                                        <select
                                            value={exportStyle}
                                            onChange={(e) =>
                                                setExportStyle(
                                                    e.target.value as
                                                        | "as_written"
                                                        | "aglc4",
                                                )
                                            }
                                            className="rounded-md border border-gray-300 px-1.5 py-1.5 text-xs"
                                        >
                                            <option value="as_written">
                                                Citations as written
                                            </option>
                                            <option value="aglc4">
                                                AGLC4 citations
                                            </option>
                                        </select>
                                        <button
                                            onClick={() => void handleExport()}
                                            disabled={exporting}
                                            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                                        >
                                            {exporting ? "Exporting…" : "Export"}
                                        </button>
                                    </>
                                )}
                                {(detail.run.status === "running" ||
                                    detail.run.status === "awaiting_approval" ||
                                    detail.run.status === "planning") && (
                                    <button
                                        onClick={() => void handleCancel()}
                                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Pre-run silent-failure gate. Nothing has executed:
                            the user either continues or stops to edit. */}
                        {detail.run.status === "paused" &&
                            detail.run.preflight && (
                                <div className="mb-5 rounded-xl border border-red-200 bg-red-50/40 p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <p className="text-sm font-medium text-gray-900">
                                            Paused before running — high risk of
                                            silent AI failure on these documents
                                        </p>
                                    </div>
                                    <PreflightGateBody
                                        assessment={detail.run.preflight}
                                        running={false}
                                    />
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <button
                                            onClick={() =>
                                                void handlePreflightDecision(
                                                    "continue",
                                                )
                                            }
                                            disabled={gateBusy}
                                            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                                        >
                                            Continue anyway
                                        </button>
                                        <button
                                            onClick={() =>
                                                void handlePreflightDecision(
                                                    "stopped",
                                                )
                                            }
                                            disabled={gateBusy}
                                            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-white disabled:opacity-40"
                                        >
                                            Stop &amp; edit the workflow
                                        </button>
                                    </div>
                                </div>
                            )}

                        {/* Live process map — which step the run is up to. */}
                        {runBlueprint &&
                            detail.run.status !== "awaiting_approval" &&
                            detail.run.status !== "paused" && (
                                <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
                                    <div className="mb-3 flex flex-wrap items-center gap-2">
                                        <h3 className="text-sm font-medium text-gray-900">
                                            Process
                                        </h3>
                                        <span className="text-xs text-gray-500">
                                            {completedCount} of{" "}
                                            {detail.steps.length} steps complete
                                        </span>
                                        {currentStep && (
                                            <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                Now on step{" "}
                                                {currentStep.position}:{" "}
                                                {runBlueprint.steps.find(
                                                    (s) =>
                                                        s.position ===
                                                        currentStep.position,
                                                )?.name ?? currentStep.role}
                                            </span>
                                        )}
                                    </div>
                                    <WorkflowProcessMap
                                        steps={runBlueprint.steps}
                                        statusByPosition={statusByPosition}
                                        showRisk={false}
                                    />
                                </div>
                            )}

                        {/* Output / report switch, once there is a report. */}
                        {report && (
                            <div className="mb-4 flex items-center gap-1 border-b border-gray-200">
                                {(
                                    [
                                        {
                                            key: "progress" as const,
                                            label: "Steps & output",
                                        },
                                        {
                                            key: "report" as const,
                                            label: "Process report",
                                        },
                                    ]
                                ).map((t) => (
                                    <button
                                        key={t.key}
                                        onClick={() => setView(t.key)}
                                        className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                                            view === t.key
                                                ? "border-gray-900 font-medium text-gray-900"
                                                : "border-transparent text-gray-500 hover:text-gray-700"
                                        }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {view === "report" && report && (
                            <RunReportView report={report} />
                        )}

                        {/* Workflow runs are approved against the blueprint the
                            user already reviewed on the workflow page, so they
                            get the map and step summaries rather than the raw
                            instruction editor (the instructions here are the
                            composed objective + criteria blocks, which are not
                            useful to hand-edit). */}
                        {view === "progress" &&
                            detail.run.status === "awaiting_approval" &&
                            runBlueprint && (
                                <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                                    <p className="mb-3 text-sm font-medium text-gray-900">
                                        Ready to run. These are the steps, in
                                        the order they&apos;ll execute.
                                    </p>
                                    {detail.run.preflight?.decision ===
                                        "continue" && (
                                        <p className="mb-3 rounded-md bg-white/70 px-2.5 py-1.5 text-[11px] text-amber-800">
                                            You chose to continue past the
                                            pre-flight warning. Every step will
                                            still be reviewed against its
                                            acceptance criteria.
                                        </p>
                                    )}
                                    <div className="mb-3 rounded-lg bg-white p-3">
                                        <WorkflowProcessMap
                                            steps={runBlueprint.steps}
                                        />
                                    </div>
                                    <button
                                        onClick={() => void handleApprove()}
                                        className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                                    >
                                        <Play className="h-4 w-4" /> Approve &
                                        run
                                    </button>
                                </div>
                            )}

                        {/* C030 — plan approval editor (ad-hoc agent runs) */}
                        {view === "progress" &&
                            detail.run.status === "awaiting_approval" &&
                            !runBlueprint &&
                            editPlan && (
                                <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                                    <p className="mb-3 text-sm font-medium text-gray-900">
                                        Review the agent&apos;s plan before it
                                        runs. Edit instructions, change roles,
                                        or remove steps.
                                    </p>
                                    <ol className="space-y-2">
                                        {editPlan.steps.map((s, i) => (
                                            <li
                                                key={i}
                                                className="rounded-lg border border-gray-200 bg-white p-3"
                                            >
                                                <div className="mb-1.5 flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-gray-500">
                                                        Step {s.position}
                                                    </span>
                                                    <select
                                                        value={s.role}
                                                        onChange={(e) => {
                                                            const steps = [
                                                                ...editPlan.steps,
                                                            ];
                                                            steps[i] = {
                                                                ...s,
                                                                role: e.target
                                                                    .value as (typeof ROLES)[number],
                                                            };
                                                            setEditPlan({
                                                                ...editPlan,
                                                                steps,
                                                            });
                                                        }}
                                                        className="rounded border border-gray-200 px-1.5 py-0.5 text-xs"
                                                    >
                                                        {ROLES.map((r) => (
                                                            <option
                                                                key={r}
                                                                value={r}
                                                            >
                                                                {r}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {s.depends_on.length > 0 && (
                                                        <span className="text-[11px] text-gray-400">
                                                            after step
                                                            {s.depends_on.length >
                                                            1
                                                                ? "s"
                                                                : ""}{" "}
                                                            {s.depends_on.join(
                                                                ", ",
                                                            )}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            const steps =
                                                                editPlan.steps
                                                                    .filter(
                                                                        (
                                                                            _,
                                                                            j,
                                                                        ) =>
                                                                            j !==
                                                                            i,
                                                                    )
                                                                    .map(
                                                                        (
                                                                            st,
                                                                            j,
                                                                        ) => ({
                                                                            ...st,
                                                                            position:
                                                                                j +
                                                                                1,
                                                                            depends_on:
                                                                                st.depends_on.filter(
                                                                                    (
                                                                                        d,
                                                                                    ) =>
                                                                                        d !==
                                                                                            s.position &&
                                                                                        d <=
                                                                                            j,
                                                                                ),
                                                                        }),
                                                                    );
                                                            setEditPlan({
                                                                ...editPlan,
                                                                steps,
                                                            });
                                                        }}
                                                        className="ml-auto text-gray-400 hover:text-red-600"
                                                        title="Remove step"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={s.instruction}
                                                    onChange={(e) => {
                                                        const steps = [
                                                            ...editPlan.steps,
                                                        ];
                                                        steps[i] = {
                                                            ...s,
                                                            instruction:
                                                                e.target.value,
                                                        };
                                                        setEditPlan({
                                                            ...editPlan,
                                                            steps,
                                                        });
                                                    }}
                                                    rows={2}
                                                    className="w-full resize-y rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-gray-400"
                                                />
                                            </li>
                                        ))}
                                    </ol>
                                    <button
                                        onClick={() => void handleApprove()}
                                        disabled={editPlan.steps.length === 0}
                                        className="mt-3 flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                                    >
                                        <Play className="h-4 w-4" /> Approve &
                                        run
                                    </button>
                                </div>
                            )}

                        {/* Steps progress — expanded by default. */}
                        {view === "progress" &&
                            detail.run.status !== "awaiting_approval" &&
                            detail.run.status !== "paused" && (
                            <ol className="space-y-2">
                                {detail.steps.map((s) => {
                                    const open = !collapsedSteps.has(s.position);
                                    const bp = runBlueprint?.steps.find(
                                        (b) => b.position === s.position,
                                    );
                                    const reviews = s.reviews ?? [];
                                    const attempts = s.attempt ?? reviews.length;
                                    return (
                                        <li
                                            key={s.position}
                                            className="rounded-xl border border-gray-200 bg-white"
                                        >
                                            <button
                                                onClick={() => {
                                                    const next = new Set(
                                                        collapsedSteps,
                                                    );
                                                    if (open)
                                                        next.add(s.position);
                                                    else
                                                        next.delete(s.position);
                                                    setCollapsedSteps(next);
                                                }}
                                                className="flex w-full items-center gap-2.5 px-4 py-3 text-left"
                                            >
                                                <StepStatusIcon
                                                    status={s.status}
                                                />
                                                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                                                    {s.role}
                                                </span>
                                                <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                                                    {bp
                                                        ? `${s.position}. ${bp.name}`
                                                        : s.instruction}
                                                </span>
                                                {attempts > 1 && (
                                                    <span className="hidden shrink-0 items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 sm:flex">
                                                        <RotateCcw className="h-3 w-3" />
                                                        {attempts} attempts
                                                    </span>
                                                )}
                                                {s.depends_on.length > 0 && (
                                                    <span className="hidden text-[11px] text-gray-400 sm:block">
                                                        ⇠ {s.depends_on.join(",")}
                                                    </span>
                                                )}
                                                {open ? (
                                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-gray-400" />
                                                )}
                                            </button>
                                            {open && (
                                                <div className="border-t border-gray-100 px-4 py-3">
                                                    {bp && (
                                                        <p className="mb-2 text-[11px] leading-snug text-gray-500">
                                                            <span className="font-medium text-gray-600">
                                                                Objective:
                                                            </span>{" "}
                                                            {bp.objective}
                                                        </p>
                                                    )}
                                                    <StepSources
                                                        sources={s.sources}
                                                        role={s.role}
                                                    />
                                                    <StepReasoning
                                                        reasoning={
                                                            s.reasoning ?? []
                                                        }
                                                    />
                                                    <StepReviews
                                                        reviews={reviews}
                                                    />
                                                    {s.output_text ? (
                                                        <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap font-sans text-sm text-gray-700">
                                                            {s.output_text}
                                                        </pre>
                                                    ) : (
                                                        <p className="text-sm text-gray-400">
                                                            {s.status ===
                                                            "running"
                                                                ? "Working…"
                                                                : "No output yet."}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        )}

                        {detail.run.error && (
                            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                                {detail.run.error}
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AgentsPage() {
    return (
        <Suspense fallback={null}>
            <AgentsPageInner />
        </Suspense>
    );
}
