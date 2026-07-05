"use client";

import Image from "next/image";
import { Heart } from "lucide-react";
import { formatPrice, type Product } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";

// Grid columns at our breakpoints - lets next/image request a right-sized file.
const IMG_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

/** Only hosts in next.config remotePatterns can be optimized; everything else
 *  (a rare re-host-failed retailer URL) falls back to a plain <img>. */
function optimizable(url?: string): boolean {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return h.endsWith(".supabase.co") || h.endsWith("unsplash.com");
  } catch {
    return false;
  }
}

/** Product image - next/image (resized, Vercel-CDN cached) when the host allows,
 *  else a raw lazy <img>. */
function PImg({ src, alt, className, hidden }: { src: string; alt: string; className: string; hidden?: boolean }) {
  if (optimizable(src)) {
    return (
      <Image
        className={className}
        src={src}
        alt={alt}
        fill
        sizes={IMG_SIZES}
        aria-hidden={hidden || undefined}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt={alt} loading="lazy" aria-hidden={hidden || undefined} />;
}

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
        <PImg
          className="pimg"
          src={product.imageUrl}
          alt={`${product.brand} - ${product.name}`}
        />
        {hoverImage && (
          <PImg className="pimg pimg-alt" src={hoverImage} alt="" hidden />
        )}

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

      {/* Persistent try-on action - directly under the image (shown on touch;
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
