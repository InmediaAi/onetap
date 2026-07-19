import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CollectionLanding from "@/components/seo/CollectionLanding";
import {
  occasionFromSlug,
  occasionProducts,
  presentOccasions,
} from "@/lib/seo/dimensions";
import { occasionCopy } from "@/lib/seo/copy";
import {
  occasionPath,
  occasionUrl,
  curatorOccasionPath,
  categoryPath,
} from "@/lib/data/links";
import { kebab } from "@/lib/supabase/util";

export const revalidate = 3600; // ISR hourly

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateStaticParams() {
  const occasions = await presentOccasions();
  return occasions.map((o) => ({ occasion: kebab(o) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ occasion: string }>;
}): Promise<Metadata> {
  const { occasion: slug } = await params;
  const occasion = occasionFromSlug(slug);
  if (!occasion) return { title: "Occasion · OneTap Atelier" };
  const title = `${occasion} Outfits to Try On Before You Buy · OneTap Atelier`;
  const description = occasionCopy(occasion).answer;
  const url = occasionUrl(occasion, SITE);
  return {
    title,
    description,
    alternates: { canonical: occasionPath(occasion) },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function OccasionPage({
  params,
}: {
  params: Promise<{ occasion: string }>;
}) {
  const { occasion: slug } = await params;
  const occasion = occasionFromSlug(slug);
  if (!occasion) notFound();

  const { products } = await occasionProducts(occasion);
  if (products.length === 0) notFound();

  const copy = occasionCopy(occasion);
  const others = (await presentOccasions()).filter((o) => o !== occasion).slice(0, 6);

  return (
    <CollectionLanding
      crumbs={[
        { name: "Home", url: SITE },
        { name: "Occasions", url: `${SITE}/occasions` },
        { name: occasion, url: occasionUrl(occasion, SITE) },
      ]}
      h1={`${occasion} Outfits`}
      intro={copy.answer}
      styling={copy.styling}
      faq={copy.faq}
      products={products}
      canonicalUrl={occasionUrl(occasion, SITE)}
      collectionName={`${occasion} outfits on OneTap Atelier`}
      collectionDescription={copy.answer}
      ctaHref={curatorOccasionPath([occasion])}
      ctaLabel={`Try on ${occasion} looks in the Curator`}
      secondaryHref="/occasions"
      secondaryLabel="All occasions"
      related={[
        ...others.map((o) => ({ label: o, href: occasionPath(o) })),
        { label: "Shop by category", href: categoryPath("Dresses") },
      ]}
    />
  );
}
