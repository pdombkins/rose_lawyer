"use client";

/**
 * Scanner-proof invitation landing page.
 *
 * Corporate mail gateways (UNSW's included) fetch every URL in an inbound
 * message to scan it. Supabase's raw `action_link` is a single-use GET, so that
 * automated fetch redeemed the token before the student ever clicked — the
 * whole LAWS3850 cohort was burned this way on 25 Jul 2026.
 *
 * So this page does NOTHING on mount. It renders static HTML that a scanner can
 * fetch as many times as it likes. The token is only redeemed inside an
 * onClick handler, which a link scanner will never fire.
 *
 * `detectSessionInUrl` is irrelevant here: the token arrives as a query
 * parameter we read ourselves, not as a URL hash for the client to auto-parse.
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/app/lib/supabase";
import { Button } from "@/app/components/ui/button";
import { SiteLogo } from "@/app/components/site-logo";

const authGlassCardClassName =
    "rounded-2xl border border-white/70 bg-white/72 p-8 shadow-[0_4px_14px_rgba(15,23,42,0.045),inset_0_1px_0_rgba(255,255,255,0.86),inset_0_-8px_18px_rgba(255,255,255,0.12)] backdrop-blur-2xl";

function AcceptInvitation() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const tokenHash = searchParams.get("token_hash");
    const type = (searchParams.get("type") ?? "invite") as EmailOtpType;
    // The backend sets ?setup=1 whenever this person still needs to choose a
    // password — true for every invite, and also for magiclink re-sends to
    // accounts that were provisioned but never actually claimed by their owner.
    const isSetup = searchParams.get("setup") === "1" || type === "invite";

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAccept = async () => {
        if (!tokenHash) {
            setError("This link is missing its invitation token.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.verifyOtp({
                token_hash: tokenHash,
                type,
            });
            if (error) throw error;

            router.replace(isSetup ? "/reset-password?setup=1" : "/assistant");
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "We couldn't accept this invitation.",
            );
            setLoading(false);
        }
    };

    const missingToken = !tokenHash;

    return (
        <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="mb-8 flex justify-center">
                    <SiteLogo />
                </div>
                <div className={authGlassCardClassName}>
                    <h1 className="text-xl font-semibold text-gray-900">
                        Accept your invitation
                    </h1>
                    <p className="mt-2 text-sm text-gray-600">
                        You&rsquo;ve been invited to Rose, an AI legal assistant
                        for research and educational use. Click below to
                        activate your account.
                    </p>

                    {error && (
                        <div className="mt-5 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">
                            <p>{error}</p>
                            <p className="mt-1.5 text-red-600">
                                Invitation links expire after 24 hours. Ask your
                                course convenor to re-send yours, or{" "}
                                <a
                                    href="/login"
                                    className="font-medium underline"
                                >
                                    sign in
                                </a>{" "}
                                if you&rsquo;ve already set a password.
                            </p>
                        </div>
                    )}

                    {missingToken && !error && (
                        <div className="mt-5 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                            This link is missing its invitation token. Please
                            open the link from your invitation email directly.
                        </div>
                    )}

                    <Button
                        onClick={handleAccept}
                        disabled={loading || missingToken}
                        className="mt-6 w-full"
                    >
                        {loading ? "Activating…" : "Activate my account"}
                    </Button>

                    <p className="mt-6 text-center text-xs text-gray-400">
                        Rose — research &amp; educational use only. Not legal
                        advice.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AcceptPage() {
    return (
        <Suspense fallback={null}>
            <AcceptInvitation />
        </Suspense>
    );
}
