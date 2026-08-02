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
 * WHICH KINDS MAY EVER BE EMAILED.
 *
 * **Currently EMPTY: Rose never emails a notification.** Every kind —
 * `agent_run`, `tabular_review`, `deadline`, `regwatch`, `system` — raises the
 * in-app bell and stops there. Peter's instruction, 2 Aug 2026, arrived in two
 * steps (tasks first, then runs and reviews, then the rest).
 *
 * The reason is volume in a teaching cohort of 36: the case study ships 49
 * deliberately overdue tasks, and a single Week-8 session is several agent runs
 * and tabular reviews per student. Nothing here is urgent enough to be worth an
 * inbox.
 *
 * Deny-by-default and decided HERE rather than at each call site, so a
 * notification kind added later cannot start mailing the cohort because
 * somebody forgot a flag. To re-enable one, add its kind to this set — that is
 * the whole change.
 *
 * NB this governs NOTIFICATIONS ONLY. Invitations and password setup still send
 * mail, directly through lib/email.ts, and must keep doing so — that is how a
 * student gets into Rose in the first place.
 */
const EMAILABLE_KINDS: ReadonlySet<NotificationKind> = new Set<NotificationKind>();

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
