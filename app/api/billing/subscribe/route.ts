import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { createServiceClient } from "@/lib/supabase/server";
import { getRazorpay, isRazorpayConfigured } from "@/lib/billing/razorpay";
import { razorpayPlanId } from "@/lib/pricing/razorpay";
import { type PlanId } from "@/lib/pricing/plans";
import { getPlans } from "@/lib/pricing/getPlans";

export const runtime = "nodejs";

/**
 * Start a subscription for the signed-in user. Body: { planId }.
 * Creates a Razorpay subscription, records it as 'created' (service role),
 * and returns { subscriptionId, keyId } for Razorpay Checkout. Activation is
 * confirmed by the webhook — never trusted from the client.
 */
export async function POST(req: Request) {
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const { planId } = (await req.json()) as { planId?: PlanId };
  const { plans } = await getPlans();
  // Any non-free tier that exists is subscribable (hidden tiers like `fan` are
  // reachable by direct link / campaign even though they're off the pricing page).
  const validPaid = plans.some((p) => p.id !== "free" && p.id === planId);
  if (!planId || !validPaid) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  const plan_id = razorpayPlanId(planId);
  if (!plan_id) {
    return NextResponse.json({ error: "Plan not configured" }, { status: 503 });
  }

  const rzp = getRazorpay()!;
  const sub = await rzp.subscriptions.create({
    plan_id,
    total_count: 12,
    customer_notify: 1,
    notes: { user_id: user.id },
  });

  // Record intent (service role bypasses RLS; no client write policy exists).
  const svc = createServiceClient();
  if (svc) {
    await svc.from("subscriptions").upsert(
      {
        user_id: user.id,
        plan: planId,
        status: "created",
        razorpay_subscription_id: sub.id,
      },
      { onConflict: "user_id" },
    );
  }

  return NextResponse.json({
    subscriptionId: sub.id,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
