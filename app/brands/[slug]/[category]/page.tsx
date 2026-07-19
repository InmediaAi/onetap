import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CollectionLanding from "@/components/seo/CollectionLanding";
import { fetchBrand } from "@/lib/data/getBrands";
import { categoryFromSlug, brandCategoryProducts } from "@/lib/seo/dimensions";
import { categoryCopy } from "@/lib/seo/copy";
import {
  brandCategoryPath,
  brandCategoryUrl,
  brandPath,
  brandUrl,
  categoryPath,
} from "@/lib/data/links";

export const revalidate = 3600; // ISR hourly (on-demand — many combos)

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; category: string }>;
}): Promise<Metadata> {
  const { slug, category: catSlug } = await params;
  const [brand, category] = [await fetchBrand(slug), categoryFromSlug(catSlug)];
  if (!brand || !category) return { title: "Brand · OneTap Atelier" };
  const title = `${brand.name} ${category} - Shop & Try On · OneTap Atelier`;
  const description = `Browse ${brand.name} ${category.toLowerCase()} on OneTap Atelier and see each piece on yourself before you buy with AI virtual try-on.`;
  return {
    title,
    description,
    alternates: { canonical: brandCategoryPath(brand.name, category) },
    openGraph: {
      title,
      description,
      url: brandCategoryUrl(brand.name, category, SITE),
      type: "website",
      images: brand.heroImage ? [brand.heroImage] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BrandCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; category: string }>;
}) {
  const { slug, category: catSlug } = await params;
  const brand = await fetchBrand(slug);
  const category = categoryFromSlug(catSlug);
  if (!brand || !category) notFound();

  const { products } = await brandCategoryProducts(brand.name, category);
  if (products.length === 0) notFound();

  const copy = categoryCopy(category);
  const curatorHref = `/curator?brands=${encodeURIComponent(brand.name)}&categories=${encodeURIComponent(category)}`;

  return (
    <CollectionLanding
      crumbs={[
        { name: "Home", url: SITE },
        { name: "Brands", url: `${SITE}/brands` },
        { name: brand.name, url: brandUrl(brand.name, SITE) },
        { name: category, url: brandCategoryUrl(brand.name, category, SITE) },
      ]}
      h1={`${brand.name} ${category}`}
      intro={`The ${brand.name} ${category.toLowerCase()} edit on OneTap Atelier — ${products.length} ${
        products.length === 1 ? "piece" : "pieces"
      } you can see on yourself before you buy.`}
      styling={copy.styling}
      faq={copy.faq}
      products={products}
      canonicalUrl={brandCategoryUrl(brand.name, category, SITE)}
      collectionName={`${brand.name} ${category} on OneTap Atelier`}
      collectionDescription={`${brand.name} ${category.toLowerCase()} — try each piece on before you buy.`}
      ctaHref={curatorHref}
      ctaLabel={`Try on ${brand.name} ${category} in the Curator`}
      secondaryHref={brandPath(brand.name)}
      secondaryLabel={`All ${brand.name}`}
      related={[
        { label: `${brand.name} — new arrivals`, href: `${brandPath(brand.name)}/new-arrivals` },
        { label: `All designer ${category.toLowerCase()}`, href: categoryPath(category) },
      ]}
    />
  );
}
