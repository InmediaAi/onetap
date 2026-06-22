"use client";

import { useEffect, useRef } from "react";
import ProductGrid from "@/components/ProductGrid";
import { type Product } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { ensureCanGenerateVideo } from "@/lib/billing/gate";

/** Curator grid + the trigger for the global try-on island (TryOnProvider). */
export default function CatalogClient({ products }: { products: Product[] }) {
  const profileLoaded = useAtelier((s) => s.profileLoaded);
  const toast = useToast();
  const autoOpened = useRef(false);

  async function openTryOn(product: Product) {
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
    // Gate before opening: must be signed in and have a video left (the curator
    // produces a 360°). The gate opens the sign-in or pricing modal as needed.
    if (!(await ensureCanGenerateVideo())) return;
    useAtelier.getState().startTryOn(product);
  }

  // Campaign deeplink: /try/<id> redirects to /?try=<id>. Once the session has
  // resolved, auto-open that product's try-on (running the same gate). Read from
  // the URL directly to avoid a useSearchParams Suspense boundary.
  useEffect(() => {
    if (autoOpened.current || !profileLoaded) return;
    const id = new URLSearchParams(window.location.search).get("try");
    if (!id) return;
    const product = products.find((p) => p.id === id);
    if (!product) return;
    autoOpened.current = true;
    void openTryOn(product);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded, products]);

  return <ProductGrid products={products} onTry={openTryOn} />;
}
