"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { PLANS, yearlySavingPct } from "@/lib/pricing/plans";
import { PACKAGES } from "@/lib/credits";

export default function PricingPlans() {
  const hydrated = useHydrated();
  const plan = useAtelier((s) => s.plan);
  const setPlan = useAtelier((s) => s.setPlan);
  const credits = useAtelier((s) => s.credits);
  const topUp = useAtelier((s) => s.topUp);

  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [added, setAdded] = useState<number | null>(null);
  const save = yearlySavingPct(PLANS[1]);

  function buy(pkg: { usd: number; credits: number }) {
    topUp(pkg.credits);
    setAdded(pkg.usd);
    setTimeout(() => setAdded(null), 1400);
  }

  return (
    <div className="pricing-page">
      <section className="sec-hero">
        <p className="eyebrow">Pricing</p>
        <h1>One plan for every creator.</h1>
        <p className="sec-sub">
          Choose a subscription, generate cinema-grade reels, and top up with
          credits whenever you need more.
        </p>

        <div className="plan-toggle-row">
          <div className="plan-toggle">
            <button
              className={cycle === "monthly" ? "on" : ""}
              onClick={() => setCycle("monthly")}
            >
              Monthly
            </button>
            <button
              className={cycle === "yearly" ? "on" : ""}
              onClick={() => setCycle("yearly")}
            >
              Yearly
            </button>
          </div>
          <span className="plan-save">Yearly · Save ~{save}%</span>
        </div>
      </section>

      <div className="plan-cards">
        {PLANS.map((p) => {
          const active = hydrated && plan === p.id;
          const price = cycle === "monthly" ? p.monthly : p.yearly;
          const unit = cycle === "monthly" ? "/ month" : "/ year";
          return (
            <div key={p.id} className={"plan-card" + (p.mostPopular ? " featured" : "")}>
              <div className="plan-top">
                <span className="plan-name">{p.name}</span>
                {p.mostPopular && <span className="plan-pop">Most Popular</span>}
              </div>
              <div className="plan-price">
                <span className="pp-amt">${price}</span>
                <span className="pp-unit">{unit}</span>
              </div>
              <p className="plan-tag">{p.tagline}</p>
              <ul className="plan-feats">
                {p.features.map((f) => (
                  <li key={f}>
                    <Check size={14} strokeWidth={2} /> {f}
                  </li>
                ))}
              </ul>
              <button
                className={"plan-cta" + (active ? " current" : "")}
                onClick={() => setPlan(p.id)}
                disabled={active}
              >
                {active ? "Current plan" : `Choose ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* credit top-up */}
      <section className="topup">
        <div className="topup-head">
          <div>
            <p className="eyebrow">Credits</p>
            <h2 className="edit-title">Top up anytime</h2>
          </div>
          <span className="topup-bal">
            {hydrated ? credits : "—"} <span>credits</span>
          </span>
        </div>
        <div className="topup-pkgs">
          {PACKAGES.map((pkg) => (
            <div className="topup-pkg" key={pkg.usd}>
              <span className="tp-credits">{pkg.credits.toLocaleString()} credits</span>
              <span className="tp-rate">${(pkg.usd / pkg.credits).toFixed(2)} / credit</span>
              <button className="tp-buy" onClick={() => buy(pkg)}>
                {added === pkg.usd ? (
                  <>
                    <Check size={14} strokeWidth={2} /> Added
                  </>
                ) : (
                  <>${pkg.usd}</>
                )}
              </button>
            </div>
          ))}
        </div>
        <p className="topup-note">Mock checkout — no real charge.</p>
      </section>
    </div>
  );
}
