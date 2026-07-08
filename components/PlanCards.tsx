"use client";

import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { type BillingPlan, type PlanId } from "@/lib/pricing/plans";
import { startSubscription, startTopup } from "@/lib/billing/checkout";

/**
 * A feature line is rendered exactly as authored in the admin table
 * (billing_plans.features) - no union, no cross-plan rows. A line that begins
 * with a dash (- / – / —) or ✗ is an "excluded" line → light gray; anything
 * else (✓ …) is included → bold. Each feature is its own line.
 */
function isExcludedFeature(f: string): boolean {
  return /^\s*[-–—✗×]/.test(f);
}

/** Subscription tiers (from the admin-editable DB, seed fallback) + top-ups. */
export default function PlanCards() {
  const usage = useAtelier((s) => s.usage);
  const profileLoaded = useAtelier((s) => s.profileLoaded);
  // Plans are rendered STRICTLY from the admin-configured source (/api/plans →
  // the billing_plans table). No hardcoded/seed cards in the client — we show a
  // shimmer until the live plans load, then exactly what's configured. Only the
  // public paid tiers are shown here (the `free` tier and any inactive/hidden
  // tiers like the campaign `fan` membership are excluded).
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  // Gate the cards until BOTH the live plans AND the user's subscription are
  // loaded — avoids an empty/jumpy state flashing before the fetches resolve.
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Live, admin-configured plans (prices/limits/features/descriptions).
  useEffect(() => {
    let active = true;
    fetch("/api/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        const live = Array.isArray(d?.plans) ? (d.plans as BillingPlan[]) : [];
        setPlans(live.filter((p) => p.active && p.id !== "free"));
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

  // No configured plans came back (e.g. a transient fetch failure). Show a
  // neutral note rather than fabricating hardcoded cards.
  if (plans.length === 0) {
    return (
      <p className="pricing-note" style={{ padding: "1.5rem 0" }}>
        Membership plans are being updated — please refresh in a moment.
      </p>
    );
  }

  return (
    <>
      {/* While the server creates the Razorpay subscription + the checkout script
          loads (a few seconds), reassure the user something is happening. `busy`
          clears the moment Razorpay's own sheet opens, so this hands off cleanly. */}
      {busy !== null && (
        <div className="checkout-veil" role="status" aria-live="polite">
          <span className="checkout-veil-spin" aria-hidden="true" />
          <span className="checkout-veil-msg">Opening secure checkout…</span>
        </div>
      )}

      <div className="plan-cards">
        {plans.map((p) => {
          const isCurrent = activePlan === p.id;
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
                {p.features.map((f, i) => (
                  <li key={i} className={isExcludedFeature(f) ? "no" : undefined}>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={"plan-cta" + (isCurrent ? " current" : "")}
                disabled={isCurrent || busy !== null}
                onClick={() => subscribe(p.id as PlanId)}
              >
                {isCurrent ? (
                  "Current plan"
                ) : busy === p.id ? (
                  <span className="cta-loading">
                    <span className="cta-spin" aria-hidden="true" />
                    Opening…
                  </span>
                ) : (
                  `Subscribe · $${p.monthlyPrice}/mo`
                )}
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
          Add extra try-ons any time - ${unitPrice} each, they never expire.
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
          {busy ? (
            <span className="cta-loading">
              <span className="cta-spin" aria-hidden="true" />
              Opening…
            </span>
          ) : (
            `Buy ${qty} · $${total}`
          )}
        </button>
      </div>
    </div>
  );
}
