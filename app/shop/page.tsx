import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import { presentCategories } from "@/lib/seo/dimensions";
import { categoryCopy } from "@/lib/seo/copy";
import { categoryPath, categoryUrl } from "@/lib/data/links";
import { breadcrumb } from "@/lib/seo/schema";

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Shop Designer Fashion by Category · OneTap Atelier",
  description:
    "Browse designer fashion by category — dresses, knitwear, tailoring, denim, outerwear and more — from 100+ luxury houses, and try each piece on yourself before you buy.",
  alternates: { canonical: "/shop" },
};

export default async function ShopHub() {
  const categories = await presentCategories();

  const jsonLd = [
    breadcrumb([
      { name: "Home", url: SITE },
      { name: "Shop", url: `${SITE}/shop` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Shop by Category · OneTap Atelier",
      url: `${SITE}/shop`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: categories.length,
        itemListElement: categories.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c,
          url: categoryUrl(c, SITE),
        })),
      },
    },
  ];

  return (
    <main className="page-shell">
      <Header />
      <JsonLd data={jsonLd} />
      <div className="wrap">
        <section className="sec-hero sec-hero--left">
          <p className="eyebrow">Shop</p>
          <h1>Shop by category</h1>
          <p className="sec-sub">
            Designer dresses, knitwear, tailoring and more from 100+ luxury houses — see each
            piece on yourself before you buy with AI virtual try-on.
          </p>
        </section>
        <nav className="seo-hub" aria-label="Categories">
          {categories.map((c) => (
            <Link key={c} href={categoryPath(c)} className="seo-hub-tile">
              <span className="seo-hub-name">{c}</span>
              <span className="seo-hub-sub">{categoryCopy(c).answer.split(".")[0]}.</span>
            </Link>
          ))}
        </nav>
      </div>
      <SiteFooter />
    </main>
  );
}
