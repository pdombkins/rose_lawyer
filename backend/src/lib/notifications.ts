/**
 * P2 — Notification service.
 * In-app notifications always; email is optional and env-gated via
 * RESEND_API_KEY (silently in-app-only when unset). Per-user email opt-in
 * lives on user_profiles.email_notifications.
 */

import { createServerSupabase } from "./supabase";
import { devLog } from "./chat/types";
import { frontendBaseUrl } from "./urls";

export type NotificationKind =
    | "agent_run"
    | "tabular_review"
    | "regwatch"
    | "deadline"
    | "system";

export type NotifyArgs = {
    userId: string;
    kind: NotificationKind;
    title: string;
    body?: string;
    /** In-app path, e.g. `/agents/<id>` */
    link?: string;
    /** Force-skip email even if the user opted in (e.g. digest batching). */
    skipEmail?: boolean;
};

/**
 * WHICH KINDS MAY EVER BE EMAILED. Everything else is in-app only.
 *
 * Deny by default, and decided here rather than at each call site, so a
 * notification kind added later cannot start mailing 36 students because
 * somebody forgot a flag.
 *
 * Excluded on Peter's instruction (2 Aug 2026), for one reason — volume in a
 * teaching cohort:
 *   · `deadline`    — the case study ships 49 tasks all deliberately overdue,
 *                     so a daily sweep would chase students about work that is
 *                     meant to be late.
 *   · `agent_run`   — one per completed run. A Week-8 session is several runs
 *                     per student across 36 students.
 *   · `tabular_review` — same, per completed review.
 * All three still raise the in-app bell; only the email is suppressed.
 *
 * `regwatch` and `system` stay emailable: regwatch is a genuine
 * out-of-band alert about a regulatory change, and `system` carries budget
 * warnings a user would want even when not signed in. Both are low-volume.
 */
const EMAILABLE_KINDS: ReadonlySet<NotificationKind> = new Set([
    "regwatch",
    "system",
]);

const FROM_ADDRESS =
    process.env.NOTIFICATIONS_FROM_EMAIL || "Rose <onboarding@resend.dev>";

export async function notify(args: NotifyArgs): Promise<void> {
    const db = createServerSupabase();
    const { error } = await db.from("notifications").insert({
        user_id: args.userId,
        kind: args.kind,
        title: args.title,
        body: args.body ?? null,
        link: args.link ?? null,
    });
    if (error) {
        devLog("[notifications] insert failed:", error.message);
        return;
    }
    if (!args.skipEmail && EMAILABLE_KINDS.has(args.kind)) {
        void sendEmailIfEnabled(args).catch((err) =>
            devLog("[notifications] email failed:", err),
        );
    }
}

async function sendEmailIfEnabled(args: NotifyArgs): Promise<void> {
    const resendKey = process.env.RESEND_API_KEY?.trim();
    if (!resendKey) return; // email disabled instance-wide

    const db = createServerSupabase();
    const { data: profile } = await db
        .from("user_profiles")
        .select("email_notifications")
        .eq("user_id", args.userId)
        .maybeSingle();
    if (!profile?.email_notifications) return; // user has not opted in

    const { data: userData } = await db.auth.admin.getUserById(args.userId);
    const email = userData?.user?.email;
    if (!email) return;

    const appUrl = frontendBaseUrl();
    const linkHtml = args.link
        ? `<p><a href="${appUrl}${args.link}">Open in Rose</a></p>`
        : "";
    await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [email],
            subject: `[Rose] ${args.title}`,
            html: `<p>${args.title}</p>${args.body ? `<p>${args.body}</p>` : ""}${linkHtml}<p style="color:#888;font-size:12px">Rose — research & educational use only.</p>`,
        }),
    });
}
