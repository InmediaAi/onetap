"use client";

import { useState } from "react";
import ProductGrid from "@/components/ProductGrid";
import TryOnModal from "@/components/TryOnModal";
import { type Product } from "@/lib/data/products";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

/** Client island: holds the active-product / try-on state for the catalog. */
export default function CatalogClient({ products }: { products: Product[] }) {
  const [active, setActive] = useState<Product | null>(null);

  function openTryOn(product: Product) {
    track(EVENTS.PRODUCT_TRY_CLICKED, {
      productId: product.id,
      brand: product.brand,
      price: product.price.amount,
      currency: product.price.currency,
    });
    setActive(product);
  }

  return (
    <>
      <ProductGrid products={products} onTry={openTryOn} />
      <TryOnModal product={active} onClose={() => setActive(null)} />
    </>
  );
}
