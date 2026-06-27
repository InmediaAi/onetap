import { PRODUCT_STYLES, OCCASIONS, COLOURS } from "@/lib/data/vocab";
import { priceBracketId, PRICE_BRACKETS, isNewIn, type Product } from "@/lib/data/products";

/**
 * Shared Curator filter + facet logic, lifted out of ProductGrid so it can run
 * server-side (the /api/products[/facets] routes + SSR) over a lightweight row
 * projection — the client never needs the whole catalog to drive its filters.
 */

export type Facet = "brand" | "category" | "style" | "occasion" | "colour" | "price";

/** The selected filter state (mirrors ProductGrid's state). */
export interface FilterState {
  brands: string[];
  categories: string[];
  styles: string[];
  occasions: string[];
  colours: string[];
  brackets: string[];
  newIn: boolean;
}

/** Minimal fields needed to filter + facet a product (no images/descriptions). */
export interface FacetRow {
  brand: string;
  category?: string | null;
  style?: string[] | null;
  colours?: string[] | null;
  occasions?: string[] | null;
  priceAmount: number;
  droppedAt?: string | null;
}

/** Cross-filtered options shown in the filter UI. */
export interface FacetOptions {
  brands: string[];
  categories: string[];
  styles: string[];
  occasions: string[];
  colours: { name: string; hex: string | null }[];
  brackets: { id: string; label: string }[];
}

export const EMPTY_FILTERS: FilterState = {
  brands: [],
  categories: [],
  styles: [],
  occasions: [],
  colours: [],
  brackets: [],
  newIn: false,
};

/** A product passes every selected facet EXCEPT `exclude` (+ the New-in toggle). */
export function passes(p: FacetRow, f: FilterState, exclude: Facet | null): boolean {
  if (exclude !== "brand" && f.brands.length && !f.brands.includes(p.brand)) return false;
  if (
    exclude !== "category" &&
    f.categories.length &&
    !(p.category && f.categories.includes(p.category))
  )
    return false;
  if (exclude !== "style" && f.styles.length && !f.styles.some((s) => p.style?.includes(s)))
    return false;
  if (
    exclude !== "occasion" &&
    f.occasions.length &&
    !f.occasions.some((o) => p.occasions?.includes(o))
  )
    return false;
  if (exclude !== "colour" && f.colours.length && !f.colours.some((c) => p.colours?.includes(c)))
    return false;
  if (
    exclude !== "price" &&
    f.brackets.length &&
    !f.brackets.includes(priceBracketId(p.priceAmount) ?? "")
  )
    return false;
  if (f.newIn && !isNewIn(p.droppedAt ?? undefined)) return false;
  return true;
}

/** Cross-filtered facet options: for each facet, values present under the OTHER
 *  selected filters (plus the already-selected ones, so they stay deselectable). */
export function computeFacets(rows: FacetRow[], f: FilterState): FacetOptions {
  const present = (
    exclude: Facet,
    get: (p: FacetRow) => string | string[] | null | undefined,
  ) => {
    const set = new Set<string>();
    for (const p of rows) {
      if (!passes(p, f, exclude)) continue;
      const v = get(p);
      if (Array.isArray(v)) v.forEach((x) => x && set.add(x));
      else if (v) set.add(v);
    }
    return set;
  };
  const withSel = (set: Set<string>, sel: string[]) => {
    sel.forEach((s) => set.add(s));
    return set;
  };

  const brandSet = withSel(present("brand", (p) => p.brand), f.brands);
  const categorySet = withSel(present("category", (p) => p.category), f.categories);
  const styleSet = withSel(present("style", (p) => p.style), f.styles);
  const occasionSet = withSel(present("occasion", (p) => p.occasions), f.occasions);
  const colourSet = withSel(present("colour", (p) => p.colours), f.colours);
  const bracketSet = withSel(
    present("price", (p) => priceBracketId(p.priceAmount) ?? undefined),
    f.brackets,
  );

  return {
    brands: [...brandSet].sort((a, b) => a.localeCompare(b)),
    categories: [...categorySet].sort((a, b) => a.localeCompare(b)),
    styles: PRODUCT_STYLES.filter((s) => styleSet.has(s)),
    occasions: OCCASIONS.filter((o) => occasionSet.has(o)),
    colours: COLOURS.filter((c) => colourSet.has(c.name)).map((c) => ({ name: c.name, hex: c.hex })),
    brackets: PRICE_BRACKETS.filter((b) => bracketSet.has(b.id)).map((b) => ({
      id: b.id,
      label: b.label,
    })),
  };
}

/** Project a full Product (mock/SSR) into a FacetRow. */
export function productToFacetRow(p: Product): FacetRow {
  return {
    brand: p.brand,
    category: p.category ?? null,
    style: p.style ?? null,
    colours: p.colours ?? null,
    occasions: p.occasions ?? null,
    priceAmount: p.price.amount,
    droppedAt: p.droppedAt ?? null,
  };
}

/** Parse the filter state from URL search params (shared by the routes). */
export function parseFilters(sp: URLSearchParams): FilterState {
  const list = (k: string) => sp.getAll(k).flatMap((v) => v.split(",")).filter(Boolean);
  return {
    brands: list("brands"),
    categories: list("categories"),
    styles: list("styles"),
    occasions: list("occasions"),
    colours: list("colours"),
    brackets: list("brackets"),
    newIn: sp.get("newIn") === "1",
  };
}

/** Serialize the filter state into URLSearchParams (client → routes). */
export function filtersToParams(f: FilterState): URLSearchParams {
  const sp = new URLSearchParams();
  if (f.brands.length) sp.set("brands", f.brands.join(","));
  if (f.categories.length) sp.set("categories", f.categories.join(","));
  if (f.styles.length) sp.set("styles", f.styles.join(","));
  if (f.occasions.length) sp.set("occasions", f.occasions.join(","));
  if (f.colours.length) sp.set("colours", f.colours.join(","));
  if (f.brackets.length) sp.set("brackets", f.brackets.join(","));
  if (f.newIn) sp.set("newIn", "1");
  return sp;
}
