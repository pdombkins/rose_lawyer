/**
 * Are we running inside Rose's app shell?
 *
 * K&S is framed by the Rose page at /workspace so the sidebar stays visible
 * while a lawyer works a matter. Several components need to know: the route
 * bridge (to mirror the URL up), the marketing header (to not render a second
 * navigation).
 *
 * A cross-origin parent throws on access — and being unable to see the parent
 * still means we are framed, so that case returns true.
 */
export function isFramed(): boolean {
    try {
        return window.self !== window.top;
    } catch {
        return true;
    }
}
