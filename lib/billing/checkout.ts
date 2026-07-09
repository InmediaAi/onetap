"use client";

import { track, metaTrack } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { getPlan, type PlanId } from "@/lib/pricing/plans";
import { useAtelier } from "@/lib/store";
import { apiJson, ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast/bus";

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
 * After a captured payment, drive the post-payment overlay (store `paymentFlow`)
 * while polling the (no-store) profile until the expected change lands — the
 * webhook is async and `/api/me` self-heals a stuck `created` sub via Razorpay.
 * Each refresh hydrates the store, so the UI unlocks reactively. On confirmation
 * we show the celebration; if it never confirms within the budget we surface a
 * calm error (NO hard reload, so the overlay is never wiped).
 */
async function settleAfterPayment(opts: {
  kind: "subscription" | "topup";
  isDone: () => boolean;
  /** Try-ons unlocked/added, read AFTER confirmation (reflects the new plan). */
  unlockedOf: () => number;
  planName?: string | null;
}): Promise<void> {
  const store = useAtelier;
  store.getState().beginPaymentSettle(opts.kind);

  // ~12 attempts with a gentle backoff ≈ 25–30s of polling.
  for (let i = 0; i < 12; i++) {
    try {
      await store.getState().refreshProfile(); // no-store /api/me → hydrate usage
    } catch {
      /* transient network — keep polling */
    }
    if (opts.isDone()) {
      store.getState().paymentSettled(opts.unlockedOf(), opts.planName ?? null);
      store.getState().closePricing(); // drop the pricing modal behind the celebration
      return;
    }
    await new Promise((r) => setTimeout(r, i < 5 ? 1500 : 2500));
  }
  store
    .getState()
    .paymentFailed(
      "If you were charged, your membership will update shortly and we'll email you.",
    );
}

export async function startSubscription(planId: PlanId): Promise<void> {
  track(EVENTS.SUBSCRIBE_CLICKED, { planId });

  let data: { subscriptionId: string; keyId: string };
  try {
    data = await apiJson("/api/billing/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
      handled: [401], // 401 → send to sign-in, no toast
      errorMessage: "Could not start checkout. Please try again.",
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      window.location.href = "/onboarding"; // sign in first
      return;
    }
    throw e; // already toasted by apiJson
  }

  const ok = await loadScript();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RZP = (window as any).Razorpay;
  if (!ok || !RZP) {
    toast.error("Payment couldn't start. Please try again.");
    throw new Error("Razorpay failed to load");
  }

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
      void settleAfterPayment({
        kind: "subscription",
        // Match the PLAN too, so a plan-switch (old plan already `active`)
        // doesn't read as done before the new plan activates.
        isDone: () => {
          const u = useAtelier.getState().usage;
          return u.status === "active" && u.planId === planId;
        },
        unlockedOf: () => useAtelier.getState().usage.videoLimit,
        planName: plan?.name ?? null,
      });
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

  let data: {
    keyId: string;
    orderId: string;
    amount: number;
    currency: string;
    quantity: number;
  };
  try {
    data = await apiJson("/api/billing/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
      handled: [401], // 401 → send to sign-in, no toast
      errorMessage: "Could not start checkout. Please try again.",
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      window.location.href = "/onboarding"; // sign in first
      return;
    }
    throw e; // already toasted by apiJson
  }

  const ok = await loadScript();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RZP = (window as any).Razorpay;
  if (!ok || !RZP) {
    toast.error("Payment couldn't start. Please try again.");
    throw new Error("Razorpay failed to load");
  }

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
      void settleAfterPayment({
        kind: "topup",
        isDone: () => useAtelier.getState().usage.topupBalance > startBalance,
        unlockedOf: () => data.quantity,
      });
    },
  });
  rzp.open();
}
