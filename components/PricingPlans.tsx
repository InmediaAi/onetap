"use client";

import { useAtelier } from "@/lib/store";
import PlanCards from "@/components/PlanCards";
import PricingUrgency from "@/components/PricingUrgency";

export default function PricingPlans() {
  const usage = useAtelier((s) => s.usage);
  const profileLoaded = useAtelier((s) => s.profileLoaded);

  const active = usage.status === "active" && usage.planId;
  const remaining = active
    ? Math.max(0, usage.videoLimit - usage.videosUsed) + usage.topupBalance
    : usage.freeTrialRemaining;

  return (
    <div className="pricing-page">
      <section className="sec-hero">
        <p className="eyebrow">Pricing</p>
        <h1>A plan for every creator.</h1>
        <p className="sec-sub">
          Subscribe to generate cinema-grade reels. A try-on is a 360° spin or a
          film, composed on your likeness.
        </p>
        {profileLoaded ? (
          <p className="plan-save">
            {active
              ? `${remaining} try-on${remaining === 1 ? "" : "s"} left${usage.topupBalance > 0 ? ` (incl. ${usage.topupBalance} top-up)` : ""}`
              : `${remaining} free try-on${remaining === 1 ? "" : "s"} left`}
          </p>
        ) : (
          <span className="shimmer skel-line plan-save-skel" aria-hidden="true" />
        )}
      </section>

      <PricingUrgency />

      <PlanCards />

      <p className="topup-note">
        Billed monthly in USD · cancel anytime · secure checkout by Razorpay.
      </p>
    </div>
  );
}
