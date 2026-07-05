"use client";

import { useEffect } from "react";
import { toast } from "@/lib/toast/bus";

/**
 * Last-resort net: surfaces a friendly toast for any UNHANDLED async failure
 * (a rejected promise no `catch` caught) so the user is never left with a dead
 * button and no feedback. Errors already surfaced by `apiJson` (our ApiError,
 * which toasts itself) are skipped to avoid double toasts. Renders nothing.
 *
 * We deliberately do NOT listen to `window.onerror` — resource/3rd-party/script
 * noise would produce false toasts. Genuine render crashes are handled by the
 * route error boundaries (app/error.tsx, app/global-error.tsx).
 */
export default function GlobalErrorToaster() {
  useEffect(() => {
    function alreadyHandled(reason: unknown): boolean {
      return Boolean(
        reason &&
          typeof reason === "object" &&
          ((reason as { name?: string }).name === "ApiError" ||
            (reason as { toasted?: boolean }).toasted === true),
      );
    }

    function onRejection(ev: PromiseRejectionEvent) {
      if (alreadyHandled(ev.reason)) return;
      toast.error("Something went wrong. Please try again.");
    }

    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, []);

  return null;
}
