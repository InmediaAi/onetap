import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { type PlanId } from "@/lib/pricing/plans";
import { getPlans, videoLimitOf, freeTrialLimit, planNameOf } from "@/lib/pricing/getPlans";
import { reconcileCreated, type SubRow } from "@/lib/billing/reconcile";

export const runtime = "nodejs";
// Session snapshot — must never be HTTP-cached. A cached response makes a normal
// reload (e.g. window.location.reload() after subscribing, or pull-to-refresh)
// serve stale usage/profile, so only a HARD refresh would pick up changes.
export const dynamic = "force-dynamic";

/** JSON response that is always served fresh (no browser/proxy caching). */
function json(payload: unknown) {
  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

/**
 * The signed-in user's profile + subscription/usage snapshot.
 * Returns { authed:false } when not signed in (or Supabase unconfigured),
 * so the client can render the anonymous state without errors.
 */
export async function GET() {
  const sb = await createServerSupabase();
  if (!sb) return json({ authed: false });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return json({ authed: false });

  const { data: profile } = await sb
    .from("profiles")
    .select(
      "username, email, favorite_brands, selfie_url, body_url, left_url, right_url, back_url, model_url, height_inches, style, categories, goals, scene_mood, scene_setting, free_trial_used, onboarded",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const subRes = await sb
    .from("subscriptions")
    .select(
      "plan, status, videos_used, current_period_end, topup_balance, cancel_at_period_end, razorpay_subscription_id, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();
  let sub = subRes.data as SubRow | null;

  // R1: if stuck in `created` (activation webhook missed), self-heal from Razorpay.
  if (sub) sub = await reconcileCreated(user.id, sub);

  // Short-lived signed URLs for the two identity images (private bucket).
  async function sign(path: string | null | undefined) {
    if (!path) return null;
    const { data } = await sb!.storage.from("avatars").createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  }
  const [selfieUrl, bodyUrl, leftUrl, rightUrl, backUrl, modelUrl] =
    await Promise.all([
      sign(profile?.selfie_url),
      sign(profile?.body_url),
      sign(profile?.left_url),
      sign(profile?.right_url),
      sign(profile?.back_url),
      sign(profile?.model_url),
    ]);

  // Limits + top-up config come from the admin-editable DB tables (seed fallback).
  const { plans, config } = await getPlans();

  // Everyone now has a subscriptions row (free | starter | pro). `planId` stays
  // PAID-only (null for free) so all paid-only UI/topup gating is unchanged.
  const tier = (sub?.plan as "free" | PlanId | undefined) ?? null;
  // Defensive lapse: if a cancellation was scheduled and the cycle has closed but
  // the subscription.cancelled webhook never arrived, treat the plan as ended.
  const periodEnded = Boolean(
    sub?.current_period_end && new Date(sub.current_period_end).getTime() <= Date.now(),
  );
  const scheduledLapse = Boolean(sub?.cancel_at_period_end) && periodEnded;
  const active = sub?.status === "active" && !scheduledLapse;
  const isPaid = active && tier !== null && tier !== "free";
  const planId = isPaid ? (tier as PlanId) : null;
  const videosUsed = sub?.videos_used ?? 0;

  // Free allowance is lifetime: count from the free row when present, else fall
  // back to the legacy profiles.free_trial_used counter (users without a row).
  const freeTrialRemaining =
    tier === "free"
      ? Math.max(0, videoLimitOf(plans, "free") - videosUsed)
      : tier === null
        ? Math.max(0, freeTrialLimit(plans) - (profile?.free_trial_used ?? 0))
        : 0;

  return json({
    authed: true,
    onboarded: Boolean(profile?.onboarded),
    username: profile?.username ?? null,
    email: profile?.email ?? user.email ?? null,
    brands: profile?.favorite_brands ?? [],
    selfieUrl,
    bodyUrl,
    leftUrl,
    rightUrl,
    backUrl,
    modelUrl,
    heightInches: profile?.height_inches ?? null,
    style: profile?.style ?? [],
    categories: profile?.categories ?? [],
    goals: profile?.goals ?? [],
    sceneMood: profile?.scene_mood ?? [],
    sceneSetting: profile?.scene_setting ?? [],
    usage: {
      planId,
      planName: planNameOf(plans, planId),
      status: scheduledLapse ? "cancelled" : (sub?.status ?? null),
      cancelAtPeriodEnd: Boolean(sub?.cancel_at_period_end) && !scheduledLapse,
      videosUsed,
      videoLimit: isPaid ? videoLimitOf(plans, planId) : 0,
      topupBalance: sub?.topup_balance ?? 0,
      topupUnitPrice: config.topupUnitPrice,
      topupCurrency: config.topupCurrency,
      topupEnabled: config.topupEnabled,
      currentPeriodEnd: sub?.current_period_end ?? null,
      freeTrialRemaining,
    },
  });
}
