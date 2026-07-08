import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Transactional email (Resend) — used to send a user the URL of a look they just
 * generated, so they come back. Provider is isolated behind sendLookReadyEmail()
 * so it can be swapped later without touching the generation routes.
 *
 * NON-BLOCKING + no-op when unconfigured: a send failure is swallowed so it can
 * never break the generation response (mirrors the mailchimp helper conventions).
 */

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL;
const FROM_NAME = "OneTap Atelier";

export function isEmailConfigured(): boolean {
  return Boolean(API_KEY && FROM);
}

/**
 * From header WITH a display name so the inbox shows "OneTap Atelier" (not the
 * bare address / account name). Honors an env value that already includes a name.
 */
function fromHeader(): string {
  if (!FROM) return "";
  return FROM.includes("<") ? FROM : `${FROM_NAME} <${FROM}>`;
}

interface LookEmailOpts {
  lookUrl: string;
  posterUrl?: string;
  /** e.g. "360° video" | "film" — used in the subject/copy. */
  kindLabel: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Minimal, email-client-safe HTML: eyebrow, headline, line, poster (optional), CTA. */
function lookEmailHtml({ lookUrl, posterUrl }: LookEmailOpts): string {
  const url = esc(lookUrl);
  const poster = posterUrl
    ? `<a href="${url}" style="text-decoration:none"><img src="${esc(posterUrl)}" alt="Your look" width="280" style="display:block;border:0;border-radius:14px;max-width:100%;margin:0 auto 26px" /></a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f5f5;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#111111">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border-radius:16px;padding:36px 32px;text-align:center">
      <tr><td>
        <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#8a8a8a;margin-bottom:18px">OneTap Atelier</div>
        <div style="font-size:22px;line-height:1.25;font-weight:600;margin-bottom:8px">The piece, on you.</div>
        <div style="font-size:15px;line-height:1.55;color:#6b6b6b;margin-bottom:26px">See yourself wearing the piece. It is waiting in your closet.</div>
        ${poster}
        <a href="${url}" style="display:inline-block;background:#111111;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:14px 30px;border-radius:999px">See it on yourself</a>
        <div style="font-size:12px;color:#b0b0b0;margin-top:22px"><a href="${url}" style="color:#b0b0b0;text-decoration:underline">Copy link to share</a></div>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

/** Send the "your look is ready" email. No-op when unconfigured; never throws. */
export async function sendLookReadyEmail(
  email: string | null | undefined,
  opts: LookEmailOpts,
): Promise<void> {
  if (!isEmailConfigured() || !email) return;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromHeader(),
        to: [email],
        subject: "Your video try-on is ready",
        html: lookEmailHtml(opts),
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.warn(`[email] resend → ${res.status} ${detail.slice(0, 300)}`);
    }
  } catch (err) {
    console.warn("[email] sendLookReadyEmail failed (non-blocking):", err);
  }
}

/** Resolve the user's email (service role) and send the look-ready email. */
export async function sendLookReadyEmailToUser(
  userId: string | null | undefined,
  opts: LookEmailOpts,
): Promise<void> {
  if (!isEmailConfigured() || !userId) return;
  try {
    const db = createServiceClient();
    if (!db) return;
    const { data } = await db
      .from("profiles")
      .select("email")
      .eq("user_id", userId)
      .maybeSingle();
    await sendLookReadyEmail(data?.email as string | undefined, opts);
  } catch (err) {
    console.warn("[email] sendLookReadyEmailToUser failed (non-blocking):", err);
  }
}
