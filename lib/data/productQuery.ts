import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import { rowToProduct, type ProductRow } from "@/lib/supabase/util";
import { products as mockProducts, type Product } from "@/lib/data/products";
import { PRICE_BRACKETS } from "@/lib/data/vocab";
import { passes, productToFacetRow, type FilterState } from "@/lib/data/facets";

/**
 * Server-side product query: applies the Curator filters in SQL and returns one
 * page + the total count, so the client only ever receives a page's worth of
 * rows (scales to 1000s). Falls back to filtering the mock catalog in JS when
 * Supabase is unconfigured, so local dev still works.
 */

export interface ProductPage {
  products: Product[];
  total: number;
}

const isoDay = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);

export async function queryProducts(
  f: FilterState,
  page: number,
  pageSize: number,
): Promise<ProductPage> {
  const db = createReadClient();

  // ── Mock fallback (no Supabase) — filter + sort + slice in memory ──
  if (!db) {
    const filtered = mockProducts
      .filter((p) => !p.campaignOnly && passes(productToFacetRow(p), f, null))
      .sort((a, b) => (b.oneTapScore ?? 0) - (a.oneTapScore ?? 0));
    const from = (page - 1) * pageSize;
    return { products: filtered.slice(from, from + pageSize), total: filtered.length };
  }

  // ── Supabase: filters in SQL, paginated with an exact count ──
  let q = db
    .from("products")
    .select("*", { count: "exact" })
    .or("campaign_only.is.null,campaign_only.eq.false");

  if (f.brands.length) q = q.in("brand", f.brands);
  if (f.categories.length) q = q.in("category", f.categories);
  if (f.styles.length) q = q.overlaps("style", f.styles); // array any-match
  if (f.occasions.length) q = q.overlaps("occasions", f.occasions);
  if (f.colours.length) q = q.overlaps("colours", f.colours);
  if (f.brackets.length) {
    // OR of price ranges, e.g. and(price_amount.gte.0,price_amount.lt.500),…
    const clauses = f.brackets
      .map((id) => PRICE_BRACKETS.find((b) => b.id === id))
      .filter((b): b is NonNullable<typeof b> => Boolean(b))
      .map((b) =>
        Number.isFinite(b.max)
          ? `and(price_amount.gte.${b.min},price_amount.lt.${b.max})`
          : `price_amount.gte.${b.min}`,
      );
    if (clauses.length) q = q.or(clauses.join(","));
  }
  if (f.newIn) q = q.gte("dropped_at", isoDay(-7)).lte("dropped_at", isoDay(1));

  const from = (page - 1) * pageSize;
  q = q
    .order("one_tap_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  try {
    const { data, error, count } = await q;
    if (error) throw error;
    return {
      products: (data as ProductRow[]).map(rowToProduct),
      total: count ?? 0,
    };
  } catch {
    // On a query error, fail soft to an empty page rather than the whole catalog.
    return { products: [], total: 0 };
  }
}
