"use client";

/**
 * The workflow overview: process map + a card per step giving its objective,
 * inputs, outputs and acceptance criteria, plus a workflow-wide assessment of
 * where the process is exposed to silent AI failure.
 *
 * This is what a user sees when they open a workflow, in place of the one-line
 * description that used to be there.
 */

import { useState } from "react";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Loader2,
    RefreshCw,
    ShieldAlert,
    Target,
} from "lucide-react";
import type {
    BlueprintStep,
    RiskLevel,
    WorkflowBlueprint,
} from "@/app/lib/roseApi";
import {
    RISK_STYLES,
    WorkflowProcessMap,
} from "@/app/components/workflows/WorkflowProcessMap";

const RISK_BANNER: Record<RiskLevel, string> = {
    low: "border-green-200 bg-green-50/60",
    medium: "border-amber-200 bg-amber-50/60",
    high: "border-red-200 bg-red-50/60",
};

const RISK_HEADLINE: Record<RiskLevel, string> = {
    low: "Low exposure to silent AI failure",
    medium: "Moderate exposure to silent AI failure",
    high: "High exposure to silent AI failure",
};

function StepCard({
    step,
    highlighted,
}: {
    step: BlueprintStep;
    highlighted: boolean;
}) {
    const risk = RISK_STYLES[step.silent_failure.risk];
    return (
        <div
            id={`wf-step-${step.position}`}
            className={`scroll-mt-24 rounded-xl border bg-white p-4 transition-colors ${
                highlighted ? "border-gray-900 shadow-md" : "border-gray-200"
            }`}
        >
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Step {step.position}
                </span>
                <h4 className="text-sm font-medium text-gray-900">{step.name}</h4>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-600">
                    {step.role}
                </span>
                <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${risk.chip}`}
                >
                    {risk.label}
                </span>
                {step.depends_on.length > 0 && (
                    <span className="text-[11px] text-gray-400">
                        after step {step.depends_on.join(", ")}
                    </span>
                )}
            </div>

            <div className="mb-3 flex items-start gap-2 rounded-lg bg-gray-50 p-2.5">
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Objective
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-gray-700">
                        {step.objective}
                    </p>
                </div>
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        Inputs
                    </p>
                    {step.inputs.length === 0 ? (
                        <p className="text-[11px] text-gray-400">
                            None declared.
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {step.inputs.map((io, i) => (
                                <li key={i} className="text-[11px] leading-snug">
                                    <span className="font-medium text-gray-800">
                                        {io.name}
                                    </span>
                                    <span className="text-gray-400">
                                        {" "}
                                        · {io.source}
                                    </span>
                                    {io.description && (
                                        <p className="text-gray-500">
                                            {io.description}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                <div>
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        <ArrowRight className="h-3 w-3" /> Outputs
                    </p>
                    {step.outputs.length === 0 ? (
                        <p className="text-[11px] text-gray-400">
                            None declared.
                        </p>
                    ) : (
                        <ul className="space-y-1.5">
                            {step.outputs.map((io, i) => (
                                <li key={i} className="text-[11px] leading-snug">
                                    <span className="font-medium text-gray-800">
                                        {io.name}
                                    </span>
                                    <span className="text-gray-400">
                                        {" "}
                                        · {io.source}
                                    </span>
                                    {io.description && (
                                        <p className="text-gray-500">
                                            {io.description}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className="mb-3">
                <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Acceptance criteria — a senior partner adjudicates the output
                    against these
                </p>
                {step.quality_criteria.length === 0 ? (
                    <p className="text-[11px] text-gray-400">
                        None declared — the reviewer falls back to source
                        traceability.
                    </p>
                ) : (
                    <ul className="space-y-1.5">
                        {step.quality_criteria.map((c) => (
                            <li
                                key={c.id}
                                className="rounded-md border border-gray-100 bg-gray-50/60 p-2 text-[11px] leading-snug"
                            >
                                <span className="mr-1.5 rounded bg-white px-1 py-0.5 font-mono text-[10px] text-gray-500">
                                    {c.id}
                                </span>
                                <span className="rounded bg-white px-1 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
                                    {c.applies_to}
                                </span>
                                <p className="mt-1 text-gray-700">
                                    {c.criterion}
                                </p>
                                {c.why && (
                                    <p className="mt-0.5 text-gray-400">
                                        Why: {c.why}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {(step.silent_failure.modes.length > 0 ||
                step.silent_failure.mitigation) && (
                <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-2.5">
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                        <ShieldAlert className="h-3 w-3" /> How this step can fail
                        silently
                    </p>
                    <ul className="list-inside list-disc space-y-0.5 text-[11px] leading-snug text-gray-600">
                        {step.silent_failure.modes.map((m, i) => (
                            <li key={i}>{m}</li>
                        ))}
                    </ul>
                    {step.silent_failure.mitigation && (
                        <p className="mt-1.5 text-[11px] text-gray-500">
                            <span className="font-medium text-gray-600">
                                Mitigation:
                            </span>{" "}
                            {step.silent_failure.mitigation}
                        </p>
                    )}
                </div>
            )}

            <p className="mt-2 text-[11px] text-gray-400">
                {step.max_rework === 0
                    ? "If the review rejects this step it escalates to you immediately."
                    : `The senior partner may send this step back up to ${step.max_rework} time${
                          step.max_rework === 1 ? "" : "s"
                      } with reasons before escalating to you.`}
            </p>
        </div>
    );
}

export function WorkflowBlueprintPanel({
    blueprint,
    loading,
    error,
    onRegenerate,
    regenerating,
}: {
    blueprint: WorkflowBlueprint | null;
    loading: boolean;
    error: string | null;
    onRegenerate?: () => void;
    regenerating?: boolean;
}) {
    const [selected, setSelected] = useState<number | null>(null);

    if (loading) {
        return (
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Mapping this workflow&apos;s steps, inputs, outputs and failure
                modes…
            </div>
        );
    }

    if (error || !blueprint) {
        return (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
                <p className="text-sm text-gray-600">
                    {error ?? "No process map is available for this workflow."}
                </p>
                {onRegenerate && (
                    <button
                        onClick={onRegenerate}
                        className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                        Try again
                    </button>
                )}
            </div>
        );
    }

    const overview = blueprint.silent_failure_overview;

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
                <p className="max-w-3xl text-sm leading-relaxed text-gray-700">
                    {blueprint.summary}
                </p>
                {onRegenerate && (
                    <button
                        onClick={onRegenerate}
                        disabled={regenerating}
                        className="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                        title="Re-derive the process map from the current instructions"
                    >
                        <RefreshCw
                            className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`}
                        />
                        {regenerating ? "Regenerating…" : "Regenerate"}
                    </button>
                )}
            </div>

            {blueprint.degraded && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    This map could not be derived cleanly from the workflow&apos;s
                    instructions, so it is a best-effort reconstruction. Treat
                    the steps below as indicative and regenerate after tightening
                    the instructions.
                </p>
            )}

            {/* Process map */}
            <section>
                <h3 className="mb-3 text-sm font-medium text-gray-900">
                    Process map
                </h3>
                <WorkflowProcessMap
                    steps={blueprint.steps}
                    selected={selected}
                    onSelect={(position) => {
                        setSelected(position);
                        document
                            .getElementById(`wf-step-${position}`)
                            ?.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                            });
                    }}
                />
            </section>

            {/* Silent-failure overview */}
            <section
                className={`rounded-xl border p-4 ${RISK_BANNER[overview.overall_risk]}`}
            >
                <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-gray-600" />
                    <h3 className="text-sm font-medium text-gray-900">
                        {RISK_HEADLINE[overview.overall_risk]}
                    </h3>
                </div>
                <p className="mb-3 max-w-3xl text-xs leading-relaxed text-gray-600">
                    A silent failure is output that reads as fluent and
                    confident but is wrong, with nothing on its face to signal
                    the error — a paraphrased clause that drops a proviso, a
                    plausible date that is not in the document, a real case
                    cited for a proposition it does not support.
                    {overview.notes ? ` ${overview.notes}` : ""}
                </p>
                {overview.hotspots.length === 0 ? (
                    <p className="text-xs text-gray-600">
                        No individual step stands out as especially exposed.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {overview.hotspots.map((h) => (
                            <li
                                key={`${h.position}-${h.step_name}`}
                                className="rounded-lg border border-white bg-white/70 p-2.5"
                            >
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={() => {
                                            setSelected(h.position);
                                            document
                                                .getElementById(
                                                    `wf-step-${h.position}`,
                                                )
                                                ?.scrollIntoView({
                                                    behavior: "smooth",
                                                    block: "center",
                                                });
                                        }}
                                        className="text-xs font-medium text-gray-900 underline-offset-2 hover:underline"
                                    >
                                        Step {h.position} — {h.step_name}
                                    </button>
                                    <span
                                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${RISK_STYLES[h.risk].chip}`}
                                    >
                                        {RISK_STYLES[h.risk].label}
                                    </span>
                                </div>
                                <p className="text-[11px] leading-snug text-gray-700">
                                    {h.why}
                                </p>
                                {h.mitigation && (
                                    <p className="mt-1 text-[11px] leading-snug text-gray-500">
                                        <span className="font-medium text-gray-600">
                                            What to do:
                                        </span>{" "}
                                        {h.mitigation}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Step detail */}
            <section>
                <h3 className="mb-3 text-sm font-medium text-gray-900">
                    Steps in detail
                </h3>
                <div className="space-y-3">
                    {blueprint.steps.map((step) => (
                        <StepCard
                            key={step.position}
                            step={step}
                            highlighted={selected === step.position}
                        />
                    ))}
                </div>
            </section>
        </div>
    );
}
