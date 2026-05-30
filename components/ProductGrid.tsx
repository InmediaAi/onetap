"use client";

import { products, type Product } from "@/lib/data/products";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  onTry,
}: {
  onTry: (product: Product) => void;
}) {
  return (
    <section className="mx-auto max-w-editorial px-6 pb-28 md:px-10">
      <div className="mb-10 flex items-end justify-between border-b border-hairline pb-5">
        <div>
          <p className="eyebrow">The Edit</p>
          <h2 className="mt-2 font-display text-2xl md:text-3xl">
            Considered, in every detail
          </h2>
        </div>
        <p className="hidden text-sm text-muted md:block">
          {products.length} pieces
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onTry={onTry} />
        ))}
      </div>
    </section>
  );
}
