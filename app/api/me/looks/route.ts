import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 4; // latest 4 per tab, page through the rest
const CLIP_KINDS = ["spin", "video"];

/**
 * The signed-in user's generated looks ("closet/history"), newest first, paged
 * server-side per tab (clips = 360°/film, images = try-on stills). Returns the
 * page + that tab's total + both tab counts (for the badges). 401 when signed out.
 */
export async function GET(req: Request) {
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const sp = new URL(req.url).searchParams;
  const tab = sp.get("tab") === "images" ? "images" : "clips";
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const from = (page - 1) * PAGE_SIZE;

  const cols = "id, kind, generated_image, video_url, poster_url, product_id, utm_campaign, created_at";
  const base = () => sb.from("generated_looks").select(cols, { count: "exact" }).eq("user_id", user.id);

  // Tab counts (cheap head queries) for the badges.
  const [clipCount, imageCount] = await Promise.all([
    sb.from("generated_looks").select("id", { count: "exact", head: true }).eq("user_id", user.id).in("kind", CLIP_KINDS),
    sb.from("generated_looks").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("kind", "tryon"),
  ]);

  let q = base().order("created_at", { ascending: false });
  q = tab === "images" ? q.eq("kind", "tryon") : q.in("kind", CLIP_KINDS);
  const { data, error, count } = await q.range(from, from + PAGE_SIZE - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const looks = (data ?? []).map((r) => ({
    id: r.id as string,
    kind: r.kind as "tryon" | "spin" | "video",
    assetUrl: (r.generated_image ?? r.video_url) as string | null,
    posterUrl: (r.poster_url ?? undefined) as string | undefined,
    productId: (r.product_id ?? undefined) as string | undefined,
    campaign: (r.utm_campaign ?? undefined) as string | undefined,
    createdAt: r.created_at as string,
  }));

  return NextResponse.json(
    {
      looks,
      total: count ?? 0,
      page,
      pageSize: PAGE_SIZE,
      counts: { clips: clipCount.count ?? 0, images: imageCount.count ?? 0 },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
