"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAtelier } from "@/lib/store";

/**
 * Loads the authenticated profile into the store once (and on route changes,
 * cheaply) so identity (portrait/brands) and usage are available app-wide.
 * Identity is no longer in localStorage — this rehydrates it after login.
 * No-ops gracefully when unauthenticated or Supabase is unconfigured.
 */
export default function SessionLoader() {
  const hydrateProfile = useAtelier((s) => s.hydrateProfile);
  const resetSession = useAtelier((s) => s.resetSession);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active || !d) return;
        if (d.authed) {
          hydrateProfile({
            username: d.username,
            email: d.email,
            brands: d.brands ?? [],
            selfieUrl: d.selfieUrl ?? null,
            bodyUrl: d.bodyUrl ?? null,
            leftUrl: d.leftUrl ?? null,
            rightUrl: d.rightUrl ?? null,
            backUrl: d.backUrl ?? null,
            modelUrl: d.modelUrl ?? null,
            heightInches: d.heightInches ?? null,
            style: d.style ?? [],
            categories: d.categories ?? [],
            goals: d.goals ?? [],
            sceneMood: d.sceneMood ?? [],
            sceneSetting: d.sceneSetting ?? [],
            usage: d.usage,
          });
        } else {
          resetSession();
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // Re-check on navigation (e.g. after returning from /auth/callback).
  }, [pathname, hydrateProfile, resetSession]);

  return null;
}
