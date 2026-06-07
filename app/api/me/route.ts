import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { type PlanId } from "@/lib/pricing/plans";
import { getPlans, videoLimitOf, freeTrialLimit, planNameOf } from "@/lib/pricing/getPlans";

export const runtime = "nodejs";

/**
 * The signed-in user's profile + subscription/usage snapshot.
 * Returns { authed:false } when not signed in (or Supabase unconfigured),
 * so the client can render the anonymous state without errors.
 */
export async function GET() {
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ authed: false });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ authed: false });

  const { data: profile } = await sb
    .from("profiles")
    .select(
      "username, email, favorite_brands, selfie_url, body_url, left_url, right_url, back_url, model_url, height_inches, style, categories, goals, scene_mood, scene_setting, free_trial_used",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: sub } = await sb
    .from("subscriptions")
    .select("plan, status, videos_used, current_period_end, topup_balance")
    .eq("user_id", user.id)
    .maybeSingle();

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

  const active = sub?.status === "active";
  const planId = (active ? (sub?.plan as PlanId) : null) ?? null;

  // Limits + top-up config come from the admin-editable DB tables (seed fallback).
  const { plans, config } = await getPlans();

  return NextResponse.json({
    authed: true,
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
      status: sub?.status ?? null,
      videosUsed: sub?.videos_used ?? 0,
      videoLimit: videoLimitOf(plans, planId),
      topupBalance: sub?.topup_balance ?? 0,
      topupUnitPrice: config.topupUnitPrice,
      topupCurrency: config.topupCurrency,
      topupEnabled: config.topupEnabled,
      currentPeriodEnd: sub?.current_period_end ?? null,
      freeTrialRemaining: Math.max(
        0,
        freeTrialLimit(plans) - (profile?.free_trial_used ?? 0),
      ),
    },
  });
}
