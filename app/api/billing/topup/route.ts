import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { getRazorpay, isRazorpayConfigured } from "@/lib/billing/razorpay";
import { getPlans } from "@/lib/pricing/getPlans";
import { enforceRateLimit, LIMITS } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const MAX_QTY = 100;

/**
 * Buy extra videos (roll-over top-up) - active subscribers only. Body: { quantity }.
 * Creates a Razorpay ONE-TIME order for quantity × top-up unit price; the webhook
 * credits subscriptions.topup_balance on payment.captured (idempotent).
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

  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 503 });
  }

  const { config } = await getPlans();
  if (!config.topupEnabled) {
    return NextResponse.json({ error: "Top-ups are not available" }, { status: 403 });
  }

  // Require an active PAID subscription (free users have an active 'free' row).
  const { data: sub } = await sb
    .from("subscriptions")
    .select("status, plan")
    .eq("user_id", user.id)
    .maybeSingle();
  if (sub?.status !== "active" || sub.plan === "free") {
    return NextResponse.json(
      { error: "An active subscription is required to buy top-ups." },
      { status: 403 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as { quantity?: unknown };
  const quantity = Math.floor(Number(body.quantity));
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_QTY) {
    return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
  }

  // Amount in the smallest currency unit (paise/cents).
  const amount = Math.round(config.topupUnitPrice * quantity * 100);

  const rzp = getRazorpay()!;
  const order = await rzp.orders.create({
    amount,
    currency: config.topupCurrency || "USD",
    notes: { user_id: user.id, quantity: String(quantity), kind: "topup" },
  });

  return NextResponse.json({
    orderId: order.id,
    amount,
    currency: order.currency,
    quantity,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
