"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import PlanCards from "@/components/PlanCards";

export default function PricingModal() {
  const hydrated = useHydrated();
  const open = useAtelier((s) => s.pricingOpen);
  const close = useAtelier((s) => s.closePricing);
  const usage = useAtelier((s) => s.usage);

  // Escape-to-close + scroll lock while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (!open) return null;

  const active = usage.status === "active" && usage.planId;
  const remaining = active
    ? Math.max(0, usage.videoLimit - usage.videosUsed) + usage.topupBalance
    : usage.freeTrialRemaining;

  return (
    <div
      className="modal-scrim pricing-scrim"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).classList.contains("pricing-scrim")) close();
      }}
    >
      <div className="pricing-card">
        <button className="mclose pricing-close" onClick={close} aria-label="Close">
          <X size={16} strokeWidth={1.5} />
        </button>

        <div className="pricing-head">
          <h2 className="pricing-title">
            {active ? "Your Membership" : "Choose Your Membership"}
          </h2>
          <p className="pricing-note">
            {hydrated && active
              ? `${remaining} try-on${remaining === 1 ? "" : "s"} left${usage.topupBalance > 0 ? ` (incl. ${usage.topupBalance} top-up)` : ""}. A try-on is a 360° spin or a film.`
              : "Join an exclusive curator-led luxury fashion membership. Try on pieces from 100+ designer brands before you buy."}
          </p>
        </div>

        <PlanCards />

        <p className="pricing-foot">Billed monthly in USD · cancel anytime.</p>
      </div>
    </div>
  );
}
