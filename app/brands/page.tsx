import type { Metadata } from "next";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import BrandIndex from "@/components/brands/BrandIndex";
import JsonLd from "@/components/seo/JsonLd";
import { fetchBrands } from "@/lib/data/getBrands";
import { brandUrl } from "@/lib/data/links";

export const revalidate = 3600; // ISR — refresh the brand index hourly.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Designer & Fashion Brands A–Z · OneTap Atelier",
  description:
    "Explore every designer and fashion brand on OneTap Atelier, A to Z. Try each label on you with AI virtual try-on, styled looks and 360° reels — before you buy.",
  alternates: { canonical: "/brands" },
  openGraph: {
    title: "Explore Brands A–Z · OneTap Atelier",
    description:
      "Every designer and fashion brand on OneTap Atelier — try them on you before you buy.",
    url: `${SITE_URL}/brands`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Brands A–Z · OneTap Atelier",
    description:
      "Every designer and fashion brand on OneTap Atelier — try them on you before you buy.",
  },
};

export default async function BrandsPage() {
  const brands = await fetchBrands();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Explore Brands A–Z",
      description:
        "Every designer and fashion brand on OneTap Atelier, listed A to Z.",
      url: `${SITE_URL}/brands`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Brands", item: `${SITE_URL}/brands` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Brands on OneTap Atelier",
      numberOfItems: brands.length,
      itemListElement: brands.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        url: brandUrl(b.name, SITE_URL),
      })),
    },
  ];

  return (
    <main className="page-shell">
      <Header />
      <JsonLd data={jsonLd} />

      <div className="wrap">
        <section className="sec-hero sec-hero--left">
          <p className="eyebrow">OneTap Atelier</p>
          <h1>Explore brands</h1>
          <p className="sec-sub">
            The houses we carry, A to Z. Choose a label to see its pieces — and try
            them on you before you buy.
          </p>
        </section>

        <BrandIndex brands={brands} />
      </div>

      <SiteFooter />
    </main>
  );
}
