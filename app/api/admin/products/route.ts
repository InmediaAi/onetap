import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify, deriveMono, rowToProduct, type ProductRow } from "@/lib/supabase/util";

export const runtime = "nodejs";

function clean(v: unknown, max = 300): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Resolve a unique id from the brand+name slug, suffixing on collision. */
async function uniqueId(db: SupabaseClient, base: string): Promise<string> {
  const { data } = await db
    .from("products")
    .select("id")
    .or(`id.eq.${base},id.like.${base}-%`);
  const taken = new Set((data ?? []).map((r: { id: string }) => r.id));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
  return `${base}-${Date.now().toString(36)}`;
}

/** GET — recently added products (admin list). Body-less; password via header. */
export async function GET(req: Request) {
  const password = req.headers.get("x-admin-password");
  if (!checkAdmin(password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ products: [] });
  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: (data as ProductRow[]).map(rowToProduct) });
}

/**
 * POST — create a product. Body: { password, brand, name, price, imageUrl, sourceUrl }.
 * id + mono are derived server-side; the client-supplied id (if any) is ignored.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!checkAdmin(body?.password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = createServiceClient();
    if (!db) {
      return NextResponse.json(
        { error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 },
      );
    }

    const brand = clean(body.brand, 120);
    const name = clean(body.name, 200);
    const price = clean(body.price, 40);
    const imageUrl = clean(body.imageUrl, 2000);
    const sourceUrl = clean(body.sourceUrl, 2000);

    if (!brand || !name || !price || !imageUrl) {
      return NextResponse.json(
        { error: "brand, name, price and imageUrl are all required" },
        { status: 400 },
      );
    }
    if (!/^https?:\/\//i.test(imageUrl)) {
      return NextResponse.json({ error: "imageUrl must be a public http(s) URL" }, { status: 400 });
    }

    const id = await uniqueId(db, slugify(brand, name));
    const row = {
      id,
      brand,
      name,
      price,
      image_url: imageUrl,
      mono: deriveMono(brand),
      source_url: sourceUrl || null,
    };
    const { data, error } = await db.from("products").insert(row).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePath("/");
    return NextResponse.json({ ok: true, product: rowToProduct(data as ProductRow) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
