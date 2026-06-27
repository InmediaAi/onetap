import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import { products as mockProducts } from "@/lib/data/products";
import { productToFacetRow, type FacetRow } from "@/lib/data/facets";

/**
 * Lightweight facet dataset — only the columns needed to compute the Curator's
 * cross-filtered filter options (no images/descriptions). Fetched once and cached
 * server-side (short TTL + bust on admin write), so facet computes are cheap and
 * the full catalog never reaches the client. The /api/products/facets route reads
 * this; /api/products paginates the heavy rows separately.
 */

const TTL_MS = 60_000;
let cache: { rows: FacetRow[]; exp: number } | null = null;

interface FacetProjectionRow {
  brand: string;
  category: string | null;
  style: string[] | null;
  colours: string[] | null;
  occasions: string[] | null;
  price_amount: number | null;
  dropped_at: string | null;
}

export async function getFacetRows(): Promise<FacetRow[]> {
  if (cache && cache.exp > Date.now()) return cache.rows;

  const db = createReadClient();
  let rows: FacetRow[];
  if (!db) {
    rows = mockProducts.filter((p) => !p.campaignOnly).map(productToFacetRow);
  } else {
    try {
      const { data, error } = await db
        .from("products")
        .select("brand, category, style, colours, occasions, price_amount, dropped_at")
        .or("campaign_only.is.null,campaign_only.eq.false");
      if (error) throw error;
      rows = (data as FacetProjectionRow[]).map((r) => ({
        brand: r.brand,
        category: r.category,
        style: r.style,
        colours: r.colours,
        occasions: r.occasions,
        priceAmount: r.price_amount ?? 0,
        droppedAt: r.dropped_at,
      }));
    } catch {
      // Fall back to mock so the filter UI still populates.
      rows = mockProducts.filter((p) => !p.campaignOnly).map(productToFacetRow);
    }
  }

  cache = { rows, exp: Date.now() + TTL_MS };
  return rows;
}

/** Invalidate the cache after an admin product write. */
export function bustFacetCache() {
  cache = null;
}
