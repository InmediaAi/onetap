import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import { presentOccasions } from "@/lib/seo/dimensions";
import { occasionCopy } from "@/lib/seo/copy";
import { occasionPath, occasionUrl } from "@/lib/data/links";
import { breadcrumb } from "@/lib/seo/schema";

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "Shop by Occasion — Outfits for Every Event · OneTap Atelier",
  description:
    "Find the perfect outfit for every occasion — wedding guest, cocktail, black tie, date night, work and more — and try each piece on yourself before you buy.",
  alternates: { canonical: "/occasions" },
};

export default async function OccasionsHub() {
  const occasions = await presentOccasions();

  const jsonLd = [
    breadcrumb([
      { name: "Home", url: SITE },
      { name: "Occasions", url: `${SITE}/occasions` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Shop by Occasion · OneTap Atelier",
      url: `${SITE}/occasions`,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: occasions.length,
        itemListElement: occasions.map((o, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: o,
          url: occasionUrl(o, SITE),
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
          <p className="eyebrow">Occasions</p>
          <h1>Dressed for every occasion</h1>
          <p className="sec-sub">
            From wedding-guest dresses to black-tie gowns and off-duty weekend looks — browse
            curated pieces from 100+ designer houses and see each one on yourself before you buy.
          </p>
        </section>
        <nav className="seo-hub" aria-label="Occasions">
          {occasions.map((o) => (
            <Link key={o} href={occasionPath(o)} className="seo-hub-tile">
              <span className="seo-hub-name">{o}</span>
              <span className="seo-hub-sub">{occasionCopy(o).answer.split(".")[0]}.</span>
            </Link>
          ))}
        </nav>
      </div>
      <SiteFooter />
    </main>
  );
}
