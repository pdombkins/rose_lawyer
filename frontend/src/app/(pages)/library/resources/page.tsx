"use client";

/**
 * Library → Legal resources.
 *
 * A single combined reference list (jurisdiction, title, link) merging what
 * used to be two separate design docs: australian-legal-sources-map.md
 * (what legislation/case-law sources exist, per jurisdiction) and
 * citation-verification-gate.md (how Rose validates a citation without
 * breaching AustLII's / Jade's terms). See backend/src/lib/legalResources.ts
 * for the underlying data.
 *
 * Every entry is labelled with whether Rose (the AI) can actually query it
 * today, or whether it's user-only — i.e. the person has to open the link
 * themselves and (for citations) record their own verified/not-verified
 * outcome. That split depends on the live "Jade access approved" admin
 * toggle, so this page always reflects current instance configuration
 * rather than a fixed assumption.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ExternalLink,
    Loader2,
    ScrollText,
    ShieldCheck,
    UserCheck,
} from "lucide-react";
import { PageHeader } from "@/app/components/shared/PageHeader";
import { TableToolbar } from "@/app/components/shared/TableToolbar";
import { LIBRARY_TABS } from "@/app/components/library/LibraryWorkspace";
import {
    getLegalResources,
    type LegalResource,
    type LegalResourceCategory,
} from "@/app/lib/roseApi";

const CATEGORY_LABEL: Record<LegalResourceCategory, string> = {
    validation: "Case & legislation citation validation",
    legislation: "Legislation — official registers",
    case_law: "Case law — official / first-party sources",
    regulatory_feed: "Regulatory monitoring feeds (auto-fetched)",
};

const CATEGORY_ORDER: LegalResourceCategory[] = [
    "validation",
    "case_law",
    "legislation",
    "regulatory_feed",
];

function AccessBadge({ resource }: { resource: LegalResource }) {
    if (resource.aiAccessible) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <ShieldCheck className="h-3 w-3" /> AI-accessible
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-700">
            <UserCheck className="h-3 w-3" /> User-only
        </span>
    );
}

export default function LegalResourcesPage() {
    const router = useRouter();
    const [resources, setResources] = useState<LegalResource[] | null>(null);
    const [jadeApproved, setJadeApproved] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void getLegalResources()
            .then((res) => {
                setResources(res.resources);
                setJadeApproved(res.jadeAccessApproved);
            })
            .catch((e) =>
                setError(
                    e instanceof Error
                        ? e.message
                        : "Failed to load legal resources",
                ),
            );
    }, []);

    const grouped = useMemo(() => {
        const byCategory = new Map<LegalResourceCategory, LegalResource[]>();
        for (const r of resources ?? []) {
            const list = byCategory.get(r.category) ?? [];
            list.push(r);
            byCategory.set(r.category, list);
        }
        return CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => ({
            category: c,
            items: (byCategory.get(c) ?? []).sort((a, b) =>
                a.jurisdiction === b.jurisdiction
                    ? a.title.localeCompare(b.title)
                    : a.jurisdiction.localeCompare(b.jurisdiction),
            ),
        }));
    }, [resources]);

    const aiCount = resources?.filter((r) => r.aiAccessible).length ?? 0;
    const total = resources?.length ?? 0;

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <PageHeader
                breadcrumbs={[
                    { label: "Library" },
                    { label: "Legal resources" },
                ]}
            />
            <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                <TableToolbar
                    items={LIBRARY_TABS}
                    active="resources"
                    onChange={(next) =>
                        router.push(
                            next === "files"
                                ? "/library"
                                : next === "clauses"
                                  ? "/clauses"
                                  : next === "resources"
                                    ? "/library/resources"
                                    : "/library/templates",
                        )
                    }
                />
                <div className="mx-4 flex-1 overflow-y-auto pb-8 md:mx-6">
                    <p className="mb-4 max-w-3xl text-sm text-gray-500">
                        Every legislation, case-law and citation-validation
                        source Rose references or points you to, in one
                        place. &ldquo;AI-accessible&rdquo; means Rose itself
                        can query the source right now;
                        &ldquo;user-only&rdquo; means Rose never fetches it —
                        you open the link yourself and, for citations,
                        record your own verified / not-verified outcome.
                    </p>

                    {jadeApproved !== null && (
                        <div
                            className={`mb-5 flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                                jadeApproved
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-sky-50 text-sky-700"
                            }`}
                        >
                            <ScrollText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                {jadeApproved
                                    ? `Jade.io access is approved on this instance — ${aiCount} of ${total} resources below are currently AI-accessible.`
                                    : `Jade.io access is not approved on this instance — Rose falls back to AustLII manual verification for all case-law/citation lookups. Currently only ${aiCount} of ${total} resources below (auto-fetched regulatory feeds) are AI-accessible; everything else is user-only. An admin can change this in Admin → Settings.`}
                            </span>
                        </div>
                    )}

                    {error && (
                        <p className="mb-4 text-sm text-red-600">{error}</p>
                    )}

                    {!resources && !error ? (
                        <div className="flex justify-center p-10">
                            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {grouped.map(({ category, items }) => (
                                <section key={category}>
                                    <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                        {CATEGORY_LABEL[category]}
                                    </h2>
                                    <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                        {items.map((r) => (
                                            <li
                                                key={r.id}
                                                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500">
                                                            {r.jurisdiction}
                                                        </span>
                                                        <a
                                                            href={r.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 hover:underline"
                                                        >
                                                            {r.title}
                                                            <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
                                                        </a>
                                                    </div>
                                                    {r.note && (
                                                        <p className="mt-0.5 text-xs text-gray-500">
                                                            {r.note}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="shrink-0">
                                                    <AccessBadge resource={r} />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
