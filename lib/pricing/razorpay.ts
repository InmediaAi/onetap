import "server-only";
import type { PlanId } from "@/lib/pricing/plans";
import { createReadClient } from "@/lib/supabase/server";

/** Map our PlanId to the configured Razorpay plan id (and back). */
const ENV: Record<PlanId, string> = {
  starter: "RAZORPAY_PLAN_STARTER",
  pro: "RAZORPAY_PLAN_PRO",
  maison: "RAZORPAY_PLAN_MAISON",
  gold: "RAZORPAY_PLAN_GOLD",
  client: "RAZORPAY_PLAN_CLIENT",
  fan: "RAZORPAY_PLAN_FAN",
};

/** Env-configured Razorpay plan id (fallback when no DB value is set). */
export function razorpayPlanId(plan: PlanId): string {
  return process.env[ENV[plan]] || "";
}

/**
 * Resolve a tier's Razorpay plan id, DB-first: the admin-editable
 * `billing_plans.razorpay_plan_id` takes precedence (change it without a
 * redeploy); falls back to the RAZORPAY_PLAN_* env var when unset/empty.
 */
export async function resolveRazorpayPlanId(plan: PlanId): Promise<string> {
  const db = createReadClient();
  if (db) {
    try {
      const { data } = await db
        .from("billing_plans")
        .select("razorpay_plan_id")
        .eq("id", plan)
        .maybeSingle();
      const dbId = (data?.razorpay_plan_id as string | null)?.trim();
      if (dbId) return dbId;
    } catch {
      /* fall through to env */
    }
  }
  return razorpayPlanId(plan);
}

export function planFromRazorpayId(id: string | undefined | null): PlanId | null {
  if (!id) return null;
  if (id === process.env.RAZORPAY_PLAN_STARTER) return "starter";
  if (id === process.env.RAZORPAY_PLAN_PRO) return "pro";
  if (id === process.env.RAZORPAY_PLAN_MAISON) return "maison";
  if (id === process.env.RAZORPAY_PLAN_GOLD) return "gold";
  if (id === process.env.RAZORPAY_PLAN_CLIENT) return "client";
  if (id === process.env.RAZORPAY_PLAN_FAN) return "fan";
  return null;
}
