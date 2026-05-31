"use client";

import { Heart } from "lucide-react";
import type { Product } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";

export default function ProductCard({
  product,
  index = 0,
  onTry,
}: {
  product: Product;
  index?: number;
  onTry: (product: Product) => void;
}) {
  const wished = useAtelier((s) => s.wishlist.includes(product.id));
  const toggleWish = useAtelier((s) => s.toggleWish);

  return (
    <div className="card" style={{ animationDelay: `${(index % 8) * 0.04}s` }}>
      <div className="ptile" onClick={() => onTry(product)}>
        <div className="mono">{product.mono}</div>
        {/* Real editorial image sits over the monogram placeholder. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pimg"
          src={product.imageUrl}
          alt={`${product.brand} — ${product.name}`}
          loading="lazy"
        />
        <div className="inset" />

        <button
          className={"heart" + (wished ? " on" : "")}
          onClick={(e) => {
            e.stopPropagation();
            toggleWish(product.id);
          }}
          aria-label="Save"
        >
          <Heart size={17} strokeWidth={1.4} />
        </button>

        <div className="tile-cta">
          <button
            className="tryon-btn"
            onClick={(e) => {
              e.stopPropagation();
              onTry(product);
            }}
          >
            <span className="mk" /> OneTap Try-On
          </button>
        </div>
      </div>

      <div className="meta">
        <span className="house">{product.brand}</span>
        <span className="name">{product.name}</span>
        <span className="price">{product.price}</span>
        <button className="tryon-link" onClick={() => onTry(product)}>
          <span className="mk" /> OneTap Try-On
        </button>
      </div>
    </div>
  );
}
