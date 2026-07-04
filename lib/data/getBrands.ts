import "server-only";
import { fetchProducts } from "@/lib/data/getProducts";
import { kebab } from "@/lib/supabase/util";
import type { Product } from "@/lib/data/products";

/**
 * Brand SEO data, derived entirely from the live catalog (no brands table).
 * Brands are the distinct `products.brand` values (campaign pieces already
 * excluded by fetchProducts). Deduped case/accent-insensitively, keeping the
 * catalog's canonical spelling; slug via the shared kebab() ("Totême" → "toteme").
 */

export interface BrandSummary {
  name: string;
  slug: string;
  count: number;
  /** Best piece image for the tile/OG (highest oneTapScore, else first). */
  heroImage: string | null;
}

export interface BrandDetail extends BrandSummary {
  products: Product[];
}

/** Group the catalog by brand → one entry per distinct brand. */
function groupByBrand(products: Product[]): Map<string, Product[]> {
  const groups = new Map<string, { canonical: string; items: Product[] }>();
  for (const p of products) {
    const name = p.brand?.trim();
    if (!name) continue;
    const key = kebab(name);
    if (!key) continue;
    const g = groups.get(key);
    if (g) g.items.push(p);
    else groups.set(key, { canonical: name, items: [p] });
  }
  // Return canonical-name → items (first-seen spelling wins).
  const out = new Map<string, Product[]>();
  for (const { canonical, items } of groups.values()) out.set(canonical, items);
  return out;
}

/** The brand's best image for hero/OG — highest oneTapScore, else first found. */
export function bestImage(items: Product[]): string | null {
  const ranked = [...items].sort((a, b) => (b.oneTapScore ?? 0) - (a.oneTapScore ?? 0));
  for (const p of ranked) {
    const img = p.imageUrl || p.images?.[0];
    if (img) return img;
  }
  return null;
}

function toSummary(name: string, items: Product[]): BrandSummary {
  return { name, slug: kebab(name), count: items.length, heroImage: bestImage(items) };
}

/** All served brands, sorted A–Z (for the /brands index + sitemap). */
export async function fetchBrands(): Promise<BrandSummary[]> {
  const products = await fetchProducts();
  const groups = groupByBrand(products);
  return [...groups.entries()]
    .map(([name, items]) => toSummary(name, items))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
}

/** One brand by slug, with its pieces (for /brands/[slug]). null if unknown. */
export async function fetchBrand(slug: string): Promise<BrandDetail | null> {
  const products = await fetchProducts();
  const groups = groupByBrand(products);
  for (const [name, items] of groups.entries()) {
    if (kebab(name) === slug) {
      // Order the brand's pieces by the internal score (matches the Curator edit).
      const ordered = [...items].sort((a, b) => (b.oneTapScore ?? 0) - (a.oneTapScore ?? 0));
      return { ...toSummary(name, items), products: ordered };
    }
  }
  return null;
}
