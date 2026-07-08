import "server-only";
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Basic, DB-backed rate limiting (fixed window) for the sensitive/expensive API
 * touchpoints. Backed by the `hit_rate_limit` Postgres RPC (lib/supabase/schema.sql),
 * so counters are shared across all serverless instances — no Redis needed.
 *
 * FAIL-OPEN by design: if Supabase is unconfigured or the RPC errors we ALLOW the
 * request (and warn). A limiter blip must never take down checkout/generation; the
 * paid-video path stays independently protected by consume_video (fail-closed).
 */

/** A named limit. `windowSec` is the fixed window; `limit` is max hits per window. */
export interface RateLimitRule {
  name: string;
  limit: number;
  windowSec: number;
}

/**
 * Central table of limits — tune here. Authed routes are keyed by user id
 * (stable, unspoofable); anonymous routes fall back to client IP.
 */
export const LIMITS = {
  // AI try-on image — unmetered elsewhere, so this is the primary cap.
  generateImage: { name: "generate-image", limit: 30, windowSec: 600 },
  // AI video / 360 — belt-and-suspenders on top of the consume_video quota.
  generateVideo: { name: "generate-video", limit: 15, windowSec: 600 },
  // AI model-sheet composition.
  composite: { name: "profile-composite", limit: 10, windowSec: 600 },
  // Razorpay object creation (subscribe / topup / cancel).
  billing: { name: "billing", limit: 12, windowSec: 600 },
  // Profile writes (can fan out to Mailchimp on brand change).
  profile: { name: "profile", limit: 40, windowSec: 300 },
  // Public partner-enquiry form (＋ existing honeypot).
  partners: { name: "partners", limit: 5, windowSec: 600 },
  // Admin password check — brute-force defense.
  adminAuth: { name: "admin-auth", limit: 10, windowSec: 900 },
  // Admin URL scrape — fetches arbitrary external URLs.
  scrape: { name: "admin-scrape", limit: 20, windowSec: 600 },
} as const satisfies Record<string, RateLimitRule>;

/** Best-effort caller IP on Vercel: leftmost x-forwarded-for, else x-real-ip. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the window resets (for Retry-After). */
  retryAfter: number;
}

/** Register a hit for `key`. Fails open (allowed) on any backend problem. */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const db = createServiceClient();
  if (!db) return { allowed: true, retryAfter: 0 }; // unconfigured (dev) → no limiting
  try {
    const { data, error } = await db.rpc("hit_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSec,
    });
    if (error || !data) {
      console.warn("[rateLimit] RPC error, failing open:", error?.message);
      return { allowed: true, retryAfter: 0 };
    }
    const allowed = Boolean((data as { allowed?: boolean }).allowed);
    const resetAt = (data as { reset_at?: string }).reset_at;
    const retryAfter = resetAt
      ? Math.max(1, Math.ceil((new Date(resetAt).getTime() - Date.now()) / 1000))
      : windowSec;
    return { allowed, retryAfter };
  } catch (e) {
    console.warn("[rateLimit] threw, failing open:", e);
    return { allowed: true, retryAfter: 0 };
  }
}

/**
 * Guard for the top of a route handler. Returns a ready 429 NextResponse when the
 * caller is over the limit, or null when the request may proceed.
 *
 *   const blocked = await enforceRateLimit(req, { ...LIMITS.generateVideo, id: userId });
 *   if (blocked) return blocked;
 *
 * `id` is the stable identifier (user id) for authed routes; omit it to key by IP.
 */
export async function enforceRateLimit(
  req: Request,
  rule: RateLimitRule & { id?: string | null },
): Promise<NextResponse | null> {
  const who = rule.id || clientIp(req);
  const { allowed, retryAfter } = await rateLimit(
    `${rule.name}:${who}`,
    rule.limit,
    rule.windowSec,
  );
  if (allowed) return null;
  return NextResponse.json(
    { error: "You're going too fast — try again shortly.", code: "RATE_LIMITED" },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}
