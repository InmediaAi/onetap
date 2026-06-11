import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  slugify,
  deriveMono,
  rowToProduct,
  siteFromUrl,
  type ProductRow,
} from "@/lib/supabase/util";
import { formatPrice } from "@/lib/data/products";
import {
  CURRENCIES,
  PRODUCT_CATEGORIES,
  PRODUCT_STYLES,
  COLOUR_NAMES,
  OCCASIONS,
} from "@/lib/data/vocab";

export const runtime = "nodejs";

/** Max image variants stored per piece (scrape pulls up to 3; admin can add more). */
const MAX_IMAGES = 6;

function clean(v: unknown, max = 300): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Keep valid, unique http(s) image URLs, capped. */
function cleanImages(value: unknown, fallback?: unknown): string[] {
  const raw = Array.isArray(value) ? value : [];
  if (fallback) raw.unshift(fallback); // back-compat: a single imageUrl field
  const urls = raw
    .map((u) => clean(u, 2000))
    .filter((u) => /^https?:\/\//i.test(u));
  return Array.from(new Set(urls)).slice(0, MAX_IMAGES);
}

/** Keep only values that are in the allowed vocabulary. */
function only(values: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(values)) return [];
  const set = new Set(allowed);
  return Array.from(new Set(values.filter((v): v is string => typeof v === "string" && set.has(v))));
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
    const images = cleanImages(body.images, body.imageUrl);
    const imageUrl = images[0] ?? "";
    const sourceUrl = clean(body.sourceUrl, 2000);
    // Outbound purchase link (falls back to the scraped source URL).
    const buyRaw = clean(body.buyUrl, 2000) || sourceUrl;
    const buyUrl = /^https?:\/\//i.test(buyRaw) ? buyRaw : "";
    const description = clean(body.description, 1000);
    const stylistNote = clean(body.stylistNote, 120);

    const amount = Number(body.priceAmount);
    const currency = CURRENCIES.includes(body.currency) ? body.currency : "USD";
    const category = PRODUCT_CATEGORIES.includes(body.category) ? body.category : "";
    const style = only(body.style, PRODUCT_STYLES);
    const colours = only(body.colours, COLOUR_NAMES);
    const occasions = only(body.occasions, OCCASIONS);
    const dropDate = clean(body.dropDate, 10) || new Date().toISOString().slice(0, 10);
    const oneTapScore = Math.max(0, Math.min(100, Math.round(Number(body.oneTapScore) || 70)));

    // Campaign-only pieces (e.g. FIFA jerseys) aren't shown in the Curator, so
    // they don't need the luxury filter metadata (category / colour / price).
    const campaignOnly = Boolean(body.campaignOnly);

    if (!brand || !name || !imageUrl) {
      return NextResponse.json(
        { error: "brand, name and at least one image are all required" },
        { status: 400 },
      );
    }
    if (!campaignOnly) {
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "A price amount greater than 0 is required" }, { status: 400 });
      }
      if (!category) {
        return NextResponse.json({ error: "A category is required" }, { status: 400 });
      }
      if (colours.length === 0) {
        return NextResponse.json({ error: "At least one colour is required" }, { status: 400 });
      }
    }

    // Shared column values for insert/update.
    const fields = {
      brand,
      name,
      price: Number.isFinite(amount) && amount > 0 ? formatPrice({ amount, currency }) : null,
      price_amount: Number.isFinite(amount) ? amount : null,
      currency,
      image_url: imageUrl,
      images,
      mono: deriveMono(brand),
      source_url: sourceUrl || null,
      source_site: siteFromUrl(buyUrl || sourceUrl) ?? null,
      buy_url: buyUrl || null,
      category,
      style,
      type: category, // keep legacy column populated for back-compat
      colours,
      occasions,
      dropped_at: dropDate,
      description: description || null,
      stylist_note: stylistNote || null,
      one_tap_score: oneTapScore,
      campaign_only: Boolean(body.campaignOnly),
    };

    // Update an existing piece (id stays stable) or create a new one.
    const editId = clean(body.editId, 200);
    let saved;
    if (editId) {
      const { data, error } = await db
        .from("products")
        .update(fields)
        .eq("id", editId)
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      saved = data;
    } else {
      const id = await uniqueId(db, slugify(brand, name));
      const { data, error } = await db
        .from("products")
        .insert({ id, ...fields })
        .select("*")
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      saved = data;
    }

    revalidatePath("/");
    return NextResponse.json({ ok: true, product: rowToProduct(saved as ProductRow) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
