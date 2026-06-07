import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import {
  SEED_PLANS,
  SEED_CONFIG,
  type BillingPlan,
  type BillingConfig,
  type BillingTierId,
} from "@/lib/pricing/plans";

/**
 * Runtime source of truth for billing tiers + config. Reads the admin-editable
 * `billing_plans` / `billing_config` tables (public-read RLS); falls back to the
 * SEED values when Supabase is unconfigured or the tables are empty.
 */

export interface PlansSnapshot {
  plans: BillingPlan[];
  config: BillingConfig;
}

interface PlanRow {
  id: string;
  name: string;
  tagline: string | null;
  monthly_price: number | string;
  currency: string;
  video_limit: number;
  features: string[] | null;
  most_popular: boolean;
  active: boolean;
  sort_order: number;
}

function rowToPlan(r: PlanRow): BillingPlan {
  return {
    id: r.id as BillingTierId,
    name: r.name,
    tagline: r.tagline ?? "",
    monthlyPrice: Number(r.monthly_price),
    currency: r.currency || "USD",
    videoLimit: r.video_limit ?? 0,
    features: r.features ?? [],
    mostPopular: Boolean(r.most_popular),
    active: Boolean(r.active),
    sortOrder: r.sort_order ?? 0,
  };
}

export async function getPlans(): Promise<PlansSnapshot> {
  const db = createReadClient();
  if (!db) return { plans: SEED_PLANS, config: SEED_CONFIG };

  try {
    const [{ data: planRows }, { data: cfg }] = await Promise.all([
      db.from("billing_plans").select("*").order("sort_order", { ascending: true }),
      db.from("billing_config").select("*").eq("id", "default").maybeSingle(),
    ]);

    const plans =
      planRows && planRows.length ? (planRows as PlanRow[]).map(rowToPlan) : SEED_PLANS;
    const config: BillingConfig = cfg
      ? {
          topupUnitPrice: Number(cfg.topup_unit_price),
          topupCurrency: cfg.topup_currency || "USD",
          topupEnabled: Boolean(cfg.topup_enabled),
        }
      : SEED_CONFIG;

    return { plans, config };
  } catch {
    return { plans: SEED_PLANS, config: SEED_CONFIG };
  }
}

/** Video limit for a tier id — free/starter/pro (0 if unknown). */
export function videoLimitOf(
  plans: BillingPlan[],
  id: BillingTierId | null,
): number {
  if (!id) return 0;
  return plans.find((p) => p.id === id)?.videoLimit ?? 0;
}

/** One-time free-trial allowance (the `free` tier's videoLimit). */
export function freeTrialLimit(plans: BillingPlan[]): number {
  return plans.find((p) => p.id === "free")?.videoLimit ?? 0;
}

/** Display name for a tier id (falls back to the id). */
export function planNameOf(plans: BillingPlan[], id: BillingTierId | null): string | null {
  if (!id) return null;
  return plans.find((p) => p.id === id)?.name ?? id;
}
