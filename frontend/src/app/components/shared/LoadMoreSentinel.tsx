"use client";

import { useEffect, useRef } from "react";

/**
 * Invisible marker that triggers `onLoadMore` once it scrolls near the
 * bottom of the viewport (IntersectionObserver) — literal "scroll to load
 * more" rather than requiring a manual button click. Renders nothing once
 * there's nothing left to load.
 */
export function LoadMoreSentinel({
    hasMore,
    loading,
    onLoadMore,
}: {
    hasMore: boolean;
    loading: boolean;
    onLoadMore: () => void;
}) {
    const ref = useRef<HTMLDivElement | null>(null);
    const onLoadMoreRef = useRef(onLoadMore);

    useEffect(() => {
        onLoadMoreRef.current = onLoadMore;
    }, [onLoadMore]);

    useEffect(() => {
        if (!hasMore) return;
        const node = ref.current;
        if (!node || typeof IntersectionObserver === "undefined") return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) onLoadMoreRef.current();
            },
            { rootMargin: "200px" },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [hasMore]);

    if (!hasMore) return null;

    return (
        <div
            ref={ref}
            className="flex justify-center py-4 text-xs text-gray-400"
        >
            {loading ? "Loading more…" : "Scroll for more"}
        </div>
    );
}
