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
        <h1>A membership for every luxury shopper</h1>
        <p className="sec-sub">
          Find the membership that&rsquo;s right for you. See every piece on
          yourself before adding it to your wardrobe.
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
