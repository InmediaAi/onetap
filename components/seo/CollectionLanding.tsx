import Link from "next/link";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import BrandProductCard from "@/components/brands/BrandProductCard";
import JsonLd from "@/components/seo/JsonLd";
import type { Product } from "@/lib/data/products";
import { breadcrumb, collectionPage, faqPage } from "@/lib/seo/schema";

/**
 * Shared server-rendered template for the programmatic SEO landing pages
 * (occasion / category / brand×category). GEO-shaped: a direct-answer intro up
 * top, a real product grid, a visible FAQ that matches the FAQPage schema, and an
 * internal-link rail. Fully crawlable (no client-gated content).
 */
export default function CollectionLanding({
  crumbs,
  h1,
  intro,
  styling,
  faq,
  products,
  canonicalUrl,
  collectionName,
  collectionDescription,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
  related,
}: {
  /** Breadcrumb trail (last item is this page). Drives the schema + visible crumb. */
  crumbs: { name: string; url: string }[];
  h1: string;
  intro: string;
  styling?: string;
  faq: { q: string; a: string }[];
  products: Product[];
  canonicalUrl: string;
  collectionName: string;
  collectionDescription?: string;
  ctaHref: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  related?: { label: string; href: string }[];
}) {
  const jsonLd = [
    breadcrumb(crumbs),
    collectionPage({
      name: collectionName,
      url: canonicalUrl,
      description: collectionDescription,
      products,
    }),
    ...(faq.length ? [faqPage(faq)] : []),
  ];

  const parent = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : null;

  return (
    <main className="page-shell">
      <Header />
      <JsonLd data={jsonLd} />

      <div className="wrap">
        <section className="sec-hero sec-hero--left brand-hero">
          {parent && (
            <p className="eyebrow">
              <Link href={new URL(parent.url).pathname} className="brand-crumb">
                {parent.name}
              </Link>
            </p>
          )}
          <h1>{h1}</h1>
          <p className="sec-sub">{intro}</p>
          {styling && <p className="seo-styling">{styling}</p>}
          <div className="brand-hero-cta">
            <Link href={ctaHref} className="btn-line">
              {ctaLabel}
            </Link>
            {secondaryHref && secondaryLabel && (
              <Link href={secondaryHref} className="brand-crumb">
                {secondaryLabel} →
              </Link>
            )}
          </div>
        </section>

        <section className="brand-pieces">
          <div className="grid-list">
            {products.map((p) => (
              <BrandProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {faq.length > 0 && (
          <section className="seo-faq" aria-label="Frequently asked questions">
            <h2 className="seo-faq-title">Frequently asked</h2>
            {faq.map((f) => (
              <div key={f.q} className="seo-faq-item">
                <h3>{f.q}</h3>
                <p>{f.a}</p>
              </div>
            ))}
          </section>
        )}

        {related && related.length > 0 && (
          <nav className="seo-related" aria-label="Explore more">
            {related.map((r) => (
              <Link key={r.href} href={r.href} className="seo-related-link">
                {r.label}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
