import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import JsonLd from "@/components/seo/JsonLd";
import { fetchGuide, fetchGuides } from "@/lib/data/guides";
import { renderMarkdown } from "@/lib/seo/markdown";
import { faqPage, breadcrumb } from "@/lib/seo/schema";
import { brandPath, occasionPath } from "@/lib/data/links";

export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateStaticParams() {
  const guides = await fetchGuides();
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await fetchGuide(slug);
  if (!guide) return { title: "Journal · OneTap Atelier" };
  const title = `${guide.title} · OneTap Atelier`;
  const description = guide.metaDescription || guide.answer || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/journal/${guide.slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE}/journal/${guide.slug}`,
      images: guide.heroImage ? [guide.heroImage] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await fetchGuide(slug);
  if (!guide) notFound();

  const url = `${SITE}/journal/${guide.slug}`;
  const jsonLd = [
    breadcrumb([
      { name: "Home", url: SITE },
      { name: "Journal", url: `${SITE}/journal` },
      { name: guide.title, url },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.metaDescription || guide.answer || undefined,
      ...(guide.heroImage ? { image: [guide.heroImage] } : {}),
      ...(guide.publishedAt ? { datePublished: guide.publishedAt } : {}),
      ...(guide.updatedAt ? { dateModified: guide.updatedAt } : {}),
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "OneTap Atelier" },
      publisher: {
        "@type": "Organization",
        name: "OneTap Atelier",
        logo: { "@type": "ImageObject", url: `${SITE}/icon.svg` },
      },
    },
    ...(guide.faq.length ? [faqPage(guide.faq)] : []),
  ];

  const related = [
    ...guide.relatedBrands.map((b) => ({ label: b, href: brandPath(b) })),
    ...guide.relatedOccasions.map((o) => ({ label: o, href: occasionPath(o) })),
  ];

  return (
    <main className="page-shell">
      <Header />
      <JsonLd data={jsonLd} />
      <div className="wrap">
        <article className="guide">
          <header className="sec-hero sec-hero--left">
            <p className="eyebrow">
              <Link href="/journal" className="brand-crumb">
                Journal
              </Link>
            </p>
            <h1>{guide.title}</h1>
            {guide.answer && <p className="sec-sub">{guide.answer}</p>}
          </header>

          <div
            className="guide-body"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(guide.bodyMd) }}
          />

          {guide.faq.length > 0 && (
            <section className="seo-faq" aria-label="Frequently asked questions">
              <h2 className="seo-faq-title">Frequently asked</h2>
              {guide.faq.map((f) => (
                <div key={f.q} className="seo-faq-item">
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </section>
          )}

          {related.length > 0 && (
            <nav className="seo-related" aria-label="Explore more">
              {related.map((r) => (
                <Link key={r.href} href={r.href} className="seo-related-link">
                  {r.label}
                </Link>
              ))}
            </nav>
          )}
        </article>
      </div>
      <SiteFooter />
    </main>
  );
}
