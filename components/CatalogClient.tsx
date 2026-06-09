"use client";

import { useEffect, useRef, useState } from "react";
import ProductGrid from "@/components/ProductGrid";
import TryOnModal from "@/components/TryOnModal";
import { type Product } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { ensureCanGenerateVideo } from "@/lib/billing/gate";

/** Client island: holds the active-product / try-on state for the catalog. */
export default function CatalogClient({ products }: { products: Product[] }) {
  const [active, setActive] = useState<Product | null>(null);
  const profileLoaded = useAtelier((s) => s.profileLoaded);
  const autoOpened = useRef(false);

  async function openTryOn(product: Product) {
    track(EVENTS.PRODUCT_TRY_CLICKED, {
      productId: product.id,
      brand: product.brand,
      price: product.price.amount,
      currency: product.price.currency,
    });
    // Gate before opening: must be signed in and have a video left (the curator
    // produces a 360°). The gate opens the sign-in or pricing modal as needed.
    if (!(await ensureCanGenerateVideo())) return;
    setActive(product);
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

  return (
    <>
      <ProductGrid products={products} onTry={openTryOn} />
      <TryOnModal product={active} onClose={() => setActive(null)} />
    </>
  );
}
