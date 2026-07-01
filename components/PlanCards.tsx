"use client";

import { useEffect, useState } from "react";
import { Check, Minus, Plus, X } from "lucide-react";
import { useAtelier } from "@/lib/store";
import {
  SEED_PLANS,
  type BillingPlan,
  type PlanId,
} from "@/lib/pricing/plans";
import { PLAN_FEATURES, type ComparableTier } from "@/lib/pricing/features";
import { startSubscription, startTopup } from "@/lib/billing/checkout";

/** Subscription tiers (from the admin-editable DB, seed fallback) + top-ups. */
export default function PlanCards() {
  const usage = useAtelier((s) => s.usage);
  const profileLoaded = useAtelier((s) => s.profileLoaded);
  // Only public paid tiers. Hidden ones (the campaign `fan` membership) are
  // reachable by direct link; the `free` tier is intentionally not shown here
  // (it lives in the data model / free-trial logic, just no card).
  const [plans, setPlans] = useState<BillingPlan[]>(
    SEED_PLANS.filter((p) => p.active && p.id !== "free"),
  );
  // Gate the real cards until BOTH the live plans AND the user's subscription
  // are loaded — otherwise seed prices / an empty "Subscribe" state flash first
  // and jump when the fetches resolve. Show shimmer cards until then.
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Live plans (admin may have changed prices/limits/features).
  useEffect(() => {
    let active = true;
    fetch("/api/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        if (d?.plans?.length) {
          setPlans(
            (d.plans as BillingPlan[]).filter((p) => p.active && p.id !== "free"),
          );
        }
      })
      .catch(() => {})
      .finally(() => active && setPlansLoaded(true));
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
  const ready = plansLoaded && profileLoaded;

  if (!ready) return <PlanCardsSkeleton />;

  return (
    <>
      <div className="plan-cards">
        {plans.map((p) => {
          const isCurrent = activePlan === p.id;
          const tier = p.id as ComparableTier;
          return (
            <div key={p.id} className={"plan-card" + (p.mostPopular ? " featured" : "")}>
              <div className="plan-top">
                <span className="plan-name">{p.name}</span>
                {p.mostPopular && <span className="plan-pop">Most chosen</span>}
              </div>
              <div className="plan-price">
                ${p.monthlyPrice}
                <span>/mo</span>
              </div>
              <p className="plan-tag">{p.tagline}</p>
              <ul className="plan-feats">
                {PLAN_FEATURES.map((f) => {
                  const on = f.tiers[tier];
                  return (
                    <li key={f.label} className={on ? undefined : "no"}>
                      {on ? (
                        <Check size={13} strokeWidth={2} />
                      ) : (
                        <X size={13} strokeWidth={2} />
                      )}{" "}
                      {f.label}
                    </li>
                  );
                })}
              </ul>
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

/** Shimmer placeholder shown while plans + subscription load (no seed-data flash). */
function PlanCardsSkeleton() {
  return (
    <div className="plan-cards" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="plan-card plan-card-skel">
          <span className="shimmer skel-line skel-name" />
          <span className="shimmer skel-line skel-price" />
          <span className="shimmer skel-line skel-tag" />
          <div className="skel-feats">
            {Array.from({ length: 8 }).map((_, r) => (
              <span key={r} className="shimmer skel-line skel-feat" />
            ))}
          </div>
          <span className="shimmer skel-line skel-cta" />
        </div>
      ))}
    </div>
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
