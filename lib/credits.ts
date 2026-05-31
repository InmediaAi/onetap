import type { GenerationKind } from "@/lib/ai/types";

/**
 * Credit economy (MVP, client-side ledger).
 * 1 credit ≈ $0.10. Generations spend credits; packages top them up.
 */

/** New users start with a small free balance. */
export const STARTING_CREDITS = 20;

/** Credits spent per successful generation, by kind. */
export const CREDIT_COST: Record<GenerationKind, number> = {
  tryon: 5,
  spin: 20,
  video: 20,
};

export interface CreditPackage {
  usd: number;
  credits: number;
}

/** Purchasable top-up packages. */
export const PACKAGES: CreditPackage[] = [
  { usd: 25, credits: 250 },
  { usd: 49, credits: 490 },
  { usd: 100, credits: 1000 },
];
