import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import BrandProductCard from "@/components/brands/BrandProductCard";
import JsonLd from "@/components/seo/JsonLd";
import { fetchBrand } from "@/lib/data/getBrands";
import {
  brandPath,
  brandNewArrivalsPath,
  brandNewArrivalsUrl,
  curatorBrandPath,
  campaignUrl,
} from "@/lib/data/links";
import type { Product } from "@/lib/data/products";

export const revalidate = 3600; // ISR — refresh hourly.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Newest-first ordering — the natural "new arrivals" sort (drop date desc). */
function newestFirst(products: Product[]): Product[] {
  return [...products].sort((a, b) => {
    const ta = a.droppedAt ? Date.parse(a.droppedAt) : NaN;
    const tb = b.droppedAt ? Date.parse(b.droppedAt) : NaN;
    const va = Number.isNaN(ta) ? -Infinity : ta;
    const vb = Number.isNaN(tb) ? -Infinity : tb;
    return vb - va; // most recent first; undated pieces sink to the end (stable)
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await fetchBrand(slug);
  if (!brand) return { title: "New Arrivals · OneTap Atelier" };

  const title = `${brand.name} New Arrivals — New In · OneTap Atelier`;
  const description = `The latest ${brand.name} arrivals on OneTap Atelier — new-season pieces you can see on you before you buy. ${brand.count} ${
    brand.count === 1 ? "piece" : "pieces"
  } in the edit.`;

  return {
    title,
    description,
    alternates: { canonical: brandNewArrivalsPath(brand.name) },
    openGraph: {
      title,
      description,
      url: brandNewArrivalsUrl(brand.name, SITE_URL),
      type: "website",
      images: brand.heroImage ? [brand.heroImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: brand.heroImage ? [brand.heroImage] : undefined,
    },
  };
}

export default async function BrandNewArrivalsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await fetchBrand(slug);
  if (!brand) notFound();

  const pieces = newestFirst(brand.products);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Brands", item: `${SITE_URL}/brands` },
        {
          "@type": "ListItem",
          position: 3,
          name: brand.name,
          item: `${SITE_URL}${brandPath(brand.name)}`,
        },
        {
          "@type": "ListItem",
          position: 4,
          name: "New Arrivals",
          item: brandNewArrivalsUrl(brand.name, SITE_URL),
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${brand.name} New Arrivals`,
      url: brandNewArrivalsUrl(brand.name, SITE_URL),
      about: { "@type": "Brand", name: brand.name },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: pieces.length,
        itemListElement: pieces.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${p.brand} — ${p.name}`,
          url: campaignUrl(p, SITE_URL),
        })),
      },
    },
  ];

  return (
    <main className="page-shell">
      <Header />
      <JsonLd data={jsonLd} />

      <div className="wrap">
        <section className="sec-hero sec-hero--left brand-hero">
          <p className="eyebrow">
            <Link href="/brands" className="brand-crumb">
              Brands
            </Link>
            {" / "}
            <Link href={brandPath(brand.name)} className="brand-crumb">
              {brand.name}
            </Link>
          </p>
          <h1>{brand.name} New Arrivals</h1>
          <p className="sec-sub">
            The latest from {brand.name} in the OneTap edit — the newest{" "}
            {brand.count === 1 ? "piece" : "pieces"} first, each one you can see on
            you before you buy.
          </p>
          <div className="brand-hero-cta">
            <Link href={curatorBrandPath(brand.name)} className="btn-line">
              Open {brand.name} in the Curator
            </Link>
          </div>
        </section>

        <section className="brand-pieces">
          <div className="grid-list">
            {pieces.map((p) => (
              <BrandProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
