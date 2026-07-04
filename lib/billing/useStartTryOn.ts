"use client";

import { type Product } from "@/lib/data/products";
import { useAtelier, type TryOnJob } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { ensureCanGenerateVideo } from "@/lib/billing/gate";

type Toast = ReturnType<typeof useToast>;

/** A catalog product → a Curator 360° job for the global island. */
export function productToTryOnJob(product: Product): TryOnJob {
  return {
    id: product.id,
    kind: "spin",
    garmentImage: product.imageUrl,
    garmentImages: product.images?.length ? product.images : [product.imageUrl],
    thumbImage: product.imageUrl,
    brand: product.brand,
    name: product.name,
    price: product.price,
    mono: product.mono,
    buyUrl: product.buyUrl,
    turnLabel: "360°",
    turnSub: "The Turn",
    productId: product.id,
    wishable: true,
  };
}

/**
 * The single generation trigger shared by every module: track → enforce one
 * session at a time → sign-in/quota gate → start the global island (which then
 * handles the full-length-photo requirement + the actual generation).
 */
async function begin(job: TryOnJob, toast: Toast): Promise<void> {
  track(EVENTS.PRODUCT_TRY_CLICKED, {
    productId: job.productId,
    kind: job.kind,
    brand: job.brand,
    price: job.price?.amount,
    currency: job.price?.currency,
  });
  // One generation at a time — the island stays alive until the current run ends.
  if (useAtelier.getState().activeTryOn) {
    toast.error("Let your current try-on finish first.");
    return;
  }
  // Gate before opening: signed in + a video left (every kind produces a video).
  if (!(await ensureCanGenerateVideo())) return;
  useAtelier.getState().startTryOn(job);
}

/** Curator try-on trigger — catalog grid + campaign landing pages. */
export function useStartTryOn() {
  const toast = useToast();
  return (product: Product) => begin(productToTryOnJob(product), toast);
}

/** 360 / Creator trigger — the module builds the job (upload or curated piece). */
export function useStartReel() {
  const toast = useToast();
  return (job: TryOnJob) => begin(job, toast);
}
