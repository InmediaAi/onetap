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

/** Product image — next/image when the host allows, else a plain lazy <img>. */
function PImg({ src, alt, className, hidden }: { src: string; alt: string; className: string; hidden?: boolean }) {
  if (optimizable(src)) {
    return (
      <Image className={className} src={src} alt={alt} fill sizes={IMG_SIZES} aria-hidden={hidden || undefined} />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={src} alt={alt} loading="lazy" aria-hidden={hidden || undefined} />;
}

/**
 * Server-rendered product tile for the brand landing grid — a crawlable link to
 * the piece's PDP (no client JS / try-on interaction; that lives in the Curator).
 */
export default function BrandProductCard({ product }: { product: Product }) {
  const alt = `${product.brand} — ${product.name}`;
  // Second variant (if any) reveals on hover — same as the Curator card.
  const hoverImage = product.images?.find((u) => u && u !== product.imageUrl);
  return (
    <Link href={campaignPath(product)} className="card brand-piece">
      <div className={"ptile" + (hoverImage ? " has-alt" : "")}>
        <div className="mono">{product.mono}</div>
        <PImg className="pimg" src={product.imageUrl} alt={alt} />
        {hoverImage && <PImg className="pimg pimg-alt" src={hoverImage} alt="" hidden />}
      </div>
      <div className="meta">
        <span className="house">{product.brand}</span>
        <span className="name">{product.name}</span>
        <span className="price">{formatPrice(product.price)}</span>
      </div>
    </Link>
  );
}
