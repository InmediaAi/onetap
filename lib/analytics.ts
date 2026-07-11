"use client";

import mixpanel from "mixpanel-browser";
import { EVENTS, type EventName } from "@/lib/analytics/events";

/**
 * Thin analytics wrapper (Mixpanel). Components and the store NEVER call
 * Mixpanel directly — only these functions — so the provider is swappable in
 * one file. Custom events only: no autocapture, no session replay (users
 * upload face/body photos; we keep the privacy surface minimal).
 *
 * No-ops safely when NEXT_PUBLIC_MIXPANEL_TOKEN is unset, so `npm run dev`
 * works with zero config.
 */

const TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
let ready = false;

export function initAnalytics(): void {
  if (ready || !TOKEN || typeof window === "undefined") return;
  mixpanel.init(TOKEN, {
    autocapture: false, // custom events only
    persistence: "localStorage",
    track_pageview: false, // we track page_viewed manually on route change
    ip: false,
    opt_out_tracking_by_default: false,
  });
  ready = true;
}

/**
 * Fire a Meta (Facebook) Pixel event — standard or custom. No-ops safely when
 * the pixel script hasn't loaded (or no pixel id is set). Independent of
 * Mixpanel readiness. Value events (Subscribe/Purchase) call this directly.
 */
export function metaTrack(event: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.fbq?.("track", event, params);
  } catch {
    /* analytics must never break the app */
  }
}

/** Funnel events forwarded to the Meta Pixel as standard conversion events. */
const META_EVENTS: Partial<Record<EventName, string>> = {
  [EVENTS.ONBOARDING_COMPLETED]: "CompleteRegistration",
  [EVENTS.GENERATION_COMPLETED]: "ViewContent",
  [EVENTS.SUBSCRIBE_CLICKED]: "InitiateCheckout",
};

/**
 * Fire a GA4 (gtag) event. No-ops when GA isn't configured; even before gtag.js
 * finishes loading, the inline `dataLayer` stub queues the call. Independent of
 * Mixpanel. Value events (begin_checkout/purchase) call this directly.
 */
export function gaTrack(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", name, params);
  } catch {
    /* analytics must never break the app */
  }
}

/**
 * Internal events → GA4 *recommended* event names (+ param shaping), so GA4's
 * Conversions/Monetization/ecommerce reports populate instead of only opaque
 * custom names. Unmapped events forward under their snake_case name (valid GA4
 * custom events). Money events (begin_checkout/purchase) are fired explicitly
 * from checkout.ts with value/items — see GA4_SKIP.
 */
type GaMap = { name: string; params?: (p?: Record<string, unknown>) => Record<string, unknown> };
const GA4_EVENTS: Partial<Record<EventName, GaMap>> = {
  [EVENTS.SIGNED_IN]: { name: "login", params: (p) => ({ method: p?.method ?? "provider" }) },
  [EVENTS.ONBOARDING_COMPLETED]: { name: "sign_up", params: () => ({ method: "onboarding" }) },
  [EVENTS.PRODUCT_TRY_CLICKED]: {
    name: "select_item",
    params: (p) => ({
      item_list_id: "catalog",
      items: [{ item_id: p?.productId, item_brand: p?.brand, price: p?.price }],
    }),
  },
  [EVENTS.PRODUCT_WISHLISTED]: {
    name: "add_to_wishlist",
    params: (p) => ({ items: [{ item_id: p?.productId }] }),
  },
  [EVENTS.PRODUCT_UNWISHLISTED]: {
    name: "remove_from_wishlist",
    params: (p) => ({ items: [{ item_id: p?.productId }] }),
  },
};

// page_view is owned by GoogleTags; the two checkout *clicks* are sent as the
// richer `begin_checkout` (with value/items) from checkout.ts instead.
const GA4_SKIP: EventName[] = [
  EVENTS.PAGE_VIEWED,
  EVENTS.SUBSCRIBE_CLICKED,
  EVENTS.TOPUP_CLICKED,
];

export function track(event: EventName, props?: Record<string, unknown>): void {
  // Forward to the Meta Pixel + GA4 first — independent of Mixpanel being configured.
  const meta = META_EVENTS[event];
  if (meta) metaTrack(meta);
  if (!GA4_SKIP.includes(event)) {
    const ga = GA4_EVENTS[event];
    gaTrack(ga?.name ?? event, ga?.params ? ga.params(props) : props);
  }
  if (!ready) return;
  try {
    mixpanel.track(event, props);
  } catch {
    /* analytics must never break the app */
  }
}

/** Register session super-properties (e.g. UTM) attached to every event. */
export function register(props: Record<string, unknown>): void {
  if (!ready) return;
  try {
    mixpanel.register(props);
  } catch {
    /* ignore */
  }
}

export function identify(id: string, traits?: Record<string, unknown>): void {
  if (!ready) return;
  try {
    mixpanel.identify(id);
    if (traits) mixpanel.people.set(traits);
  } catch {
    /* ignore */
  }
}

export function reset(): void {
  if (!ready) return;
  try {
    mixpanel.reset();
  } catch {
    /* ignore */
  }
}
