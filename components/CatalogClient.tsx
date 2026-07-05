"use client";

import { useEffect, useRef } from "react";
import ProductGrid from "@/components/ProductGrid";
import { type Product } from "@/lib/data/products";
import { type FacetOptions } from "@/lib/data/facets";
import { useAtelier } from "@/lib/store";
import { useStartTryOn } from "@/lib/billing/useStartTryOn";

/** Curator grid + the trigger for the global try-on island (TryOnProvider). */
export default function CatalogClient({
  initialProducts,
  initialTotal,
  initialFacets,
  initialBrand,
  initialOccasions,
}: {
  initialProducts: Product[];
  initialTotal: number;
  initialFacets: FacetOptions;
  /** Brand pre-selected from the URL (?brands=) - e.g. a /brands landing CTA. */
  initialBrand?: string | null;
  /** Occasions pre-selected from the URL (?occasions=) - e.g. a home occasion tile. */
  initialOccasions?: string[];
}) {
  const profileLoaded = useAtelier((s) => s.profileLoaded);
  const openTryOn = useStartTryOn();
  const autoOpened = useRef(false);

  // Campaign deeplink: /try/<id> redirects to /?try=<id>. Once the session has
  // resolved, fetch that product by id (it may not be on the first page) and
  // auto-open its try-on (running the same gate).
  useEffect(() => {
    if (autoOpened.current || !profileLoaded) return;
    const id = new URLSearchParams(window.location.search).get("try");
    if (!id) return;
    autoOpened.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/products/${id}`, { cache: "no-store" });
        if (!res.ok) return;
        const { product } = await res.json();
        if (product) void openTryOn(product);
      } catch {
        /* deeplink lookup failed - ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileLoaded]);

  return (
    <ProductGrid
      initialProducts={initialProducts}
      initialTotal={initialTotal}
      initialFacets={initialFacets}
      initialBrand={initialBrand}
      initialOccasions={initialOccasions}
      onTry={openTryOn}
    />
  );
}
