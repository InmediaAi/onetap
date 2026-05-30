"use client";

import Image from "next/image";
import type { Product } from "@/lib/data/products";

export default function ProductCard({
  product,
  onTry,
}: {
  product: Product;
  onTry: (product: Product) => void;
}) {
  return (
    <div className="group flex flex-col">
      <button
        onClick={() => onTry(product)}
        className="relative aspect-[3/4] w-full overflow-hidden bg-[#f6f6f6]"
        aria-label={`Try on ${product.name}`}
      >
        <Image
          src={product.imageUrl}
          alt={`${product.brand} — ${product.name}`}
          fill
          sizes="(max-width: 768px) 100vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        <span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center bg-ink py-3 text-[11px] uppercase tracking-luxe text-canvas transition-transform duration-300 group-hover:translate-y-0">
          OneTap Try-On
        </span>
      </button>

      <div className="mt-4 flex flex-col gap-1">
        <p className="text-[11px] uppercase tracking-luxe text-muted">
          {product.brand}
        </p>
        <p className="font-display text-base leading-snug">{product.name}</p>
        <p className="text-sm text-ink">{product.price}</p>
      </div>
    </div>
  );
}
