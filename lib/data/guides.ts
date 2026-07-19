import "server-only";
import { createReadClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Editorial "guides" (the Journal) — SEO/GEO long-form content. Public reads
 * (published only) use the anon read client (RLS enforces status='published');
 * admin reads/writes use the service role. No-ops to an empty list when Supabase
 * is unconfigured (dev), so the site still builds.
 */

export interface GuideFaq {
  q: string;
  a: string;
}

export interface Guide {
  id: string;
  slug: string;
  title: string;
  metaDescription: string | null;
  answer: string | null;
  bodyMd: string;
  faq: GuideFaq[];
  heroImage: string | null;
  relatedBrands: string[];
  relatedOccasions: string[];
  relatedProductIds: string[];
  status: "draft" | "published";
  source: string;
  publishedAt: string | null;
  updatedAt: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function rowToGuide(r: any): Guide {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    metaDescription: r.meta_description ?? null,
    answer: r.answer ?? null,
    bodyMd: r.body_md ?? "",
    faq: Array.isArray(r.faq) ? (r.faq as GuideFaq[]) : [],
    heroImage: r.hero_image ?? null,
    relatedBrands: r.related_brands ?? [],
    relatedOccasions: r.related_occasions ?? [],
    relatedProductIds: r.related_product_ids ?? [],
    status: r.status === "published" ? "published" : "draft",
    source: r.source ?? "manual",
    publishedAt: r.published_at ?? null,
    updatedAt: r.updated_at ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Published guides, newest first (public index + sitemap). */
export async function fetchGuides(): Promise<Guide[]> {
  const db = createReadClient();
  if (!db) return [];
  try {
    const { data } = await db
      .from("guides")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });
    return (data ?? []).map(rowToGuide);
  } catch {
    return [];
  }
}

/** One published guide by slug (public detail page). null if unknown/draft. */
export async function fetchGuide(slug: string): Promise<Guide | null> {
  const db = createReadClient();
  if (!db) return null;
  try {
    const { data } = await db
      .from("guides")
      .select("*")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    return data ? rowToGuide(data) : null;
  } catch {
    return null;
  }
}

/** All guides incl. drafts (admin only — service role). */
export async function fetchGuidesAdmin(): Promise<Guide[]> {
  const db = createServiceClient();
  if (!db) return [];
  const { data } = await db.from("guides").select("*").order("updated_at", { ascending: false });
  return (data ?? []).map(rowToGuide);
}
