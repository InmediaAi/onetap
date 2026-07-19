import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchGuidesAdmin } from "@/lib/data/guides";
import { kebab } from "@/lib/supabase/util";

export const runtime = "nodejs";

const clean = (v: unknown, max = 400) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** GET — all guides incl. drafts (admin list). Password via header. */
export async function GET(req: Request) {
  if (!checkAdmin(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ guides: await fetchGuidesAdmin() });
}

/** POST — create/update a guide. Body: { password, guide }. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!checkAdmin(body?.password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = createServiceClient();
    if (!db) {
      return NextResponse.json(
        { error: "Supabase is not configured (SUPABASE_SERVICE_ROLE_KEY)." },
        { status: 503 },
      );
    }

    const g = body.guide ?? {};
    const title = clean(g.title, 200);
    const slug = kebab(clean(g.slug, 120) || title);
    if (!title || !slug) {
      return NextResponse.json({ error: "Title and slug are required." }, { status: 400 });
    }

    const status = g.status === "published" ? "published" : "draft";
    const faq = Array.isArray(g.faq)
      ? g.faq
          .map((f: unknown) => {
            const o = f as { q?: unknown; a?: unknown };
            return { q: clean(o?.q, 300), a: clean(o?.a, 1200) };
          })
          .filter((f: { q: string; a: string }) => f.q && f.a)
          .slice(0, 12)
      : [];
    const arr = (v: unknown, max = 40) =>
      Array.isArray(v) ? v.map((x) => clean(x, 120)).filter(Boolean).slice(0, max) : [];

    const patch = {
      slug,
      title,
      meta_description: clean(g.metaDescription, 320) || null,
      answer: clean(g.answer, 800) || null,
      body_md: typeof g.bodyMd === "string" ? g.bodyMd.slice(0, 40000) : "",
      faq,
      hero_image: clean(g.heroImage, 600) || null,
      related_brands: arr(g.relatedBrands),
      related_occasions: arr(g.relatedOccasions),
      related_product_ids: arr(g.relatedProductIds, 60),
      status,
      source: clean(g.source, 20) || "manual",
      updated_at: new Date().toISOString(),
      // Stamp publish time when going live (kept once set).
      ...(status === "published" ? { published_at: new Date().toISOString() } : {}),
    };

    // Upsert on the unique slug so re-saving edits the same row.
    const { error } = await db.from("guides").upsert(patch, { onConflict: "slug" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePath("/journal");
    revalidatePath(`/journal/${slug}`);
    revalidatePath("/sitemap.xml");
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** DELETE — remove a guide. Body: { password, id }. */
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkAdmin(body?.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const id = clean(body?.id, 60);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await db.from("guides").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath("/journal");
  revalidatePath("/sitemap.xml");
  return NextResponse.json({ ok: true });
}
