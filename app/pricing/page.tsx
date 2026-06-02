"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Header from "@/components/Header";

type Billing = "monthly" | "yearly";

/* ---------------------------------------------------------------------------
   Plans. Price + video count swap with the billing toggle; everything else
   (emailer, community, free generations) is constant per tier.
--------------------------------------------------------------------------- */
const PLANS = [
  {
    name: "Essential",
    blurb: "For creators getting started with AI reels.",
    monthly: { price: 25, videos: 10 },
    yearly: { price: 250, videos: 100 },
    freeGen: 1,
    featured: false,
  },
  {
    name: "Pro",
    blurb: "For creators publishing at a steady pace.",
    monthly: { price: 59, videos: 30 },
    yearly: { price: 590, videos: 300 },
    freeGen: 3,
    featured: true,
  },
];

/* Add-on credit packs — available to active subscribers only. */
const CREDITS = [
  { price: 10, videos: 3 },
  { price: 30, videos: 10 },
  { price: 50, videos: 20 },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const period = billing === "monthly" ? "month" : "year";

  return (
    <main>
      <Header />

      <div className="mx-auto max-w-editorial px-6 pb-28 pt-16 md:px-10 md:pt-20">
        {/* Masthead */}
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="eyebrow">Pricing</p>
          <h1 className="mx-auto mt-4 max-w-2xl font-display text-5xl leading-[1.05] tracking-tight md:text-6xl">
            One plan for every creator.
          </h1>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-muted">
            Choose a subscription, generate cinema-grade reels, and top up with
            credits whenever you need more.
          </p>
        </motion.header>

        {/* Billing toggle */}
        <div className="mt-10 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-full border border-hairline p-1">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`rounded-full px-5 py-2 text-[12px] uppercase tracking-luxe transition-colors ${
                  billing === b ? "bg-ink text-canvas" : "text-muted hover:text-ink"
                }`}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
              </button>
            ))}
          </div>
          <span className="ml-3 text-[11px] uppercase tracking-luxe text-muted">
            Yearly · save ~17%
          </span>
        </div>

        {/* Plans */}
        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-2">
          {PLANS.map((plan) => {
            const tier = plan[billing];
            const features = [
              `${tier.videos} video generations`,
              "Weekly emailer",
              "Community access",
              `${plan.freeGen} free generation${plan.freeGen > 1 ? "s" : ""}`,
            ];
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className={`flex flex-col rounded-lg border p-8 ${
                  plan.featured ? "border-ink" : "border-hairline"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="eyebrow">{plan.name}</p>
                  {plan.featured && (
                    <span className="rounded-full bg-ink px-2.5 py-0.5 text-[9px] uppercase tracking-luxe text-canvas">
                      Most popular
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-5xl tracking-tight">
                    ${tier.price}
                  </span>
                  <span className="text-sm text-muted">/ {period}</span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted">{plan.blurb}</p>

                <ul className="mt-7 flex flex-col gap-3">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-ink">
                      <Check size={15} strokeWidth={1.75} className="shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-8 w-full py-3 text-[12px] uppercase tracking-luxe transition-colors ${
                    plan.featured
                      ? "bg-ink text-canvas hover:opacity-80"
                      : "border border-ink text-ink hover:bg-ink hover:text-canvas"
                  }`}
                >
                  Choose {plan.name}
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* Credit packs — subscribers only */}
        <section className="mx-auto mt-20 max-w-3xl border-t border-hairline pt-12">
          <div className="text-center">
            <p className="eyebrow">Credit packs</p>
            <h2 className="mt-3 font-display text-3xl tracking-tight md:text-4xl">
              Need more reels? Top up.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
              One-off credit packs for active subscribers only — added straight to
              your generation balance.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {CREDITS.map((c) => (
              <div
                key={c.price}
                className="flex flex-col items-center rounded-lg border border-hairline p-6 text-center"
              >
                <span className="font-display text-3xl tracking-tight">${c.price}</span>
                <span className="mt-1 text-[12px] uppercase tracking-luxe text-muted">
                  {c.videos} videos
                </span>
                <button className="btn-ghost mt-5 w-full">Buy credits</button>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-[11px] uppercase tracking-luxe text-muted">
            Credit packs require an active subscription
          </p>
        </section>
      </div>
    </main>
  );
}
