import "server-only";
import type { PlanId } from "@/lib/pricing/plans";

/** Map our PlanId to the configured Razorpay plan id (and back). */
const ENV: Record<PlanId, string> = {
  starter: "RAZORPAY_PLAN_STARTER",
  pro: "RAZORPAY_PLAN_PRO",
  maison: "RAZORPAY_PLAN_MAISON",
  fan: "RAZORPAY_PLAN_FAN",
};

export function razorpayPlanId(plan: PlanId): string {
  return process.env[ENV[plan]] || "";
}

export function planFromRazorpayId(id: string | undefined | null): PlanId | null {
  if (!id) return null;
  if (id === process.env.RAZORPAY_PLAN_STARTER) return "starter";
  if (id === process.env.RAZORPAY_PLAN_PRO) return "pro";
  if (id === process.env.RAZORPAY_PLAN_MAISON) return "maison";
  if (id === process.env.RAZORPAY_PLAN_FAN) return "fan";
  return null;
}
