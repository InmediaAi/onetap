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

/** Shape of a row in the Supabase `products` table. */
export interface ProductRow {
  id: string;
  brand: string;
  name: string;
  price: string;
  image_url: string;
  mono: string | null;
  source_url: string | null;
  created_at?: string;
}

/** Map a DB row to the app-facing Product shape. */
export function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    brand: row.brand,
    name: row.name,
    price: row.price,
    imageUrl: row.image_url,
    mono: row.mono || deriveMono(row.brand),
  };
}
