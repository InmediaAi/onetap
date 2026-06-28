"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";
import { formatPrice, type Product } from "@/lib/data/products";
import { COLOURS } from "@/lib/data/vocab";
import { useStartTryOn } from "@/lib/billing/useStartTryOn";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

const COLOUR_HEX = new Map(COLOURS.map((c) => [c.name, c.hex]));

/** Only hosts in next.config remotePatterns can be optimized; else a raw <img>. */
function optimizable(url?: string): boolean {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return h.endsWith(".supabase.co") || h.endsWith("unsplash.com");
  } catch {
    return false;
  }
}

function GalleryImage({ src, alt, priority }: { src: string; alt: string; priority?: boolean }) {
  if (optimizable(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 900px) 100vw, 48vw"
        className="pdp-img"
        priority={priority}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="pdp-img" />;
}

/**
 * Campaign product landing page (PDP). Shows one piece — its images + details —
 * and a OneTap Try-On CTA that runs the exact same flow as the Curator (the
 * global try-on island). Anonymous-safe; the try-on gate handles sign-in.
 */
export default function ProductLanding({ product }: { product: Product }) {
  const images = product.images?.length ? product.images : [product.imageUrl];
  const [idx, setIdx] = useState(0);
  const startTryOn = useStartTryOn();

  const go = (d: number) => setIdx((i) => (i + d + images.length) % images.length);

  function shop() {
    if (!product.buyUrl) return;
    track(EVENTS.PURCHASE_CLICKED, { productId: product.id });
    window.open(product.buyUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="pdp">
      {/* ——— Gallery ——— */}
      <div className="pdp-gallery">
        <div className="pdp-main">
          <div className="pdp-mono">{product.mono}</div>
          <GalleryImage
            key={images[idx]}
            src={images[idx]}
            alt={`${product.brand} — ${product.name}`}
            priority
          />
          {images.length > 1 && (
            <>
              <button className="pdp-nav prev" onClick={() => go(-1)} aria-label="Previous image">
                <ChevronLeft size={20} strokeWidth={1.5} />
              </button>
              <button className="pdp-nav next" onClick={() => go(1)} aria-label="Next image">
                <ChevronRight size={20} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {images.length > 1 && (
          <div className="pdp-thumbs">
            {images.map((src, i) => (
              <button
                key={src}
                className={"pdp-thumb" + (i === idx ? " on" : "")}
                onClick={() => setIdx(i)}
                aria-label={`View image ${i + 1}`}
              >
                <GalleryImage src={src} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ——— Details ——— */}
      <div className="pdp-details">
        <p className="pdp-brand">{product.brand}</p>
        <h1 className="pdp-name">{product.name}</h1>
        <p className="pdp-price">{formatPrice(product.price)}</p>

        {typeof product.oneTapScore === "number" && (
          <p className="pdp-score" aria-label={`OneTap score ${product.oneTapScore} out of 100`}>
            <span className="pdp-score-lbl">OneTap Score</span>
            <span className="pdp-score-num">
              {product.oneTapScore}
              <span className="pdp-score-sub">/100</span>
            </span>
          </p>
        )}

        {product.colours && product.colours.length > 0 && (
          <div className="pdp-colours">
            {product.colours.map((c) => (
              <span key={c} className="pdp-swatch" title={c}>
                <span className="pdp-dot" style={{ background: COLOUR_HEX.get(c) ?? "#ccc" }} />
                {c}
              </span>
            ))}
          </div>
        )}

        <div className="pdp-cta">
          <button className="pdp-try" onClick={() => startTryOn(product)}>
            <span className="mk" /> OneTap Try-On
          </button>
          {product.buyUrl && (
            <button className="pdp-shop" onClick={shop}>
              <ShoppingBag size={15} strokeWidth={1.5} /> Shop this piece
            </button>
          )}
        </div>

        {(product.stylistNote || product.description) && (
          <div className="pdp-notes">
            <h2 className="pdp-notes-h">Editor’s Notes</h2>
            {product.stylistNote && <p className="pdp-note-lead">{product.stylistNote}</p>}
            {product.description && <p className="pdp-note-body">{product.description}</p>}
          </div>
        )}

        {(product.category || (product.occasions && product.occasions.length > 0)) && (
          <div className="pdp-tags">
            {product.category && <span className="pdp-tag">{product.category}</span>}
            {product.occasions?.map((o) => (
              <span key={o} className="pdp-tag">
                {o}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
