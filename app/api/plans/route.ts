import { NextResponse } from "next/server";
import { getPlans } from "@/lib/pricing/getPlans";

export const runtime = "nodejs";

/** Public billing tiers + top-up config for the pricing UI. */
export async function GET() {
  const { plans, config } = await getPlans();
  return NextResponse.json({
    plans: plans.filter((p) => p.active),
    topup: config,
  });
}
