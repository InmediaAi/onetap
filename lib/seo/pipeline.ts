import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { queryProducts } from "@/lib/data/productQuery";
import { filters } from "@/lib/seo/dimensions";
import { OCCASIONS, PRODUCT_CATEGORIES } from "@/lib/data/vocab";
import { fetchBrands } from "@/lib/data/getBrands";
import { campaignPath } from "@/lib/data/links";
import { formatPrice } from "@/lib/data/products";
import { draftGuide, type CatalogContext } from "@/lib/ai/text";
import { kebab } from "@/lib/supabase/util";

/**
 * SEO content pipeline: turn a keyword/topic into a DRAFT guide grounded on real
 * catalog data. Never auto-publishes — drafts land in admin for human review.
 */

/** Infer occasion/category/brand from a term and gather grounding pieces. */
async function buildContext(term: string): Promise<CatalogContext> {
  const t = term.toLowerCase();
  const occasion = OCCASIONS.find((o) => t.includes(o.toLowerCase()));
  const category = PRODUCT_CATEGORIES.find((c) => t.includes(c.toLowerCase().split(" ")[0]));
  const brandList = await fetchBrands();
  const brand = brandList.find((b) => t.includes(b.name.toLowerCase()));

  const f = filters({
    occasions: occasion ? [occasion] : [],
    categories: category ? [category] : [],
    brands: brand ? [brand.name] : [],
  });
  let { products } = await queryProducts(f, 1, 25);
  if (products.length === 0) products = (await queryProducts(filters({}), 1, 25)).products;

  return {
    pieces: products.map((p) => ({
      brand: p.brand,
      name: p.name,
      price: formatPrice(p.price),
      href: campaignPath(p),
    })),
    brands: brandList.map((b) => b.name),
    occasion,
    category,
  };
}

/** A slug not already used by a guide (append -2, -3… on collision). */
async function uniqueSlug(base: string): Promise<string> {
  const db = createServiceClient();
  const root = kebab(base) || "guide";
  if (!db) return root;
  for (let n = 0; n < 20; n++) {
    const slug = n === 0 ? root : `${root}-${n + 1}`;
    const { data } = await db.from("guides").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
  }
  return `${root}-${Date.now()}`;
}

export interface DraftResult {
  slug: string;
  title: string;
}

/** Draft one guide for a term and insert it (status=draft, source=ai). */
export async function generateDraftFor(
  term: string,
  source: "manual" | "gsc" | "seed" = "manual",
): Promise<DraftResult> {
  const db = createServiceClient();
  if (!db) throw new Error("Supabase service role not configured");

  const ctx = await buildContext(term);
  const drafted = await draftGuide(term, ctx);
  const slug = await uniqueSlug(drafted.slug);

  const { error } = await db.from("guides").insert({
    slug,
    title: drafted.title,
    meta_description: drafted.metaDescription || null,
    answer: drafted.answer || null,
    body_md: drafted.bodyMd,
    faq: drafted.faq,
    related_brands: drafted.relatedBrands,
    related_occasions: drafted.relatedOccasions,
    status: "draft",
    source: "ai",
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  // Mark the queue item drafted (best-effort; the term may not be queued).
  await db
    .from("keyword_queue")
    .update({ status: "drafted", guide_slug: slug, source, updated_at: new Date().toISOString() })
    .eq("term", term);

  return { slug, title: drafted.title };
}

/** The next queued keyword, or null. */
export async function nextQueuedTerm(): Promise<string | null> {
  const db = createServiceClient();
  if (!db) return null;
  const { data } = await db
    .from("keyword_queue")
    .select("term")
    .eq("status", "queued")
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.term as string) ?? null;
}

/** Seed the queue from catalog dimensions (idempotent — on-conflict term). */
export async function seedKeywords(): Promise<number> {
  const db = createServiceClient();
  if (!db) return 0;
  const brands = await fetchBrands();
  const terms: { term: string; intent: string }[] = [];

  for (const o of OCCASIONS) {
    terms.push({ term: `what to wear to a ${o.toLowerCase()}`, intent: "occasion guide" });
    terms.push({ term: `${o.toLowerCase()} outfit ideas`, intent: "occasion guide" });
  }
  for (const c of PRODUCT_CATEGORIES) {
    terms.push({ term: `how to style ${c.toLowerCase()}`, intent: "category guide" });
  }
  for (const b of brands.slice(0, 20)) {
    terms.push({ term: `${b.name} style guide`, intent: "brand guide" });
  }

  const rows = terms.map((t) => ({ term: t.term, intent: t.intent, source: "seed" as const }));
  const { error } = await db.from("keyword_queue").upsert(rows, { onConflict: "term", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
  return rows.length;
}
