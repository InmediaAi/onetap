"use client";

import { useEffect, useState } from "react";

/**
 * True once mounted on the client. The persisted Zustand store uses synchronous
 * localStorage, so it has rehydrated by the time the first effect runs — this
 * flag guards against reading `portrait`/`looks` during SSR (avoids flashes).
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
