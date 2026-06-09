"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, track, register } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { parseUtm, hasUtm, setFirstTouch } from "@/lib/analytics/utm";

/**
 * Mounts once in the root layout: initializes analytics, captures campaign
 * attribution on landing, and tracks a page_viewed on every route change.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
    // Capture campaign attribution from the landing URL.
    const utm = parseUtm(window.location.search);
    if (hasUtm(utm)) {
      register(utm); // super-properties → attached to every later event
      setFirstTouch(utm); // sticky first-party cookie (first-touch wins)
      track(EVENTS.CAMPAIGN_LANDED, utm);
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;
    track(EVENTS.PAGE_VIEWED, { path: pathname });
  }, [pathname]);

  return null;
}
