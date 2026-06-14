/**
 * "Try-on in Action" — the viral fan reels shown in the auto-scrolling rail on
 * the /fifa landing.
 *
 * URLs come from an env var (no code edits, no DB, no admin):
 *   NEXT_PUBLIC_FIFA_SHOWCASE_URLS = comma-separated public video URLs
 *                                    (e.g. Supabase Storage links).
 *
 * It MUST be NEXT_PUBLIC_* because the rail renders in a client component — only
 * NEXT_PUBLIC vars reach the browser. These are public landing-page assets, so
 * that's fine. NOTE: NEXT_PUBLIC vars are inlined at BUILD time, so changing the
 * list requires a rebuild / redeploy. The rail only renders when ≥1 URL is set.
 */
export interface ShowcaseReel {
  /** Public video URL (Supabase Storage). Autoplays muted + looping in the rail. */
  videoUrl: string;
  /** Optional poster image shown before the video loads. */
  poster?: string;
  /** Optional caption overlay. */
  caption?: string;
  /** Optional view count. */
  views?: string;
  /** Optional click target. */
  href?: string;
}

const RAW = process.env.NEXT_PUBLIC_FIFA_SHOWCASE_URLS ?? "";

export const FIFA_SHOWCASE: ShowcaseReel[] = RAW.split(",")
  .map((u) => u.trim())
  .filter(Boolean)
  .map((videoUrl) => ({ videoUrl }));
