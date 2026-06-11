/**
 * Subscription tiers + global billing config.
 *
 * The DB tables `billing_plans` / `billing_config` are the runtime source of
 * truth (admin-editable — see lib/pricing/getPlans.ts). The SEED_* values below
 * are the schema seed AND the fallback used when Supabase is unconfigured/empty.
 * Keep them in sync with the seed in lib/supabase/schema.sql.
 *
 * A "try-on" = one 360°/film VIDEO; the intermediate image is internal & free.
 * For the `free` tier, videoLimit is the ONE-TIME trial count (not monthly).
 */

/** Paid subscription tiers (Razorpay). The `free` tier is not a subscription. */
export type PlanId = "starter" | "pro" | "fan";

/** All billing tiers, including the display-only free tier. */
export type BillingTierId = "free" | PlanId;

export interface BillingPlan {
  id: BillingTierId;
  name: string;
  tagline: string;
  /** USD / month — DISPLAY ONLY; the real charge is set by the Razorpay plan. */
  monthlyPrice: number;
  currency: string;
  /** Monthly videos (free tier: one-time count). */
  videoLimit: number;
  features: string[];
  mostPopular: boolean;
  active: boolean;
  sortOrder: number;
}

export interface BillingConfig {
  /** Price per extra video (one-time top-up). Enforced by us. */
  topupUnitPrice: number;
  topupCurrency: string;
  topupEnabled: boolean;
}

export const SEED_PLANS: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "A first try-on, on the house.",
    monthlyPrice: 0,
    currency: "USD",
    videoLimit: 1,
    features: ["1 try-on (360°) — one time", "Photo composition included"],
    mostPopular: false,
    active: true,
    sortOrder: 0,
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For creators getting started with AI video.",
    monthlyPrice: 20,
    currency: "USD",
    videoLimit: 10,
    features: ["10 try-ons (360° or film) / month", "Standard generation queue"],
    mostPopular: false,
    active: true,
    sortOrder: 1,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For creators publishing at a steady pace.",
    monthlyPrice: 49,
    currency: "USD",
    videoLimit: 30,
    features: [
      "30 try-ons (360° or film) / month",
      "Priority generation queue",
      "Early access to new formats",
    ],
    mostPopular: true,
    active: true,
    sortOrder: 2,
  },
  {
    // Campaign membership (FIFA "Viral Fan"). active:false → hidden from the
    // public /pricing page, but reachable via /fifa (subscribe doesn't filter
    // on active). Kept here so a missing/empty DB still resolves the tier +
    // its video limit. Mirror lib/supabase/schema.sql's `fan` seed.
    id: "fan",
    name: "Fan Membership",
    tagline: "Keep every fan video you make.",
    monthlyPrice: 25,
    currency: "USD",
    videoLimit: 10,
    features: [
      "10 fan videos / month",
      "Every nation & every moment",
      "HD, without the watermark",
      "Priority generation queue",
    ],
    mostPopular: false,
    active: false,
    sortOrder: 5,
  },
];

export const SEED_CONFIG: BillingConfig = {
  topupUnitPrice: 2,
  topupCurrency: "USD",
  topupEnabled: true,
};

/** Env var holding each subscription tier's Razorpay plan id. */
export const RAZORPAY_PLAN_ENV: Partial<Record<PlanId, string>> = {
  starter: "RAZORPAY_PLAN_STARTER",
  pro: "RAZORPAY_PLAN_PRO",
  fan: "RAZORPAY_PLAN_FAN",
};

/** Fallbacks derived from the seed (used when DB is unavailable). */
export const FREE_VIDEO_TRIAL =
  SEED_PLANS.find((p) => p.id === "free")?.videoLimit ?? 1;

export const VIDEO_LIMIT: Partial<Record<PlanId, number>> = {
  starter: SEED_PLANS.find((p) => p.id === "starter")!.videoLimit,
  pro: SEED_PLANS.find((p) => p.id === "pro")!.videoLimit,
  fan: SEED_PLANS.find((p) => p.id === "fan")!.videoLimit,
};

/** Look up a seed tier by id (fallback display when DB plans aren't loaded). */
export function getPlan(id: BillingTierId | null | undefined): BillingPlan | undefined {
  return SEED_PLANS.find((p) => p.id === id);
}
