"use client";

import { useCallback, useEffect, useState } from "react";
import {
    getNotifications,
    markNotificationsRead,
    type AppNotification,
} from "@/app/lib/roseApi";

const POLL_MS = 60_000;
const INITIAL_LIMIT = 50;
const LIMIT_INCREMENT = 50;

export function useNotifications(enabled: boolean) {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [limit, setLimit] = useState(INITIAL_LIMIT);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const refresh = useCallback(async () => {
        try {
            // Fetch one extra row past the current page so we know whether
            // there's more to load — same "growing limit" pattern used
            // elsewhere in the app, sized down for this small dropdown.
            const data = await getNotifications(false, limit + 1);
            setNotifications(data.notifications.slice(0, limit));
            setHasMore(data.notifications.length > limit);
            setUnreadCount(data.unreadCount);
        } catch {
            /* transient — keep last state */
        }
    }, [limit]);

    useEffect(() => {
        if (!enabled) return;
        void refresh();
        const timer = setInterval(() => void refresh(), POLL_MS);
        return () => clearInterval(timer);
    }, [enabled, refresh]);

    const loadMore = useCallback(() => {
        setLoadingMore(true);
        setLimit((prev) => prev + LIMIT_INCREMENT);
    }, []);

    // Once `limit` grows, `refresh` (recreated with the new limit) reruns via
    // the effect above only when `enabled`/`refresh` change — trigger it
    // explicitly here so "Load more" clicks while the dropdown is already
    // open still refetch.
    useEffect(() => {
        if (limit === INITIAL_LIMIT) return;
        void refresh().finally(() => setLoadingMore(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [limit]);

    const markRead = useCallback(
        async (ids?: string[]) => {
            try {
                await markNotificationsRead(ids);
            } finally {
                void refresh();
            }
        },
        [refresh],
    );

    return { notifications, unreadCount, hasMore, loadingMore, loadMore, refresh, markRead };
}
