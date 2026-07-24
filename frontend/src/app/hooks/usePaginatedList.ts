"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Shared "growing limit, refetch from top" pagination pattern — the same
 * approach already used by ChatHistoryContext for the chat sidebar. We fetch
 * `limit + 1` rows and slice to `limit`; whether the extra row came back
 * tells us if there's more. `loadMore` bumps the limit and refetches the
 * whole list from the top. Simpler and more consistent with the rest of the
 * app than true offset/cursor pagination, at the cost of re-fetching
 * already-seen rows each time the page grows — fine for the list sizes on
 * this site (admin/reporting views, not infinite feeds).
 *
 * `fetchPage(limit)` should request up to `limit` rows, newest/most relevant
 * first, and return them already sorted — the caller decides how `limit`
 * maps to its own query params. `deps` are extra values (e.g. filters) that,
 * when changed, reset back to the first page and refetch.
 */
export function usePaginatedList<T>(
    fetchPage: (limit: number) => Promise<T[]>,
    deps: readonly unknown[] = [],
    options?: { initialLimit?: number; increment?: number },
) {
    const initialLimit = options?.initialLimit ?? 50;
    const increment = options?.increment ?? 50;

    const [items, setItems] = useState<T[] | null>(null);
    const [limit, setLimit] = useState(initialLimit);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchPageRef = useRef(fetchPage);
    fetchPageRef.current = fetchPage;

    // Filters (or whatever `deps` represents) changed — go back to page one
    // and show the loading state again while the first page refetches.
    useEffect(() => {
        setItems(null);
        setHasMore(false);
        setLimit(initialLimit);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    // Actual fetch, keyed on both the current limit and the filters — so a
    // filter change (which resets limit above) and a "load more" click
    // (which only bumps limit) both land here.
    useEffect(() => {
        let cancelled = false;
        if (limit !== initialLimit) setLoadingMore(true);
        fetchPageRef
            .current(limit + 1)
            .then((data) => {
                if (cancelled) return;
                setItems(data.slice(0, limit));
                setHasMore(data.length > limit);
            })
            .catch(() => {
                if (cancelled) return;
                setItems([]);
                setHasMore(false);
            })
            .finally(() => {
                if (!cancelled) setLoadingMore(false);
            });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [limit, ...deps]);

    const loadMore = useCallback(() => {
        setLimit((prev) => prev + increment);
    }, [increment]);

    const refresh = useCallback(() => {
        setLimit((prev) => {
            // Force the fetch effect to re-run even if limit is unchanged.
            fetchPageRef
                .current(prev + 1)
                .then((data) => {
                    setItems(data.slice(0, prev));
                    setHasMore(data.length > prev);
                })
                .catch(() => {
                    setItems([]);
                    setHasMore(false);
                });
            return prev;
        });
    }, []);

    return { items, hasMore, loadingMore, loadMore, refresh };
}
