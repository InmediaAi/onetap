import { campaignUrl } from "@/lib/data/links";
import type { Product } from "@/lib/data/products";

/**
 * Reusable schema.org JSON-LD builders (plain objects → <JsonLd data={...} />).
 * Mirrors the shapes already used on the brand pages, extended with FAQPage +
 * Product for rich results and AI-answer-engine (GEO) citation.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export function breadcrumb(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function itemList(products: Product[], site: string = SITE) {
  return {
    "@type": "ItemList",
    numberOfItems: products.length,
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: `${p.brand} - ${p.name}`,
      url: campaignUrl(p, site),
    })),
  };
}

export function collectionPage(opts: {
  name: string;
  url: string;
  description?: string;
  products: Product[];
  site?: string;
}) {
  const site = opts.site ?? SITE;
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    url: opts.url,
    ...(opts.description ? { description: opts.description } : {}),
    isPartOf: { "@type": "WebSite", name: "OneTap Atelier", url: site },
    mainEntity: itemList(opts.products, site),
  };
}

export function faqPage(faq: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** Product schema for a PDP (rich snippet + GEO). */
export function productSchema(p: Product, canonicalUrl: string) {
  const images = [p.imageUrl, ...(p.images ?? [])].filter(
    (u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i,
  );
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    brand: { "@type": "Brand", name: p.brand },
    ...(images.length ? { image: images } : {}),
    ...(p.category ? { category: p.category } : {}),
    ...(p.description || p.stylistNote
      ? { description: p.description || p.stylistNote }
      : {}),
    ...(p.price?.amount
      ? {
          offers: {
            "@type": "Offer",
            price: String(p.price.amount),
            priceCurrency: p.price.currency,
            availability: "https://schema.org/InStock",
            url: canonicalUrl,
          },
        }
      : {}),
  };
}
