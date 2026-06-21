"use client";

import { Heart } from "lucide-react";
import { formatPrice, type Product } from "@/lib/data/products";
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
  // Second variant (if any) reveals on hover.
  const hoverImage = product.images?.find((u) => u && u !== product.imageUrl);

  return (
    <div className="card" style={{ animationDelay: `${(index % 8) * 0.04}s` }}>
      <div className={"ptile" + (hoverImage ? " has-alt" : "")}>
        <div className="mono">{product.mono}</div>
        {/* Real editorial image sits over the monogram placeholder. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pimg"
          src={product.imageUrl}
          alt={`${product.brand} — ${product.name}`}
          loading="lazy"
        />
        {hoverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pimg pimg-alt" src={hoverImage} alt="" loading="lazy" aria-hidden="true" />
        )}
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
          <button className="tryon-btn" onClick={() => onTry(product)}>
            <span className="mk" /> OneTap Try-On
          </button>
        </div>
      </div>

      {/* Persistent try-on action — directly under the image (shown on touch;
          hidden on hover-capable devices, where the tile overlay is used). */}
      <button className="tryon-link" onClick={() => onTry(product)}>
        <span className="mk" /> OneTap Try-On
      </button>

      <div className="meta">
        <span className="house">{product.brand}</span>
        <span className="name">{product.name}</span>
        {product.stylistNote && (
          <span className="stylist-note">{product.stylistNote}</span>
        )}
        <span className="price">{formatPrice(product.price)}</span>
      </div>
    </div>
  );
}
