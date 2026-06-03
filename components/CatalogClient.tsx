"use client";

import { useState } from "react";
import ProductGrid from "@/components/ProductGrid";
import TryOnModal from "@/components/TryOnModal";
import { type Product } from "@/lib/data/products";

/** Client island: holds the active-product / try-on state for the catalog. */
export default function CatalogClient({ products }: { products: Product[] }) {
  const [active, setActive] = useState<Product | null>(null);

  return (
    <>
      <div className="wrap edit-subhead">
        <div>
          <p className="eyebrow">The Edit</p>
          <h2 className="edit-title">Considered, in every detail</h2>
        </div>
        <span className="edit-count">{products.length} pieces</span>
      </div>
      <ProductGrid products={products} onTry={setActive} />
      <TryOnModal product={active} onClose={() => setActive(null)} />
    </>
  );
}
