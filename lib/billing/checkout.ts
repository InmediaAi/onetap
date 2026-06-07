"use client";

import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import type { PlanId } from "@/lib/pricing/plans";

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
    handler: () => {
      // Payment captured; webhook will activate. Refresh to pick up status.
      setTimeout(() => window.location.reload(), 1500);
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

  const rzp = new RZP({
    key: data.keyId,
    order_id: data.orderId,
    amount: data.amount,
    currency: data.currency,
    name: "OneTap Atelier",
    description: `${data.quantity} extra try-on${data.quantity === 1 ? "" : "s"}`,
    theme: { color: "#1a1814" },
    handler: () => {
      // Payment captured; webhook credits the balance. Refresh to pick it up.
      setTimeout(() => window.location.reload(), 1500);
    },
  });
  rzp.open();
}
