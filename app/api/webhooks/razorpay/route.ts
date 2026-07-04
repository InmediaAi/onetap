import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { planFromRazorpayId } from "@/lib/pricing/razorpay";
import { getPlan } from "@/lib/pricing/plans";
import { addPaidMember } from "@/lib/external/mailchimp";

export const runtime = "nodejs";

/**
 * Razorpay subscription webhook — the authoritative source for activation.
 * Verifies the HMAC signature over the RAW body, then upserts the user's
 * subscription via the service role (RLS-bypassing; no client write policy).
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: true }); // billing disabled → ignore

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const valid =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload?: {
      subscription?: { entity?: RzpSubscription };
      payment?: { entity?: RzpPayment };
    };
  };

  const svc = createServiceClient();
  if (!svc) return NextResponse.json({ ok: true });

  // ── One-time top-up payments → credit the roll-over balance (idempotent) ──
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const pay = event.payload?.payment?.entity;
    const uid = pay?.notes?.user_id;
    const qty = Number(pay?.notes?.quantity);
    if (pay && pay.notes?.kind === "topup" && uid && Number.isFinite(qty) && qty > 0) {
      // Insert-once on payment_id; only credit when this payment is new.
      const { data: inserted } = await svc
        .from("topup_payments")
        .insert({
          payment_id: pay.id,
          user_id: uid,
          quantity: qty,
          amount: pay.amount != null ? pay.amount / 100 : null,
          currency: pay.currency ?? null,
        })
        .select("payment_id")
        .maybeSingle();

      if (inserted) {
        await svc.rpc("add_topup_balance", { p_user: uid, p_qty: qty });
      }
    }
    return NextResponse.json({ ok: true });
  }

  const entity = event.payload?.subscription?.entity;
  if (!entity) return NextResponse.json({ ok: true });

  const userId = entity.notes?.user_id;
  const plan = planFromRazorpayId(entity.plan_id);
  const periodStart = entity.current_start
    ? new Date(entity.current_start * 1000).toISOString()
    : null;
  const periodEnd = entity.current_end
    ? new Date(entity.current_end * 1000).toISOString()
    : null;

  // Resolve the target row by user_id (preferred) or the subscription id.
  const match = userId
    ? { user_id: userId }
    : { razorpay_subscription_id: entity.id };

  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged": {
      // New billing cycle → reset the monthly usage.
      const patch: Record<string, unknown> = {
        status: "active",
        razorpay_subscription_id: entity.id,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        videos_used: 0,
        cancel_at_period_end: false, // (re)activation/renewal clears any schedule
        updated_at: new Date().toISOString(),
      };
      if (plan) patch.plan = plan;
      if (userId) {
        // If the Razorpay plan id can't be mapped (e.g. RAZORPAY_PLAN_FAN
        // misconfigured), DON'T clobber to "starter" — preserve the plan the
        // subscribe route already recorded (e.g. "fan").
        let resolvedPlan = plan;
        if (!resolvedPlan) {
          const { data: existing } = await svc
            .from("subscriptions")
            .select("plan")
            .eq("user_id", userId)
            .maybeSingle();
          resolvedPlan = (existing?.plan as typeof plan) ?? "starter";
        }
        await svc
          .from("subscriptions")
          .upsert({ user_id: userId, plan: resolvedPlan, ...patch }, { onConflict: "user_id" });

        // Sync the paying user into the paid Mailchimp audience with their plan
        // tag (idempotent; no-op when Mailchimp is unconfigured). Non-blocking.
        const { data: prof } = await svc
          .from("profiles")
          .select("email")
          .eq("user_id", userId)
          .maybeSingle();
        const planName = getPlan(resolvedPlan)?.name ?? resolvedPlan;
        if (prof?.email) await addPaidMember(prof.email as string, planName);
      } else {
        await svc.from("subscriptions").update(patch).match(match);
      }
      break;
    }
    case "subscription.cancelled":
    case "subscription.completed":
      // Terminal — fully cancelled now, no longer merely "scheduled".
      await svc
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .match(match);
      break;
    case "subscription.halted":
    case "subscription.pending":
      await svc
        .from("subscriptions")
        .update({ status: "halted", updated_at: new Date().toISOString() })
        .match(match);
      break;
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}

interface RzpSubscription {
  id: string;
  plan_id?: string;
  status?: string;
  current_start?: number;
  current_end?: number;
  notes?: { user_id?: string };
}

interface RzpPayment {
  id: string;
  amount?: number;
  currency?: string;
  notes?: { user_id?: string; quantity?: string; kind?: string };
}
