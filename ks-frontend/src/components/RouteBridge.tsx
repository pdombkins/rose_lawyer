import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { isFramed } from "@/lib/isFramed";

/**
 * Keeps K&S and its Rose host in step.
 *
 * K&S runs inside Rose's app shell (Rose page /workspace frames /firm), which
 * gives a lawyer Rose's full sidebar while they work a matter. Two things have
 * to be true for that to feel like one application rather than a page in a box:
 *
 *  1. FRAMED — the host URL must follow the frame. Otherwise the address bar
 *     says /workspace/dashboard while you are three clicks deep in a matter,
 *     and a refresh throws the user back to the dashboard. On every route
 *     change we post the path up; the host mirrors it with replaceState.
 *
 *  2. NOT FRAMED — someone who lands on /firm directly (an old link, a typed
 *     URL) gets bare K&S with no way back to Rose, which is the problem this
 *     whole change exists to fix. So we send them to the shell, preserving the
 *     path they asked for.
 *
 * `isFramed` lives in lib/isFramed.ts because the marketing header needs it too.
 */


export default function RouteBridge() {
    const location = useLocation();

    useEffect(() => {
        const framed = isFramed();
        // basename is /firm, so location.pathname is the app-relative part.
        const full = `/firm${location.pathname}${location.search}`;

        if (!framed) {
            // Escape hatch for direct hits: land in the Rose shell instead,
            // on the same page they asked for.
            const target = `/workspace${location.pathname}${location.search}`;
            window.location.replace(target);
            return;
        }

        window.parent.postMessage(
            { type: "ks:route", path: full },
            window.location.origin,
        );
    }, [location.pathname, location.search]);

    return null;
}
