/**
 * Invite / magic-link provisioning that survives corporate mail scanners.
 *
 * WHY THIS EXISTS
 * ---------------
 * We used to email Supabase's raw `action_link`. That URL is a single-use
 * GET: hitting it verifies the token, confirms the address and burns it.
 * Enterprise mail gateways (Microsoft Defender Safe Links, Mimecast, Proofpoint
 * URL Defense — UNSW runs one) fetch every link in an inbound message to check
 * it for malware. That automated GET consumed the token seconds after delivery,
 * so by the time the student clicked "Accept invitation" the link was spent and
 * they got "Email link is invalid or has expired".
 *
 * The symptom in the database was unmistakable: 35 student accounts whose
 * `email_confirmed_at` and `last_sign_in_at` were identical to the millisecond
 * and landed 9-35s after `invited_at`, all inside one 2.5-minute window at
 * 4am local time. Nobody signed in — a scanner did.
 *
 * THE FIX
 * -------
 * Don't put a consumable URL in the email. `generateLink` also returns
 * `properties.hashed_token`; we email a link to our own `/accept` page carrying
 * that token as a query parameter. The page is inert on load — a scanner GET
 * renders HTML and nothing else. Only an explicit button click calls
 * `supabase.auth.verifyOtp({ token_hash, type })`, so the token is spent by the
 * human, not the robot.
 *
 * Tokens still expire (Supabase default 24h for invite/magiclink), so the
 * accept page has to handle an expired token gracefully — see the frontend.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { frontendBaseUrl } from "./urls";

type Db = SupabaseClient<any, "public", any>;

/** The one-time-token types our accept page knows how to redeem. */
export type AcceptLinkType = "invite" | "magiclink";

export type InviteLinkResult =
    | { ok: true; acceptUrl: string; type: AcceptLinkType }
    | { ok: false; error: string };

export type CreateAcceptLinkOptions = {
    /**
     * Force the "first-time onboarding" route (accept -> choose a password)
     * even when the token came back as a `magiclink`.
     *
     * Needed because an account can EXIST without its owner ever having set a
     * password — which is exactly the state the scanner incident left the
     * LAWS3850 cohort in. Those students get a magiclink on re-send (the
     * account exists), and without this flag they'd be dropped straight into
     * the app with no password, able to log in only via a fresh magic link
     * every time. Group invites always set this; they are onboarding by
     * definition. Defaults to `type === "invite"`.
     */
    setup?: boolean;
};

/**
 * Provision a one-time token for `email` WITHOUT sending Supabase's own mail,
 * and wrap it in a scanner-safe `/accept` URL for us to deliver via Resend.
 *
 * First-time addresses get an `invite` (which also creates the account).
 * If the account already exists, `invite` errors and we fall back to a
 * `magiclink` so re-sends keep working.
 */
export async function createAcceptLink(
    db: Db,
    email: string,
    options: CreateAcceptLinkOptions = {},
): Promise<InviteLinkResult> {
    // `redirectTo` is retained so the token's stored redirect stays inside our
    // allow-list, but the accept page controls the real post-redemption route.
    const redirectTo = `${frontendBaseUrl()}/login`;

    let hashedToken: string | null = null;
    let type: AcceptLinkType = "invite";

    const invite = await db.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo },
    });

    if (invite.error) {
        const magic = await db.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo },
        });
        if (magic.error) return { ok: false, error: magic.error.message };
        hashedToken = magic.data.properties?.hashed_token ?? null;
        type = "magiclink";
    } else {
        hashedToken = invite.data.properties?.hashed_token ?? null;
        type = "invite";
    }

    if (!hashedToken) {
        return { ok: false, error: "No verification token was generated" };
    }

    const params = new URLSearchParams({ token_hash: hashedToken, type });
    if (options.setup ?? type === "invite") params.set("setup", "1");

    return {
        ok: true,
        acceptUrl: `${frontendBaseUrl()}/accept?${params.toString()}`,
        type,
    };
}
