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
  brandUrl,
  brandNewArrivalsPath,
  curatorBrandPath,
  campaignUrl,
} from "@/lib/data/links";

export const revalidate = 3600; // ISR - refresh brand landing pages hourly.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await fetchBrand(slug);
  if (!brand) return { title: "Brand · OneTap Atelier" };

  const title = `${brand.name} - Shop & Try On · OneTap Atelier`;
  const description = `See ${brand.name} on you before you buy - ${brand.count} ${
    brand.count === 1 ? "piece" : "pieces"
  } in the OneTap edit. AI virtual try-on, styled looks and 360° reels.`;

  return {
    title,
    description,
    alternates: { canonical: brandPath(brand.name) },
    openGraph: {
      title,
      description,
      url: brandUrl(brand.name, SITE_URL),
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

export default async function BrandLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const brand = await fetchBrand(slug);
  if (!brand) notFound();

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
          item: brandUrl(brand.name, SITE_URL),
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: `${brand.name} on OneTap Atelier`,
      url: brandUrl(brand.name, SITE_URL),
      about: { "@type": "Brand", name: brand.name },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: brand.products.length,
        itemListElement: brand.products.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${p.brand} - ${p.name}`,
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
          </p>
          <h1>{brand.name}</h1>
          <p className="sec-sub">
            {brand.count} {brand.count === 1 ? "piece" : "pieces"} from {brand.name} in
            the OneTap edit - see each one on you before you buy.
          </p>
          <div className="brand-hero-cta">
            <Link href={curatorBrandPath(brand.name)} className="btn-line">
              Open {brand.name} in the Curator
            </Link>
            <Link href={brandNewArrivalsPath(brand.name)} className="brand-crumb">
              New in {brand.name} →
            </Link>
          </div>
        </section>

        <section className="brand-pieces">
          <div className="grid-list">
            {brand.products.map((p) => (
              <BrandProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
