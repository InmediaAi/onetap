import { NextResponse } from "next/server";
import { getTryOnProvider } from "@/lib/ai";
import { logGeneration, imageRefOf } from "@/lib/ai/logGeneration";
import { persistLook } from "@/lib/storage/looks";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Authenticated user id, or null (so dev/anon keeps working). */
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

/** Photo Try-On — generateTryOn(). Body: { userImage, productImage, productId? }. */
export async function POST(req: Request) {
  const startedAt = Date.now();
  let body: {
    userImage?: string;
    productImage?: string;
    productId?: string;
    campaign?: string;
  } = {};
  try {
    body = await req.json();
    const { userImage, productImage, productId, campaign } = body;
    if (!userImage || !productImage) {
      return NextResponse.json(
        { error: "userImage and productImage are required" },
        { status: 400 },
      );
    }

    // Kling Virtual Try-On is pure image-to-image — no prompt.
    const provider = getTryOnProvider();
    const result = await provider.generateTryOn({ userImage, productImage });

    // Re-host into our durable storage; returns our URL + look id (best-effort).
    const userId = await currentUserId();
    const saved = await persistLook({
      kind: "tryon",
      source: result.imageUrl,
      userId,
      productId,
      inputRef: imageRefOf(productImage),
      campaign,
    });

    await logGeneration({
      kind: "tryon",
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      productId,
      imageRef: imageRefOf(productImage),
      status: "ok",
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ ...result, imageUrl: saved.url, lookId: saved.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    await logGeneration({
      kind: "tryon",
      productId: body?.productId,
      imageRef: imageRefOf(body?.productImage),
      status: "error",
      durationMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
