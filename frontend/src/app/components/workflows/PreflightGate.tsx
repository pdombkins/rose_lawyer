"use client";

/**
 * The pre-flight silent-AI-failure gate.
 *
 * Shown after the user has picked a project and attached documents, before
 * anything runs. The assessment is made against the documents actually
 * attached — not the workflow in the abstract — so it can catch things the
 * workflow's own risk map cannot: an image-only PDF, a draft where an
 * executed agreement was expected, a summarisation step pointed at 200 pages
 * of heavily-qualified drafting.
 *
 * When the risk comes back high the user has two ways out, and only two:
 * continue with their eyes open, or stop and edit the workflow.
 */

import {
    AlertTriangle,
    CheckCircle2,
    FileWarning,
    Loader2,
    PencilLine,
} from "lucide-react";
import type { PreflightAssessment, RiskLevel } from "@/app/lib/roseApi";

const RISK_CHIP: Record<RiskLevel, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-red-100 text-red-700",
};

const BANNER: Record<RiskLevel, string> = {
    low: "border-green-200 bg-green-50/70",
    medium: "border-amber-200 bg-amber-50/70",
    high: "border-red-200 bg-red-50/70",
};

const HEADLINE: Record<RiskLevel, string> = {
    low: "These documents look well suited to this workflow",
    medium: "Some things are worth checking before you run this",
    high: "High risk of silent AI failure on these documents",
};

export function PreflightGateBody({
    assessment,
    running,
}: {
    assessment: PreflightAssessment | null;
    running: boolean;
}) {
    if (running || !assessment) {
        return (
            <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Reading the attached documents and re-assessing each step for
                silent-failure risk…
            </div>
        );
    }

    const unreadable = assessment.documents.filter((d) => d.unreadable);

    return (
        <div className="space-y-4">
            <div
                className={`rounded-xl border p-4 ${BANNER[assessment.overall_risk]}`}
            >
                <div className="mb-1.5 flex items-center gap-2">
                    {assessment.overall_risk === "low" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-700" />
                    ) : (
                        <AlertTriangle className="h-4 w-4 text-gray-700" />
                    )}
                    <h3 className="text-sm font-medium text-gray-900">
                        {HEADLINE[assessment.overall_risk]}
                    </h3>
                    <span
                        className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${RISK_CHIP[assessment.overall_risk]}`}
                    >
                        {assessment.overall_risk}
                    </span>
                </div>
                <p className="text-xs leading-relaxed text-gray-700">
                    {assessment.summary}
                </p>
            </div>

            {assessment.documents.length > 0 && (
                <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Documents checked
                    </p>
                    <ul className="space-y-1">
                        {assessment.documents.map((d) => (
                            <li
                                key={d.document_id}
                                className="flex items-center gap-2 rounded-md border border-gray-100 px-2 py-1.5 text-[11px]"
                            >
                                {d.unreadable && (
                                    <FileWarning className="h-3.5 w-3.5 shrink-0 text-red-500" />
                                )}
                                <span className="min-w-0 flex-1 truncate text-gray-700">
                                    {d.filename}
                                </span>
                                <span className="shrink-0 text-gray-400">
                                    {d.chars.toLocaleString()} chars
                                </span>
                            </li>
                        ))}
                    </ul>
                    {unreadable.length > 0 && (
                        <p className="mt-1.5 text-[11px] text-red-600">
                            {unreadable.length} document
                            {unreadable.length === 1 ? "" : "s"} produced almost
                            no text. Steps relying on{" "}
                            {unreadable.length === 1 ? "it" : "them"} will
                            confabulate rather than report that they cannot
                            read the file.
                        </p>
                    )}
                </div>
            )}

            {assessment.findings.length > 0 && (
                <div>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Findings
                    </p>
                    <ul className="space-y-2">
                        {assessment.findings.map((f, i) => (
                            <li
                                key={i}
                                className="rounded-lg border border-gray-200 p-2.5"
                            >
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium text-gray-900">
                                        {f.position > 0
                                            ? `Step ${f.position} — ${f.step_name}`
                                            : f.step_name}
                                    </span>
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${RISK_CHIP[f.risk]}`}
                                    >
                                        {f.risk}
                                    </span>
                                </div>
                                <p className="text-[11px] leading-snug text-gray-700">
                                    {f.issue}
                                </p>
                                {f.recommendation && (
                                    <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-snug text-gray-500">
                                        <PencilLine className="mt-0.5 h-3 w-3 shrink-0" />
                                        <span>{f.recommendation}</span>
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {assessment.requires_confirmation && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-800">
                    Nothing has run yet. You can continue anyway — the run will
                    proceed and every step will still be reviewed against its
                    acceptance criteria — or stop here and edit the workflow to
                    address the findings above.
                </p>
            )}
        </div>
    );
}
