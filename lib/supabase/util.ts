import type { Product } from "@/lib/data/products";

/** Strip diacritics and lowercase-kebab a string ("Totême" → "toteme"). */
function kebab(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Base id slug from brand + name (e.g. "Bottega Veneta", "Pleated Trouser"). */
export function slugify(brand: string, name: string) {
  const base = kebab(`${brand} ${name}`);
  return base || "product";
}

/**
 * Brand monogram, ≤2 chars, matching the existing catalog style
 * ("Bottega Veneta" → "BV", "Saint Laurent" → "SL", "Celine" → "C").
 */
export function deriveMono(brand: string) {
  const words = brand.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "·";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Parse a legacy formatted price string ("$4,290") to a number. */
function parseAmount(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v.replace(/[^0-9.]/g, "")) || 0;
  return 0;
}

/** Hostname of a URL, sans "www." (e.g. "net-a-porter.com"). */
export function siteFromUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

/** Shape of a row in the Supabase `products` table. */
export interface ProductRow {
  id: string;
  brand: string;
  name: string;
  price: string | null; // legacy formatted string (kept for back-compat)
  price_amount: number | null;
  currency: string | null;
  image_url: string;
  images: string[] | null;
  mono: string | null;
  source_url: string | null;
  source_site: string | null;
  buy_url: string | null;
  category: string | null;
  style: string[] | null;
  type: string | null; // legacy — superseded by category
  colours: string[] | null;
  occasions: string[] | null;
  dropped_at: string | null;
  description: string | null;
  stylist_note: string | null;
  one_tap_score: number | null;
  created_at?: string;
}

/** Map a DB row to the app-facing Product shape. */
export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    price: {
      amount: row.price_amount ?? parseAmount(row.price),
      currency: row.currency || "USD",
    },
    imageUrl: row.image_url,
    images: row.images?.length ? row.images : [row.image_url],
    mono: row.mono || deriveMono(row.brand),
    category: row.category ?? row.type ?? undefined,
    style: row.style ?? undefined,
    type: row.type ?? undefined,
    colours: row.colours ?? undefined,
    occasions: row.occasions ?? undefined,
    droppedAt: row.dropped_at ?? row.created_at?.slice(0, 10) ?? undefined,
    description: row.description ?? undefined,
    stylistNote: row.stylist_note ?? undefined,
    sourceSite: row.source_site ?? siteFromUrl(row.buy_url ?? row.source_url),
    buyUrl: row.buy_url ?? row.source_url ?? undefined,
    oneTapScore: row.one_tap_score ?? undefined,
  };
}
