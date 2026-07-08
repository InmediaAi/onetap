import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRazorpay, isRazorpayConfigured } from "@/lib/billing/razorpay";
import { enforceRateLimit, LIMITS } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

/**
 * Cancel the signed-in user's subscription at the end of the current cycle.
 * Razorpay keeps the subscription ACTIVE until the cycle closes (the
 * subscription.cancelled webhook fires then), so we persist a local
 * `cancel_at_period_end` flag immediately - the UI reflects "ends on <date>,
 * won't renew" right away, access is preserved until the period end, and the
 * plan never auto-renews (see consume_video()).
 */
export async function POST(req: Request) {
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const limited = await enforceRateLimit(req, { ...LIMITS.billing, id: user.id });
  if (limited) return limited;

  const { data: sub } = await sb
    .from("subscriptions")
    .select("razorpay_subscription_id, status, cancel_at_period_end, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.razorpay_subscription_id || !isRazorpayConfigured()) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  // Idempotent - already scheduled to cancel; don't hit Razorpay again.
  if (sub.cancel_at_period_end) {
    return NextResponse.json({
      ok: true,
      alreadyScheduled: true,
      currentPeriodEnd: sub.current_period_end ?? null,
    });
  }

  const rzp = getRazorpay()!;
  try {
    await rzp.subscriptions.cancel(sub.razorpay_subscription_id, true); // at cycle end
  } catch (err: unknown) {
    // Treat an already-cancelled subscription as success (we still record the
    // flag below); surface anything else as a real failure.
    const e = err as { statusCode?: number; error?: { description?: string } };
    const desc = e?.error?.description?.toLowerCase() ?? "";
    const alreadyCancelled = e?.statusCode === 400 && desc.includes("cancel");
    if (!alreadyCancelled) {
      console.error("[billing/cancel] Razorpay cancel failed:", err);
      return NextResponse.json({ error: "Could not cancel - please try again." }, { status: 502 });
    }
  }

  // Persist the schedule now (service role - RLS-bypassing, like the webhook).
  const svc = createServiceClient();
  if (svc) {
    await svc
      .from("subscriptions")
      .update({ cancel_at_period_end: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  return NextResponse.json({ ok: true, currentPeriodEnd: sub.current_period_end ?? null });
}
