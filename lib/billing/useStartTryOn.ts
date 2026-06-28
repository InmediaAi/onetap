"use client";

import { type Product } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { ensureCanGenerateVideo } from "@/lib/billing/gate";

/**
 * The single Curator try-on trigger, shared by the catalog grid and the campaign
 * landing page so both run the EXACT same validation + action: track → enforce
 * one session at a time → sign-in/quota gate → start the global try-on island
 * (which then handles the full-length-photo requirement + generation).
 */
export function useStartTryOn() {
  const toast = useToast();

  return async function startTryOn(product: Product) {
    track(EVENTS.PRODUCT_TRY_CLICKED, {
      productId: product.id,
      brand: product.brand,
      price: product.price.amount,
      currency: product.price.currency,
    });
    // One try-on at a time — the island stays alive until the current run ends.
    if (useAtelier.getState().activeTryOn) {
      toast.error("Let your current try-on finish first.");
      return;
    }
    // Gate before opening: signed in + a video left (the curator produces a 360°).
    if (!(await ensureCanGenerateVideo())) return;
    useAtelier.getState().startTryOn(product);
  };
}
