"use client";

import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { PACKAGES } from "@/lib/credits";

export default function PricingModal() {
  const hydrated = useHydrated();
  const open = useAtelier((s) => s.pricingOpen);
  const close = useAtelier((s) => s.closePricing);
  const credits = useAtelier((s) => s.credits);
  const topUp = useAtelier((s) => s.topUp);

  const [justAdded, setJustAdded] = useState<number | null>(null);

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

  function buy(pkg: { usd: number; credits: number }) {
    topUp(pkg.credits);
    setJustAdded(pkg.usd);
    setTimeout(() => setJustAdded(null), 1400);
  }

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
          <span className="label">Credits</span>
          <div className="pricing-balance">
            {hydrated ? credits : "—"} <span>credits</span>
          </div>
          <p className="pricing-note">
            Credits compose your fittings — a try-on costs 5, a 360° or film 20.
          </p>
        </div>

        <div className="pkgs">
          {PACKAGES.map((pkg) => (
            <div className="pkg" key={pkg.usd}>
              <div className="pkg-info">
                <span className="pkg-credits">{pkg.credits.toLocaleString()} credits</span>
                <span className="pkg-rate">${(pkg.usd / pkg.credits).toFixed(2)} / credit</span>
              </div>
              <button className="pkg-buy" onClick={() => buy(pkg)}>
                {justAdded === pkg.usd ? (
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

        <p className="pricing-foot">Mock checkout — no real charge.</p>
      </div>
    </div>
  );
}
