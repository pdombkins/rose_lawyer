"use client";

/**
 * Workflow process map.
 *
 * Lays the blueprint's steps out as a DAG: steps are banded into columns by
 * dependency depth, so anything in the same column runs in parallel, and SVG
 * connectors show what feeds what. Used in two places:
 *   * the workflow overview page, as a static map of the process;
 *   * the run page, where `statusByPosition` lights up the step in flight.
 *
 * Layout is computed rather than authored, so it stays correct when a
 * workflow is edited and the blueprint regenerates.
 */

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { BlueprintStep, RiskLevel } from "@/app/lib/roseApi";

export type StepRunStatus =
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "skipped"
    | "reworking";

const ROLE_STYLES: Record<
    BlueprintStep["role"],
    { chip: string; border: string; dot: string }
> = {
    intake: {
        chip: "bg-slate-100 text-slate-700",
        border: "border-slate-300",
        dot: "bg-slate-400",
    },
    research: {
        chip: "bg-emerald-100 text-emerald-800",
        border: "border-emerald-300",
        dot: "bg-emerald-500",
    },
    drafting: {
        chip: "bg-indigo-100 text-indigo-800",
        border: "border-indigo-300",
        dot: "bg-indigo-500",
    },
    review: {
        chip: "bg-amber-100 text-amber-800",
        border: "border-amber-300",
        dot: "bg-amber-500",
    },
    verify: {
        chip: "bg-sky-100 text-sky-800",
        border: "border-sky-300",
        dot: "bg-sky-500",
    },
};

export const RISK_STYLES: Record<RiskLevel, { chip: string; label: string }> = {
    low: { chip: "bg-green-100 text-green-800", label: "Low risk" },
    medium: { chip: "bg-amber-100 text-amber-800", label: "Medium risk" },
    high: { chip: "bg-red-100 text-red-700", label: "High risk" },
};

const STATUS_RING: Record<StepRunStatus, string> = {
    pending: "",
    running: "ring-2 ring-indigo-400 ring-offset-1",
    reworking: "ring-2 ring-amber-400 ring-offset-1",
    completed: "ring-1 ring-green-300",
    failed: "ring-2 ring-red-400 ring-offset-1",
    skipped: "opacity-50",
};

/** Longest-path depth, so a step sits to the right of everything it needs. */
function computeDepths(steps: BlueprintStep[]): Map<number, number> {
    const byPosition = new Map(steps.map((s) => [s.position, s]));
    const depths = new Map<number, number>();
    const visit = (position: number, seen: Set<number>): number => {
        if (depths.has(position)) return depths.get(position)!;
        if (seen.has(position)) return 0; // cycle guard
        seen.add(position);
        const step = byPosition.get(position);
        const deps = step?.depends_on ?? [];
        const depth = deps.length
            ? Math.max(...deps.map((d) => visit(d, seen))) + 1
            : 0;
        depths.set(position, depth);
        return depth;
    };
    for (const s of steps) visit(s.position, new Set());
    return depths;
}

type Props = {
    steps: BlueprintStep[];
    statusByPosition?: Record<number, StepRunStatus>;
    selected?: number | null;
    onSelect?: (position: number) => void;
    /** Hide the per-step risk chips (the run page shows review state instead). */
    showRisk?: boolean;
};

