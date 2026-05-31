import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import { rowToProduct, type ProductRow } from "@/lib/supabase/util";
import { products as mockProducts, type Product } from "@/lib/data/products";

/**
 * Catalog read path. Reads from Supabase when configured; otherwise (or on
 * error) falls back to the mock catalog so the app always renders. A configured
 * but legitimately empty table is NOT masked — it returns [] truthfully.
 */
export async function fetchProducts(): Promise<Product[]> {
  const db = createReadClient();
  if (!db) return mockProducts;
  try {
    const { data, error } = await db
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return mockProducts;
    return (data as ProductRow[]).map(rowToProduct);
  } catch {
    return mockProducts;
  }
}

/** Single product by id, mirroring the read path above. */
export async function fetchProduct(id: string): Promise<Product | undefined> {
  const db = createReadClient();
  if (!db) return mockProducts.find((p) => p.id === id);
  try {
    const { data, error } = await db.from("products").select("*").eq("id", id).maybeSingle();
    if (error || !data) return mockProducts.find((p) => p.id === id);
    return rowToProduct(data as ProductRow);
  } catch {
    return mockProducts.find((p) => p.id === id);
  }
}
