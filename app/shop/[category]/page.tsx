import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CollectionLanding from "@/components/seo/CollectionLanding";
import {
  categoryFromSlug,
  categoryProducts,
  presentCategories,
} from "@/lib/seo/dimensions";
import { categoryCopy } from "@/lib/seo/copy";
import {
  categoryPath,
  categoryUrl,
  curatorCategoryPath,
  occasionPath,
} from "@/lib/data/links";
import { kebab } from "@/lib/supabase/util";

export const revalidate = 3600; // ISR hourly

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateStaticParams() {
  const categories = await presentCategories();
  return categories.map((c) => ({ category: kebab(c) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) return { title: "Shop · OneTap Atelier" };
  const title = `Designer ${category} to Try On Before You Buy · OneTap Atelier`;
  const description = categoryCopy(category).answer;
  const url = categoryUrl(category, SITE);
  return {
    title,
    description,
    alternates: { canonical: categoryPath(category) },
    openGraph: { title, description, url, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: slug } = await params;
  const category = categoryFromSlug(slug);
  if (!category) notFound();

  const { products } = await categoryProducts(category);
  if (products.length === 0) notFound();

  const copy = categoryCopy(category);
  const others = (await presentCategories()).filter((c) => c !== category).slice(0, 6);

  return (
    <CollectionLanding
      crumbs={[
        { name: "Home", url: SITE },
        { name: "Shop", url: `${SITE}/shop` },
        { name: category, url: categoryUrl(category, SITE) },
      ]}
      h1={`Designer ${category}`}
      intro={copy.answer}
      styling={copy.styling}
      faq={copy.faq}
      products={products}
      canonicalUrl={categoryUrl(category, SITE)}
      collectionName={`Designer ${category} on OneTap Atelier`}
      collectionDescription={copy.answer}
      ctaHref={curatorCategoryPath(category)}
      ctaLabel={`Try on ${category} in the Curator`}
      secondaryHref="/shop"
      secondaryLabel="All categories"
      related={[
        ...others.map((c) => ({ label: c, href: categoryPath(c) })),
        { label: "Shop by occasion", href: occasionPath("Wedding Guest") },
      ]}
    />
  );
}
