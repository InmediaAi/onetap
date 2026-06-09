"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAtelier } from "@/lib/store";
import { getAttribution } from "@/lib/analytics/utm";

/**
 * Loads the authenticated profile into the store (on mount + route changes) so
 * identity (portrait/brands) and usage are available app-wide. Also persists
 * first-touch campaign attribution to the profile once the user is signed in.
 * No-ops gracefully when unauthenticated or Supabase is unconfigured.
 */
export default function SessionLoader() {
  const refreshProfile = useAtelier((s) => s.refreshProfile);
  const pathname = usePathname();
  const attributed = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      await refreshProfile();
      if (!active || attributed.current) return;
      // Signed in + a first-touch cookie present → persist it (server enforces
      // first-touch, so this is safe to attempt once per session).
      const email = useAtelier.getState().email;
      const attr = getAttribution();
      if (email && attr) {
        attributed.current = true;
        fetch("/api/attribution", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(attr),
        }).catch(() => {});
      }
    })();
    return () => {
      active = false;
    };
  }, [pathname, refreshProfile]);

  return null;
}
