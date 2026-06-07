"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initAnalytics, track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

/**
 * Mounts once in the root layout: initializes analytics and tracks a
 * page_viewed on every route change. Renders nothing.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    track(EVENTS.PAGE_VIEWED, { path: pathname });
  }, [pathname]);

  return null;
}
