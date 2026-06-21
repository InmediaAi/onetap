import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { getRazorpay, isRazorpayConfigured } from "@/lib/billing/razorpay";
import { planFromRazorpayId } from "@/lib/pricing/razorpay";

/** The subscription columns /api/me reads, plus the two needed to reconcile. */
export interface SubRow {
  plan: string | null;
  status: string | null;
  videos_used: number | null;
  current_period_end: string | null;
  topup_balance: number | null;
  cancel_at_period_end: boolean | null;
  razorpay_subscription_id?: string | null;
  updated_at?: string | null;
}

/**
 * R1 — self-heal a subscription stuck in `created`.
 *
 * If the `subscription.activated` webhook is missed, a paying user would be
 * stuck with no access. On a read, if the row is `created` and old enough that
 * the webhook should have arrived, fetch the live status from Razorpay and sync
 * the row (mirrors the webhook's activation logic). Best-effort: returns the
 * (possibly updated) row; on any error returns the original unchanged.
 *
 * Bounded to created rows aged 20s–6h so we don't hammer Razorpay on every
 * read (active rows never call out; clearly-abandoned rows are skipped).
 */
export async function reconcileCreated(userId: string, row: SubRow): Promise<SubRow> {
  if (
    row.status !== "created" ||
    !row.razorpay_subscription_id ||
    !isRazorpayConfigured()
  ) {
    return row;
  }
  const ageMs = row.updated_at ? Date.now() - new Date(row.updated_at).getTime() : 0;
  if (ageMs < 20_000 || ageMs > 6 * 60 * 60 * 1000) return row;

  const rzp = getRazorpay();
  const svc = createServiceClient();
  if (!rzp || !svc) return row;

  try {
    const live = (await rzp.subscriptions.fetch(row.razorpay_subscription_id)) as {
      status?: string;
      plan_id?: string;
      current_start?: number;
      current_end?: number;
    };
    const s = live.status;

    if (s === "active") {
      // Charged + active on Razorpay but our webhook never landed → activate.
      const plan =
        planFromRazorpayId(live.plan_id) ??
        (row.plan as "starter" | "pro" | "fan" | null) ??
        "starter";
      const patch = {
        status: "active",
        plan,
        current_period_start: live.current_start
          ? new Date(live.current_start * 1000).toISOString()
          : null,
        current_period_end: live.current_end
          ? new Date(live.current_end * 1000).toISOString()
          : null,
        videos_used: 0,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      };
      await svc.from("subscriptions").update(patch).eq("user_id", userId);
      return { ...row, ...patch };
    }
    if (s === "cancelled" || s === "completed" || s === "expired") {
      await svc
        .from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return { ...row, status: "cancelled" };
    }
    if (s === "halted" || s === "paused") {
      await svc
        .from("subscriptions")
        .update({ status: "halted", updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return { ...row, status: "halted" };
    }
    // created / authenticated / pending → not charged yet; leave as-is.
    return row;
  } catch (err) {
    console.error("[billing/reconcile] Razorpay fetch failed:", err);
    return row;
  }
}
