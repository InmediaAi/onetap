"use client";

/**
 * Campaign attribution helpers (client). First-touch is stored in a long-lived
 * first-party cookie so it survives the sign-up → onboarding round-trip and is
 * persisted to the profile once the user is authenticated.
 */

export interface Attribution {
  utm_campaign?: string;
  utm_source?: string;
  utm_medium?: string;
  campaign_product?: string;
  // Index signature so it's directly usable as track()/register() props.
  [key: string]: string | undefined;
}

const COOKIE = "ot_attr";
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days

/** Parse UTM (+ the deeplinked product id) from a query string. */
export function parseUtm(search: string): Attribution {
  const p = new URLSearchParams(search);
  const a: Attribution = {};
  if (p.get("utm_campaign")) a.utm_campaign = p.get("utm_campaign")!;
  if (p.get("utm_source")) a.utm_source = p.get("utm_source")!;
  if (p.get("utm_medium")) a.utm_medium = p.get("utm_medium")!;
  if (p.get("try")) a.campaign_product = p.get("try")!;
  return a;
}

export function hasUtm(a: Attribution): boolean {
  return Boolean(a.utm_campaign || a.utm_source || a.utm_medium);
}

/** Read the stored first-touch attribution (or null). */
export function getAttribution(): Attribution | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)ot_attr=([^;]+)/);
  if (!m) return null;
  try {
    return JSON.parse(decodeURIComponent(m[1])) as Attribution;
  } catch {
    return null;
  }
}

/** Store first-touch attribution — only if none is set yet (sticky). */
export function setFirstTouch(a: Attribution): void {
  if (typeof document === "undefined") return;
  if (getAttribution()) return; // already attributed — don't overwrite
  const value = encodeURIComponent(JSON.stringify(a));
  document.cookie = `${COOKIE}=${value}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}
