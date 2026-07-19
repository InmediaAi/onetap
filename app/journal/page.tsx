import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import { fetchGuides } from "@/lib/data/guides";
import { breadcrumb } from "@/lib/seo/schema";

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "The Journal — Style Guides & Edits · OneTap Atelier",
  description:
    "Style guides, occasion edits and how-to-wear notes from OneTap Atelier — see the pieces on yourself before you buy.",
  alternates: { canonical: "/journal" },
};

export default async function JournalIndex() {
  const guides = await fetchGuides();

  const jsonLd = [
    breadcrumb([
      { name: "Home", url: SITE },
      { name: "Journal", url: `${SITE}/journal` },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "The OneTap Atelier Journal",
      url: `${SITE}/journal`,
      blogPost: guides.map((g) => ({
        "@type": "BlogPosting",
        headline: g.title,
        url: `${SITE}/journal/${g.slug}`,
        ...(g.publishedAt ? { datePublished: g.publishedAt } : {}),
      })),
    },
  ];

  return (
    <main className="page-shell">
      <Header />
      <JsonLd data={jsonLd} />
      <div className="wrap">
        <section className="sec-hero sec-hero--left">
          <p className="eyebrow">The Journal</p>
          <h1>Style guides & edits</h1>
          <p className="sec-sub">
            How to wear the season, dressing for every occasion, and the houses worth knowing —
            with every piece you can try on yourself before you buy.
          </p>
        </section>

        {guides.length === 0 ? (
          <p className="sec-sub" style={{ marginTop: "1.5rem" }}>
            New guides are on the way. In the meantime, explore the{" "}
            <Link href="/occasions" className="brand-crumb">
              occasion edits
            </Link>{" "}
            and{" "}
            <Link href="/shop" className="brand-crumb">
              shop by category
            </Link>
            .
          </p>
        ) : (
          <div className="seo-hub">
            {guides.map((g) => (
              <Link key={g.slug} href={`/journal/${g.slug}`} className="seo-hub-tile">
                <span className="seo-hub-name">{g.title}</span>
                {g.metaDescription && <span className="seo-hub-sub">{g.metaDescription}</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter />
    </main>
  );
}
