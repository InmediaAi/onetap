import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

export const runtime = "nodejs";

/**
 * The signed-in user's generated looks (their "closet/history"), newest first.
 * Server-fetched from generated_looks so it's authoritative and cross-device —
 * not the per-device client store. Returns 401 when not signed in.
 */
export async function GET() {
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const { data, error } = await sb
    .from("generated_looks")
    .select("id, kind, generated_image, video_url, poster_url, product_id, utm_campaign, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60);

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

  return NextResponse.json({ looks });
}
