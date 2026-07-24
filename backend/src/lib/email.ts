/**
 * Outbound transactional email via Resend.
 *
 * This is the same transport the P2 notification service uses, extracted so
 * other flows (e.g. group/class invitations) can send their own branded email
 * WITHOUT going through Supabase Auth's built-in mailer — which on the default
 * project is rate-limited to a handful of messages per hour
 * (over_email_send_rate_limit) and cannot deliver a whole class at once.
 *
 * Env: RESEND_API_KEY (required to send), NOTIFICATIONS_FROM_EMAIL (from addr).
 * When RESEND_API_KEY is unset, isEmailConfigured() is false and sendEmail()
 * returns { ok: false } rather than throwing, so callers can degrade cleanly.
 */

const FROM_ADDRESS =
  process.env.NOTIFICATIONS_FROM_EMAIL ||
  "Rose <onboarding@resend.dev>";

/** True when an outbound email transport is configured for this instance. */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text fallback. */
  text?: string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (!resendKey) return { ok: false, error: "RESEND_API_KEY is not set" };

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        ...(args.text ? { text: args.text } : {}),
      }),
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return {
        ok: false,
        error: `Resend responded ${resp.status}: ${body.slice(0, 300)}`,
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "email send failed",
    };
  }
}

/** Minimal HTML escaping for interpolating user-controlled text into email. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
