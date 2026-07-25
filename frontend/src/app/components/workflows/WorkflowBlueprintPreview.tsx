"use client";

/**
 * Compact blueprint view for the workflow picker's preview pane.
 *
 * This is the first thing you see when you select a workflow, so it has to
 * answer "what will this actually do to my documents?" — not just restate the
 * title. Same blueprint data as the full overview on the workflow detail
 * page, laid out for a narrow modal column: summary, risk, process map, then
 * a step accordion.
 */

import { useEffect, useState } from "react";
import { AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import {
    getWorkflowBlueprint,
    type RiskLevel,
    type WorkflowBlueprint,
} from "@/app/lib/roseApi";
import {
    RISK_STYLES,
    WorkflowProcessMap,
} from "@/app/components/workflows/WorkflowProcessMap";

const RISK_BANNER: Record<RiskLevel, string> = {
    low: "border-green-200 bg-green-50/70",
    medium: "border-amber-200 bg-amber-50/70",
    high: "border-red-200 bg-red-50/70",
};

const RISK_HEADLINE: Record<RiskLevel, string> = {
    low: "Low exposure to silent AI failure",
    medium: "Moderate exposure to silent AI failure",
    high: "High exposure to silent AI failure",
};

export function WorkflowBlueprintPreview({
    workflowId,
}: {
    workflowId: string;
}) {
    // Result is tagged with the id it belongs to, so switching workflows shows
    // the loading state again without the effect having to reset state
    // synchronously on every render pass.
    const [result, setResult] = useState<{
        id: string;
        blueprint: WorkflowBlueprint | null;
        error: string | null;
    } | null>(null);
    const [expanded, setExpanded] = useState<number | null>(null);

    useEffect(() => {
        let cancelled = false;
        getWorkflowBlueprint(workflowId)
            .then(({ blueprint: bp }) => {
                if (!cancelled)
                    setResult({ id: workflowId, blueprint: bp, error: null });
            })
            .catch((e) => {
                if (!cancelled)
                    setResult({
                        id: workflowId,
                        blueprint: null,
                        error:
                            e instanceof Error
                                ? e.message
                                : "Could not map this workflow's steps.",
                    });
            });
        return () => {
            cancelled = true;
        };
    }, [workflowId]);

    const ready = result?.id === workflowId ? result : null;
    const loading = !ready;
    const blueprint = ready?.blueprint ?? null;
    const error = ready?.error ?? null;

    if (loading) {
        return (
            <div className="flex items-start gap-2 px-3 py-4 text-xs text-gray-500">
                <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                <span>
                    Mapping this workflow&apos;s steps, inputs, outputs and
                    failure modes… (first time only — it&apos;s cached after
                    this)
                </span>
            </div>
        );
    }

    if (error || !blueprint) {
        return (
            <p className="px-3 py-4 text-xs text-gray-500">
                {error ?? "No process map is available for this workflow."}
            </p>
        );
    }

    const overview = blueprint.silent_failure_overview;

    return (
        <div className="min-w-0 space-y-3 px-3 py-3">
            <p className="text-xs leading-relaxed text-gray-600">
                {blueprint.summary}
            </p>

            <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Process — {blueprint.steps.length} step
                    {blueprint.steps.length === 1 ? "" : "s"}
                </p>
                <div className="rounded-lg border border-gray-100 bg-white/70 p-2">
                    <WorkflowProcessMap
                        compact
                        steps={blueprint.steps}
                        selected={expanded}
                        onSelect={(position) =>
                            setExpanded((prev) =>
                                prev === position ? null : position,
                            )
                        }
                    />
                </div>
            </div>

            <div
                className={`rounded-lg border p-2.5 ${RISK_BANNER[overview.overall_risk]}`}
            >
                <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-gray-800">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {RISK_HEADLINE[overview.overall_risk]}
                </p>
                {overview.hotspots.length === 0 ? (
                    <p className="text-[11px] leading-snug text-gray-600">
                        No individual step stands out as especially exposed.
                    </p>
                ) : (
                    <ul className="space-y-1">
                        {overview.hotspots.slice(0, 3).map((h) => (
                            <li
                                key={`${h.position}-${h.step_name}`}
                                className="text-[11px] leading-snug text-gray-700"
                            >
                                <span className="font-medium">
                                    Step {h.position} — {h.step_name}
                                </span>
                                <span
                                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${RISK_STYLES[h.risk].chip}`}
                                >
                                    {h.risk}
                                </span>
                                <span className="block text-gray-600">
                                    {h.why}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Steps in detail
                </p>
                <div className="space-y-px">
                    {blueprint.steps.map((step) => {
                        const isOpen = expanded === step.position;
                        return (
                            <div key={step.position} className="rounded-md">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExpanded(
                                            isOpen ? null : step.position,
                                        )
                                    }
                                    className={`flex w-full min-w-0 items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors ${
                                        isOpen
                                            ? "bg-gray-100"
                                            : "hover:bg-gray-50"
                                    }`}
                                >
                                    <span className="shrink-0 text-[10px] font-semibold text-gray-400">
                                        {step.position}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-gray-800">
                                        {step.name}
                                    </span>
                                    <span
                                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${RISK_STYLES[step.silent_failure.risk].chip}`}
                                    >
                                        {step.silent_failure.risk}
                                    </span>
                                    <ChevronDown
                                        className={`h-3 w-3 shrink-0 text-gray-300 transition-transform ${isOpen ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="mt-1 space-y-2 rounded-md bg-white/70 px-3 py-2.5 text-[11px] leading-snug">
                                        <div>
                                            <p className="font-medium text-gray-600">
                                                Objective
                                            </p>
                                            <p className="text-gray-700">
                                                {step.objective}
                                            </p>
                                        </div>
                                        {step.inputs.length > 0 && (
                                            <div>
                                                <p className="font-medium text-gray-600">
                                                    Inputs
                                                </p>
                                                <ul className="list-inside list-disc text-gray-600">
                                                    {step.inputs.map((io, i) => (
                                                        <li key={i}>
                                                            {io.name}{" "}
                                                            <span className="text-gray-400">
                                                                · {io.source}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {step.outputs.length > 0 && (
                                            <div>
                                                <p className="font-medium text-gray-600">
                                                    Outputs
                                                </p>
                                                <ul className="list-inside list-disc text-gray-600">
                                                    {step.outputs.map(
                                                        (io, i) => (
                                                            <li key={i}>
                                                                {io.name}{" "}
                                                                <span className="text-gray-400">
                                                                    · {io.source}
                                                                </span>
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                        {step.quality_criteria.length > 0 && (
                                            <div>
                                                <p className="font-medium text-gray-600">
                                                    Success criteria — the
                                                    senior-partner review checks
                                                    each of these
                                                </p>
                                                <ul className="list-inside list-disc text-gray-600">
                                                    {step.quality_criteria.map(
                                                        (c) => (
                                                            <li key={c.id}>
                                                                {c.criterion}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                        {step.silent_failure.modes.length >
                                            0 && (
                                            <div>
                                                <p className="font-medium text-gray-600">
                                                    How this step can fail
                                                    silently
                                                </p>
                                                <ul className="list-inside list-disc text-gray-600">
                                                    {step.silent_failure.modes.map(
                                                        (m, i) => (
                                                            <li key={i}>{m}</li>
                                                        ),
                                                    )}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
