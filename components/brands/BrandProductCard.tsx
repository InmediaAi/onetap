import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Product } from "@/lib/data/products";
import { campaignPath } from "@/lib/data/links";

const IMG_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

/** Only allow-listed hosts can be optimized by next/image; else a plain <img>. */
function optimizable(url?: string): boolean {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return h.endsWith(".supabase.co") || h.endsWith("unsplash.com");
  } catch {
    return false;
  }
}

/**
 * Server-rendered product tile for the brand landing grid — a crawlable link to
 * the piece's PDP (no client JS / try-on interaction; that lives in the Curator).
 */
export default function BrandProductCard({ product }: { product: Product }) {
  const alt = `${product.brand} — ${product.name}`;
  return (
    <Link href={campaignPath(product)} className="card brand-piece">
      <div className="ptile">
        <div className="mono">{product.mono}</div>
        {optimizable(product.imageUrl) ? (
          <Image className="pimg" src={product.imageUrl} alt={alt} fill sizes={IMG_SIZES} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="pimg" src={product.imageUrl} alt={alt} loading="lazy" />
        )}
      </div>
      <div className="meta">
        <span className="house">{product.brand}</span>
        <span className="name">{product.name}</span>
        <span className="price">{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}
