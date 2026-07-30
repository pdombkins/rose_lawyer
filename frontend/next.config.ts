import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    reactCompiler: true,
    async rewrites() {
        return {
            beforeFiles: [],
            afterFiles: [
                {
                    source: "/sitemap.xml",
                    destination: "/api/sitemap/sitemap.xml",
                },
                {
                    source: "/sitemap_:slug.xml",
                    destination: "/api/sitemap/sitemap_:slug.xml",
                },
            ],
            fallback: [],
        };
    },
    // NOTE: there is deliberately no /firm rewrite here. `afterFiles` rewrites
    // are evaluated BEFORE dynamic routes, so a rewrite to /firm/index.html
    // would shadow the SPA fallback handler at src/app/firm/[[...slug]]/route.ts
    // and 404 (the destination isn't a Next route). The route handler covers
    // deep links; static files under /firm are served by the filesystem step
    // in dev and by Cloudflare's asset layer in production.
    skipTrailingSlashRedirect: true,
};

export default nextConfig;
