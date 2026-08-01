"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { use } from "react";

/**
 * Kendry & Slate, inside Rose's app shell.
 *
 * WHY THIS EXISTS
 * `/firm` is the K&S single-page app, served straight off Cloudflare's asset
 * layer by app/firm/[[...slug]]/route.ts. That route deliberately sits OUTSIDE
 * the (pages) layout, so the moment a user crossed into K&S they left Rose's
 * React tree and Rose's twelve-item sidebar disappeared with it. A lawyer
 * working a matter had no way back to Rose's tools without a page switch.
 *
 * This page is the same K&S app rendered INSIDE the (pages) layout, so
 * AppSidebar stays on the left and every Rose feature is one ordinary
 * navigation away while you work the matter.
 *
 * WHY A WRAPPER PATH RATHER THAN NESTING /firm ITSELF
 * The K&S bundle is built with `BrowserRouter basename="/firm"`, so its router
 * only matches paths under /firm. If this page lived at /firm it would shadow
 * the very URL the frame needs to load. So the shell lives at /workspace and
 * frames /firm — no change to the K&S build, no change to the asset route.
 * Static assets under /firm/assets/* are matched by Cloudflare before the
 * Worker runs either way, so they are unaffected.
 *
 * URL SYNC
 * Navigation inside the frame does not change the host URL, which would break
 * refresh and deep links. K&S posts its route to the parent on every change
 * (see ks-frontend RouteBridge) and we mirror it into the address bar with
 * replaceState — no reload, no history spam, and a refresh lands where you
 * were.
 */

const DEFAULT_ROUTE = "dashboard";

/** Only same-origin, /firm-shaped paths are ever accepted from the frame. */
function safeRoute(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    // Reject anything that could be read as another origin or a scheme.
    if (!raw.startsWith("/") || raw.startsWith("//")) return null;
    if (!raw.startsWith("/firm")) return null;
    return raw.slice("/firm".length).replace(/^\//, "") || DEFAULT_ROUTE;
}

export default function WorkspacePage({
    params,
}: {
    params: Promise<{ slug?: string[] }>;
}) {
    const { slug } = use(params);
    const initialRoute = useMemo(
        () => (slug && slug.length > 0 ? slug.join("/") : DEFAULT_ROUTE),
        [slug],
    );

    // The iframe src is set once. Re-rendering it on every route change would
    // reload the K&S app and lose its state, so after mount the frame owns its
    // own navigation and we only mirror the URL.
    const [src] = useState(() => `/firm/${initialRoute}`);
    const frameRef = useRef<HTMLIFrameElement | null>(null);

    const onMessage = useCallback((event: MessageEvent) => {
        // Same-origin only. K&S is served from this origin; anything else is
        // not ours to trust.
        if (event.origin !== window.location.origin) return;
        const data = event.data as { type?: string; path?: string } | null;
        if (!data || data.type !== "ks:route") return;
        const route = safeRoute(data.path);
        if (!route) return;
        const next = `/workspace/${route}`;
        if (window.location.pathname !== next) {
            window.history.replaceState(null, "", next);
        }
    }, []);

    useEffect(() => {
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [onMessage]);

    return (
        <div className="h-full w-full min-h-0">
            <iframe
                ref={frameRef}
                src={src}
                title="Kendry & Slate"
                className="h-full w-full border-0"
                // Same origin, so the frame shares the Supabase session and can
                // talk to us via postMessage. allow-top-navigation is omitted:
                // nothing inside K&S can navigate Rose out from under the user.
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads allow-modals"
            />
        </div>
    );
}
