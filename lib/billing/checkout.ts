"use client";

import { track, metaTrack } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { getPlan, type PlanId } from "@/lib/pricing/plans";
import { useAtelier } from "@/lib/store";

/**
 * Client-side subscription start: ask the server to create a Razorpay
 * subscription, then open Razorpay Checkout. Activation is confirmed by the
 * webhook; on close we re-fetch the profile to reflect the new status.
 */

const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${SCRIPT}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * After a captured payment, poll the (no-store) profile until the expected change
 * lands — the webhook is async and `/api/me` self-heals a stuck `created` sub via
 * Razorpay. Each refresh hydrates the store, so the UI unlocks reactively with no
 * page reload. Falls back to a hard reload if the webhook is unusually slow.
 */
async function settleAfterPayment(isDone: () => boolean): Promise<void> {
  const refresh = useAtelier.getState().refreshProfile;
  for (let i = 0; i < 8; i++) {
    await refresh(); // no-store /api/me → hydrate usage/profile
    if (isDone()) {
      useAtelier.getState().closePricing();
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  window.location.reload(); // fallback — webhook still not reflected
}

export async function startSubscription(planId: PlanId): Promise<void> {
  track(EVENTS.SUBSCRIBE_CLICKED, { planId });

  const res = await fetch("/api/billing/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId }),
  });
  if (res.status === 401) {
    window.location.href = "/onboarding"; // sign in first
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not start checkout");

  const ok = await loadScript();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RZP = (window as any).Razorpay;
  if (!ok || !RZP) throw new Error("Razorpay failed to load");

  const rzp = new RZP({
    key: data.keyId,
    subscription_id: data.subscriptionId,
    name: "OneTap Atelier",
    description: `${planId} plan`,
    theme: { color: "#1a1814" },
    // US-targeted: default the phone-field country flag to +1 (US) instead of the
    // India-registered account's +91 default. The number itself stays empty for the buyer.
    prefill: { contact: "+1" },
    // Closing the sheet without paying → re-sync (no-op if nothing changed).
    modal: { ondismiss: () => void useAtelier.getState().refreshProfile() },
    handler: () => {
      // Payment captured; webhook will activate. Fire the Meta conversion (with
      // the plan value), then poll until the subscription reads active.
      const plan = getPlan(planId);
      const value = plan?.monthlyPrice;
      const currency = plan?.currency || "USD";
      metaTrack("Subscribe", { value, currency, predicted_ltv: value, content_name: `${planId} plan` });
      metaTrack("Purchase", { value, currency, content_name: `${planId} plan`, content_type: "subscription" });
      void settleAfterPayment(() => useAtelier.getState().usage.status === "active");
    },
  });
  rzp.open();
}

/**
 * Buy extra videos (roll-over top-up) via a Razorpay one-time order. The webhook
 * credits the balance on payment.captured; we refresh to pick it up.
 */
export async function startTopup(quantity: number): Promise<void> {
  track(EVENTS.TOPUP_CLICKED, { quantity });

  const res = await fetch("/api/billing/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  if (res.status === 401) {
    window.location.href = "/onboarding"; // sign in first
    return;
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not start checkout");

  const ok = await loadScript();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RZP = (window as any).Razorpay;
  if (!ok || !RZP) throw new Error("Razorpay failed to load");

  // Balance before payment — poll until the webhook credits the top-up.
  const startBalance = useAtelier.getState().usage.topupBalance;

  const rzp = new RZP({
    key: data.keyId,
    order_id: data.orderId,
    amount: data.amount,
    currency: data.currency,
    name: "OneTap Atelier",
    description: `${data.quantity} extra try-on${data.quantity === 1 ? "" : "s"}`,
    theme: { color: "#1a1814" },
    // US-targeted: default the phone-field country flag to +1 (US) instead of the
    // India-registered account's +91 default. The number itself stays empty for the buyer.
    prefill: { contact: "+1" },
    modal: { ondismiss: () => void useAtelier.getState().refreshProfile() },
    handler: () => {
      // Payment captured; webhook credits the balance. Fire the Meta Purchase
      // (Razorpay amount is in the smallest unit), then poll for the new balance.
      metaTrack("Purchase", {
        value: typeof data.amount === "number" ? data.amount / 100 : undefined,
        currency: data.currency || "USD",
        content_name: "video top-up",
      });
      void settleAfterPayment(
        () => useAtelier.getState().usage.topupBalance > startBalance,
      );
    },
  });
  rzp.open();
}
