import "server-only";
import { fetchProducts } from "@/lib/data/getProducts";
import { bestImage } from "@/lib/data/getBrands";
import type { Product } from "@/lib/data/products";

/**
 * Editorial "Editor's picks — For you" occasion edits for the home page.
 * Curated to match the Curator's quick-filter THEMES so each tile lands on a
 * real, chip-highlighted filter. Imagery is auto-derived from the catalog.
 */

export interface OccasionEdit {
  label: string;
  /** Occasion facet value(s) this edit maps to (the Curator ?occasions= filter). */
  occasions: string[];
  heroImage: string | null;
  count: number;
}

/** The curated edits (label → occasion facet values). Mirrors ProductGrid THEMES. */
const EDITORIAL_OCCASIONS: { label: string; occasions: string[] }[] = [
  { label: "Date Night", occasions: ["Date Night"] },
  { label: "Vacation", occasions: ["Vacation"] },
  { label: "Party & Cocktail", occasions: ["Party Wear", "Cocktail"] },
];

/** Pieces whose occasions overlap any of the edit's values. */
function matches(p: Product, values: string[]): boolean {
  return !!p.occasions?.some((o) => values.includes(o));
}

/** The curated occasion edits that actually have pieces (with an image), in order. */
export async function fetchOccasionEdits(): Promise<OccasionEdit[]> {
  const products = await fetchProducts();
  return EDITORIAL_OCCASIONS.map((e) => {
    const items = products.filter((p) => matches(p, e.occasions));
    return {
      label: e.label,
      occasions: e.occasions,
      heroImage: bestImage(items),
      count: items.length,
    };
  }).filter((e) => e.count > 0 && e.heroImage);
}
