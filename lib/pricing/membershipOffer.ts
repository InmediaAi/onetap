/**
 * Hard-coded "founding members" scarcity meter for the pricing hook.
 *
 * NOT tied to real subscriptions/data — a deterministic monthly curve:
 *   • 1,000 memberships total
 *   • 60% booked on the 1st of the month
 *   • +1% each day, and resets back to 60% on the 1st of the next month
 * Remaining % is the inverse; `sold` = booked% of the 1,000.
 */

export interface MembershipOffer {
  total: number;
  bookedPct: number;
  remainingPct: number;
  sold: number;
  remaining: number;
}

export const OFFER_TOTAL = 1000;
const START_PCT = 60;

export function computeMembershipOffer(now: Date): MembershipOffer {
  const dayOfMonth = now.getDate(); // 1–31; naturally resets each month
  // Day 1 → 60%, +1%/day. Capped below 100 so the bar never fills (remaining ≥ 5%).
  const bookedPct = Math.min(95, START_PCT + (dayOfMonth - 1));
  const remainingPct = 100 - bookedPct;
  const sold = Math.round((bookedPct / 100) * OFFER_TOTAL);
  return {
    total: OFFER_TOTAL,
    bookedPct,
    remainingPct,
    sold,
    remaining: OFFER_TOTAL - sold,
  };
}

/**
 * First-of-month baseline (60%) — used for SSR + first client paint so both
 * sides render identically (no hydration mismatch); the real day's value is
 * filled in after mount and the bar animates to it.
 */
export const BASELINE_OFFER: MembershipOffer = {
  total: OFFER_TOTAL,
  bookedPct: START_PCT,
  remainingPct: 100 - START_PCT,
  sold: Math.round((START_PCT / 100) * OFFER_TOTAL),
  remaining: OFFER_TOTAL - Math.round((START_PCT / 100) * OFFER_TOTAL),
};
