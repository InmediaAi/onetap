import { NextResponse } from "next/server";
import { getVideoProvider } from "@/lib/ai";
import { logGeneration, imageRefOf } from "@/lib/ai/logGeneration";
import { reserveVideo, refundVideo } from "@/lib/billing/consume";
import { persistLook } from "@/lib/storage/looks";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

export const runtime = "nodejs";
export const maxDuration = 300;

async function currentUserId(): Promise<string | null> {
  try {
    const sb = await createServerSupabase();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** 360 Spin — generate360(). Body: { image, prompt?, productId? }. Metered. */
export async function POST(req: Request) {
  const startedAt = Date.now();
  let body: { image?: string; prompt?: string; productId?: string } = {};
  let reserved: string | null = null;
  try {
    body = await req.json();
    const { image, prompt, productId } = body;
    if (!image) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    // Reserve one video against the user's quota before the paid call.
    const r = await reserveVideo();
    if ("ok" in r && r.ok === false) {
      return NextResponse.json(
        { error: "Video limit reached", code: "LIMIT_REACHED" },
        { status: 402 },
      );
    }
    if ("ok" in r && r.ok) reserved = r.source;

    const provider = getVideoProvider();
    const result = await provider.generate360({ image, prompt });

    const userId = await currentUserId();
    const saved = await persistLook({
      kind: "spin",
      source: result.videoUrl,
      userId,
      productId,
      inputRef: imageRefOf(image),
      posterSource: result.posterUrl ?? image,
    });

    await logGeneration({
      kind: "spin",
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      productId,
      imageRef: imageRefOf(image),
      status: "ok",
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({
      ...result,
      videoUrl: saved.url,
      posterUrl: saved.posterUrl ?? result.posterUrl,
      lookId: saved.id,
    });
  } catch (err) {
    if (reserved) await refundVideo(reserved); // generation failed → give it back
    const message = err instanceof Error ? err.message : "Generation failed";
    await logGeneration({
      kind: "spin",
      productId: body?.productId,
      imageRef: imageRefOf(body?.image),
      status: "error",
      durationMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
