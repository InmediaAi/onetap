import { NextResponse } from "next/server";
import { createReadClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Public read of a saved look (anon; generated_looks has a public-read policy). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = createReadClient();
  if (!db) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data } = await db
    .from("generated_looks")
    .select("kind, generated_image, video_url, poster_url, product_id, utm_campaign")
    .eq("id", id)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    look: {
      id,
      kind: data.kind,
      assetUrl: data.generated_image ?? data.video_url,
      posterUrl: data.poster_url ?? undefined,
      productId: data.product_id ?? undefined,
      campaign: data.utm_campaign ?? undefined,
    },
  });
}
