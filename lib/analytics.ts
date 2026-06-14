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

export function track(event: EventName, props?: Record<string, unknown>): void {
  // Forward to the Meta Pixel first — independent of Mixpanel being configured.
  const meta = META_EVENTS[event];
  if (meta) metaTrack(meta);
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
