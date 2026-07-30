/**
 * SPA fallback for the Kendry & Slate app served at /firm.
 *
 * Static files under /firm (index.html, assets/*, images) are matched by
 * Cloudflare's asset layer BEFORE the Worker runs, so they never reach this
 * handler. Only unmatched client-side routes — /firm/dashboard,
 * /firm/dashboard/matter/:id and friends — fall through to here, and we return
 * the SPA shell so React Router can take over.
 *
 * TWO EARLIER APPROACHES FAILED, both instructively:
 *
 *  1. A `_redirects` rule `/firm/* -> /firm/index.html 200`. Cloudflare
 *     rejects it at deploy time: its html_handling canonicalises the
 *     destination back to /firm/, which re-matches the rule ("Infinite loop
 *     detected"). A splat there would also have shadowed real asset requests.
 *
 *  2. `fetch(`${origin}/firm/index.html`)` from inside this handler. A Worker
 *     subrequest to its own hostname does not reach the asset layer, so it
 *     failed and this handler returned its own 502.
 *
 * The ASSETS binding is the supported way to read a static asset from Worker
 * code, so that is what this uses. `next dev` has no Cloudflare context, so
 * there is a filesystem fallback for local development.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const SHELL_PATH = "/firm/index.html";

/** Diagnostics are reported on failure so a broken deploy explains itself
 *  instead of returning a bare 5xx. No secrets are included. */
type ShellResult = { html: string; via: string } | { html: null; trace: string[] };

async function loadShell(request: Request): Promise<ShellResult> {
    const trace: string[] = [];

    // Production: read the asset through the Cloudflare binding.
    try {
        const { getCloudflareContext } = await import("@opennextjs/cloudflare");
        const ctx = await getCloudflareContext({ async: true });
        const assets = (
            ctx?.env as unknown as {
                ASSETS?: { fetch: (req: Request) => Promise<Response> };
            }
        )?.ASSETS;
        if (!assets) {
            trace.push("ASSETS binding not present on the Cloudflare env");
        } else {
            const url = new URL(SHELL_PATH, request.url);
            const res = await assets.fetch(
                new Request(url, { headers: { accept: "text/html" } }),
            );
            if (res.ok) return { html: await res.text(), via: "ASSETS binding" };
            trace.push(`ASSETS.fetch(${SHELL_PATH}) returned ${res.status}`);
        }
    } catch (err) {
        trace.push(
            `Cloudflare context unavailable: ${err instanceof Error ? err.message : String(err)}`,
        );
    }

    // Development: read straight from public/.
    try {
        const html = await readFile(
            path.join(process.cwd(), "public", "firm", "index.html"),
            "utf8",
        );
        return { html, via: "filesystem" };
    } catch (err) {
        trace.push(
            `filesystem read failed: ${err instanceof Error ? err.message : String(err)}`,
        );
    }

    return { html: null, trace };
}

export async function GET(request: Request) {
    const result = await loadShell(request);

    if (result.html === null) {
        return new Response(
            [
                "Kendry & Slate could not be served.",
                "",
                "The SPA shell (/firm/index.html) could not be loaded. Attempts:",
                ...result.trace.map((t) => `  · ${t}`),
                "",
                "If this persists, run `npm run build:firm` and redeploy.",
            ].join("\n"),
            { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
        );
    }

    const shell = result.html;

    return new Response(shell, {
        status: 200,
        headers: {
            "content-type": "text/html; charset=utf-8",
            // Asset URLs inside the shell are content-hashed, so the shell
            // itself must not be cached or deploys won't take effect.
            "cache-control": "no-store",
        },
    });
}
