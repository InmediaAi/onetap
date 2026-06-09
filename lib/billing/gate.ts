import { useAtelier, type UsageSnapshot } from "@/lib/store";

/**
 * Client-side generation gate. Callable from event handlers (reads the store
 * imperatively, no hooks). A "video" = a 360 spin or a film; photo try-on is
 * free, but every module ultimately produces a video, so all three entry
 * points gate on the same two checks: signed in, and quota remaining.
 */

/** True when the user has at least one video left (allowance + top-ups, or free trial). */
export function hasVideoQuota(u: UsageSnapshot): boolean {
  const active = u.status === "active" && u.planId;
  return active
    ? u.videoLimit - u.videosUsed + u.topupBalance > 0
    : u.freeTrialRemaining > 0;
}

/**
 * Returns true if generation may proceed. Otherwise it opens the right modal
 * (sign-in if logged out, pricing if out of quota) and returns false.
 */
export async function ensureCanGenerateVideo(): Promise<boolean> {
  let s = useAtelier.getState();
  // If the session hasn't resolved yet, fetch it before deciding (avoids a
  // false "sign in" prompt for an already-authenticated user).
  if (!s.profileLoaded) {
    await s.refreshProfile();
    s = useAtelier.getState();
  }
  if (!s.email) {
    s.openSignIn();
    return false;
  }
  if (!hasVideoQuota(s.usage)) {
    s.openPricing();
    return false;
  }
  return true;
}
