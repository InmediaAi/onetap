/**
 * Static cross-plan feature comparison for the /pricing cards. Every paid card
 * renders this SAME list so tiers read side-by-side (✓ included / ✗ excluded).
 *
 * This is intentionally hardcoded (not driven by the admin-editable per-plan
 * `features` strings) so the three cards stay aligned row-for-row. Prices,
 * names and video limits still come from the live plans (getPlans / /api/plans).
 * Keys must match the paid PlanId values shown on the pricing page.
 */

export type ComparableTier = "starter" | "pro" | "maison";

export interface PlanFeature {
  label: string;
  tiers: Record<ComparableTier, boolean>;
}

const ALL = { starter: true, pro: true, maison: true } as const;
const PRO_UP = { starter: false, pro: true, maison: true } as const;
const MAISON_ONLY = { starter: false, pro: false, maison: true } as const;

export const PLAN_FEATURES: PlanFeature[] = [
  { label: "360° try-on spins", tiers: { ...ALL } },
  { label: "Cinematic film mode", tiers: { ...ALL } },
  { label: "Composed on your likeness", tiers: { ...ALL } },
  { label: "HD export, no watermark", tiers: { ...ALL } },
  { label: "Roll-over top-up credits", tiers: { ...ALL } },
  { label: "Priority generation queue", tiers: { ...PRO_UP } },
  { label: "Early access to new formats", tiers: { ...PRO_UP } },
  { label: "Priority support", tiers: { ...PRO_UP } },
  { label: "Commercial usage rights", tiers: { ...MAISON_ONLY } },
  { label: "Concierge onboarding", tiers: { ...MAISON_ONLY } },
];
