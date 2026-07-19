import "server-only";
import { OCCASIONS, PRODUCT_CATEGORIES } from "@/lib/data/vocab";
import { kebab } from "@/lib/supabase/util";
import { getFacetRows } from "@/lib/data/facetSource";
import { computeFacets, EMPTY_FILTERS, type FilterState } from "@/lib/data/facets";
import { queryProducts, type ProductPage } from "@/lib/data/productQuery";

/**
 * Programmatic-SEO dimension helpers. The catalog's vocab (occasions, categories)
 * drives template landing pages, but we ONLY generate a page for a value that
 * actually has products (via computeFacets over the live facet rows) so there are
 * no thin/empty pages. Slugs use the shared kebab() (matches brand slugs).
 */

const PAGE_MAX = 60; // pieces rendered on a landing page

export const occasionSlug = (o: string) => kebab(o);
export const categorySlug = (c: string) => kebab(c);

export function occasionFromSlug(slug: string): string | null {
  return OCCASIONS.find((o) => kebab(o) === slug) ?? null;
}
export function categoryFromSlug(slug: string): string | null {
  return PRODUCT_CATEGORIES.find((c) => kebab(c) === slug) ?? null;
}

/** A full FilterState from a partial (fresh arrays; never mutate EMPTY_FILTERS). */
export function filters(partial: Partial<FilterState>): FilterState {
  return {
    brands: partial.brands ?? [],
    categories: partial.categories ?? [],
    styles: partial.styles ?? [],
    occasions: partial.occasions ?? [],
    colours: partial.colours ?? [],
    brackets: partial.brackets ?? [],
    newIn: partial.newIn ?? false,
  };
}

/** Occasions that currently have ≥1 live piece, in vocab order. */
export async function presentOccasions(): Promise<string[]> {
  const facets = computeFacets(await getFacetRows(), EMPTY_FILTERS);
  const set = new Set(facets.occasions);
  return OCCASIONS.filter((o) => set.has(o));
}

/** Categories that currently have ≥1 live piece, in vocab order. */
export async function presentCategories(): Promise<string[]> {
  const facets = computeFacets(await getFacetRows(), EMPTY_FILTERS);
  const set = new Set(facets.categories);
  return PRODUCT_CATEGORIES.filter((c) => set.has(c));
}

/** Categories that have ≥1 piece FOR a given brand (for brand×category pages). */
export async function presentCategoriesForBrand(brandName: string): Promise<string[]> {
  const rows = (await getFacetRows()).filter((r) => kebab(r.brand) === kebab(brandName));
  const facets = computeFacets(rows, EMPTY_FILTERS);
  const set = new Set(facets.categories);
  return PRODUCT_CATEGORIES.filter((c) => set.has(c));
}

/** Products (first page) for each landing type. */
export function occasionProducts(occasion: string): Promise<ProductPage> {
  return queryProducts(filters({ occasions: [occasion] }), 1, PAGE_MAX);
}
export function categoryProducts(category: string): Promise<ProductPage> {
  return queryProducts(filters({ categories: [category] }), 1, PAGE_MAX);
}
export function brandCategoryProducts(brandName: string, category: string): Promise<ProductPage> {
  return queryProducts(filters({ brands: [brandName], categories: [category] }), 1, PAGE_MAX);
}
