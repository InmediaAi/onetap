export type PlanId = "essential" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number; // USD / month
  yearly: number; // USD / year (~17% off 12×monthly)
  mostPopular?: boolean;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    id: "essential",
    name: "Essential",
    tagline: "For creators getting started with AI reels.",
    monthly: 25,
    yearly: 249,
    features: [
      "10 video generations / month",
      "Weekly emailer",
      "Standard generation queue",
      "Credit top-ups anytime",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For creators publishing at a steady pace.",
    monthly: 59,
    yearly: 590,
    mostPopular: true,
    features: [
      "30 video generations / month",
      "Weekly emailer",
      "Priority generation queue",
      "Credit top-ups anytime",
      "Early access to new formats",
    ],
  },
];

/** Yearly saving vs paying monthly for a year, as a rounded percentage. */
export function yearlySavingPct(plan: Plan) {
  return Math.round((1 - plan.yearly / (plan.monthly * 12)) * 100);
}