export function WorkflowProcessMap({
    steps,
    statusByPosition,
    selected,
    onSelect,
    showRisk = true,
}: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef(new Map<number, HTMLElement>());
    const [edges, setEdges] = useState<
        { key: string; d: string; active: boolean }[]
    >([]);
    const [size, setSize] = useState({ width: 0, height: 0 });

    const columns = useMemo(() => {
        const depths = computeDepths(steps);
        const grouped = new Map<number, BlueprintStep[]>();
        for (const s of steps) {
            const d = depths.get(s.position) ?? 0;
            const list = grouped.get(d) ?? [];
            list.push(s);
            grouped.set(d, list);
        }
        return [...grouped.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([depth, items]) => ({
                depth,
                items: items.sort((a, b) => a.position - b.position),
            }));
    }, [steps]);

    // Connectors are drawn from measured DOM positions so they stay attached
    // when the cards reflow (wrapping, long objectives, narrow screens).
    useLayoutEffect(() => {
        const draw = () => {
            const container = containerRef.current;
            if (!container) return;
            const base = container.getBoundingClientRect();
            setSize({ width: base.width, height: base.height });
            const next: { key: string; d: string; active: boolean }[] = [];
            for (const step of steps) {
                const toEl = nodeRefs.current.get(step.position);
                if (!toEl) continue;
                const to = toEl.getBoundingClientRect();
                for (const dep of step.depends_on) {
                    const fromEl = nodeRefs.current.get(dep);
                    if (!fromEl) continue;
                    const from = fromEl.getBoundingClientRect();
                    const x1 = from.right - base.left;
                    const y1 = from.top + from.height / 2 - base.top;
                    const x2 = to.left - base.left;
                    const y2 = to.top + to.height / 2 - base.top;
                    const mid = x1 + Math.max(16, (x2 - x1) / 2);
                    next.push({
                        key: `${dep}-${step.position}`,
                        d: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
                        active:
                            statusByPosition?.[step.position] === "running" ||
                            statusByPosition?.[step.position] === "reworking",
                    });
                }
            }
            setEdges(next);
        };
        draw();
        const observer = new ResizeObserver(draw);
        if (containerRef.current) observer.observe(containerRef.current);
        window.addEventListener("resize", draw);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", draw);
        };
    }, [steps, statusByPosition, columns]);

    if (steps.length === 0) {
        return (
            <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
                No steps have been mapped for this workflow yet.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto pb-2">
            <div
                ref={containerRef}
                className="relative flex min-w-max items-stretch gap-10"
            >
                <svg
                    className="pointer-events-none absolute inset-0"
                    width={size.width || "100%"}
                    height={size.height || "100%"}
                    aria-hidden="true"
                >
                    <defs>
                        <marker
                            id="wf-arrow"
                            markerWidth="7"
                            markerHeight="7"
                            refX="6"
                            refY="3.5"
                            orient="auto"
                        >
                            <path d="M0,0 L7,3.5 L0,7 z" fill="#9ca3af" />
                        </marker>
                    </defs>
                    {edges.map((e) => (
                        <path
                            key={e.key}
                            d={e.d}
                            fill="none"
                            stroke={e.active ? "#6366f1" : "#d1d5db"}
                            strokeWidth={e.active ? 2 : 1.5}
                            markerEnd="url(#wf-arrow)"
                        />
                    ))}
                </svg>

                {columns.map((column) => (
                    <div
                        key={column.depth}
                        className="relative z-10 flex w-64 shrink-0 flex-col gap-4"
                    >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                            {column.depth === 0
                                ? "Start"
                                : `Stage ${column.depth + 1}`}
                            {column.items.length > 1 && (
                                <span className="ml-1 font-normal normal-case tracking-normal text-gray-400">
                                    · {column.items.length} in parallel
                                </span>
                            )}
                        </p>
                        {column.items.map((step) => {
                            const style = ROLE_STYLES[step.role];
                            const status =
                                statusByPosition?.[step.position] ?? "pending";
                            const isSelected = selected === step.position;
                            return (
                                <button
                                    key={step.position}
                                    type="button"
                                    ref={(el) => {
                                        if (el)
                                            nodeRefs.current.set(
                                                step.position,
                                                el,
                                            );
                                        else
                                            nodeRefs.current.delete(
                                                step.position,
                                            );
                                    }}
                                    onClick={() => onSelect?.(step.position)}
                                    className={`rounded-xl border bg-white p-3 text-left shadow-sm transition-all ${style.border} ${
                                        STATUS_RING[status]
                                    } ${
                                        isSelected
                                            ? "border-gray-900 shadow-md"
                                            : onSelect
                                              ? "hover:shadow-md"
                                              : ""
                                    } ${onSelect ? "cursor-pointer" : "cursor-default"}`}
                                >
                                    <div className="mb-1.5 flex items-center gap-1.5">
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
                                        />
                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                            Step {step.position}
                                        </span>
                                        <span
                                            className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-medium ${style.chip}`}
                                        >
                                            {step.role}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium leading-snug text-gray-900">
                                        {step.name}
                                    </p>
                                    <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-gray-500">
                                        {step.objective}
                                    </p>
                                    <div className="mt-2 flex flex-wrap items-center gap-1">
                                        {showRisk && (
                                            <span
                                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                                    RISK_STYLES[
                                                        step.silent_failure.risk
                                                    ].chip
                                                }`}
                                                title="Exposure to silent AI failure"
                                            >
                                                {
                                                    RISK_STYLES[
                                                        step.silent_failure.risk
                                                    ].label
                                                }
                                            </span>
                                        )}
                                        {status === "running" && (
                                            <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
                                                Running now
                                            </span>
                                        )}
                                        {status === "reworking" && (
                                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                                                Sent back for rework
                                            </span>
                                        )}
                                        {status === "completed" && (
                                            <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">
                                                Done
                                            </span>
                                        )}
                                        {status === "failed" && (
                                            <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                                                Failed
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
