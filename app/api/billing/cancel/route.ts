import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { getRazorpay, isRazorpayConfigured } from "@/lib/billing/razorpay";

export const runtime = "nodejs";

/**
 * Cancel the signed-in user's subscription at the end of the current cycle.
 * The DB flips to 'cancelled' when Razorpay sends the subscription.cancelled
 * webhook; the plan stays active until the period ends.
 */
export async function POST() {
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data: sub } = await sb
    .from("subscriptions")
    .select("razorpay_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.razorpay_subscription_id || !isRazorpayConfigured()) {
    return NextResponse.json({ error: "No active subscription" }, { status: 400 });
  }

  const rzp = getRazorpay()!;
  await rzp.subscriptions.cancel(sub.razorpay_subscription_id, true); // at cycle end
  return NextResponse.json({ ok: true });
}
