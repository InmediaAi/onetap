"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useAtelier } from "@/lib/store";
import {
  SEED_PLANS,
  type BillingPlan,
  type PlanId,
} from "@/lib/pricing/plans";
import { startSubscription, startTopup } from "@/lib/billing/checkout";

/** Subscription tiers (from the admin-editable DB, seed fallback) + top-ups. */
export default function PlanCards() {
  const usage = useAtelier((s) => s.usage);
  // Only public (active) tiers — hidden ones like the campaign `fan` membership
  // are reachable by direct link, never shown on the pricing page.
  const [plans, setPlans] = useState<BillingPlan[]>(SEED_PLANS.filter((p) => p.active));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Live plans (admin may have changed prices/limits/features).
  useEffect(() => {
    let active = true;
    fetch("/api/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d?.plans?.length && setPlans(d.plans))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function subscribe(planId: PlanId) {
    setErr(null);
    setBusy(planId);
    try {
      await startSubscription(planId);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusy(null);
    }
  }

  const activePlan = usage.status === "active" ? usage.planId : null;

  return (
    <>
      <div className="plan-cards">
        {plans.map((p) => {
          const isFree = p.id === "free";
          const isCurrent = isFree ? !activePlan : activePlan === p.id;
          return (
            <div key={p.id} className={"plan-card" + (p.mostPopular ? " featured" : "")}>
              <div className="plan-top">
                <span className="plan-name">{p.name}</span>
                {p.mostPopular && <span className="plan-pop">Most chosen</span>}
              </div>
              <div className="plan-price">
                ${p.monthlyPrice}
                <span>{isFree ? "" : "/mo"}</span>
              </div>
              <p className="plan-tag">{p.tagline}</p>
              <ul className="plan-feats">
                {p.features.map((f) => (
                  <li key={f}>
                    <Check size={13} strokeWidth={2} /> {f}
                  </li>
                ))}
              </ul>
              {isFree ? (
                <button className="plan-cta current" disabled>
                  {isCurrent ? "Current plan" : "Included"}
                </button>
              ) : (
                <button
                  className={"plan-cta" + (isCurrent ? " current" : "")}
                  disabled={isCurrent || busy !== null}
                  onClick={() => subscribe(p.id as PlanId)}
                >
                  {isCurrent
                    ? "Current plan"
                    : busy === p.id
                      ? "Opening…"
                      : `Subscribe · $${p.monthlyPrice}/mo`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {activePlan && usage.topupEnabled && (
        <TopupBlock
          unitPrice={usage.topupUnitPrice}
          balance={usage.topupBalance}
          busy={busy === "topup"}
          onBuy={async (qty) => {
            setErr(null);
            setBusy("topup");
            try {
              await startTopup(qty);
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Could not start checkout");
            } finally {
              setBusy(null);
            }
          }}
        />
      )}

      {err && <p className="studio-err">{err}</p>}
    </>
  );
}

function TopupBlock({
  unitPrice,
  balance,
  busy,
  onBuy,
}: {
  unitPrice: number;
  balance: number;
  busy: boolean;
  onBuy: (qty: number) => void;
}) {
  const [qty, setQty] = useState(5);
  const total = (unitPrice * qty).toFixed(2);
  return (
    <div className="topup-block">
      <div className="topup-info">
        <span className="plan-name">Need more?</span>
        <p className="plan-tag">
          Add extra try-ons any time — ${unitPrice} each, they never expire.
          {balance > 0 && <> You have {balance} in reserve.</>}
        </p>
      </div>
      <div className="topup-controls">
        <div className="qty-step">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Less">
            <Minus size={14} strokeWidth={2} />
          </button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => Math.min(100, q + 1))} aria-label="More">
            <Plus size={14} strokeWidth={2} />
          </button>
        </div>
        <button className="plan-cta" disabled={busy} onClick={() => onBuy(qty)}>
          {busy ? "Opening…" : `Buy ${qty} · $${total}`}
        </button>
      </div>
    </div>
  );
}
