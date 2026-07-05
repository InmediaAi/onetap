import { NextResponse } from "next/server";
import { getVideoProvider } from "@/lib/ai";
import { logGeneration, imageRefOf } from "@/lib/ai/logGeneration";
import { reserveVideo, refundVideo } from "@/lib/billing/consume";
import { FILM_PROMPT, composePrompt } from "@/lib/ai/prompts";
import { getPrompts } from "@/lib/ai/getPrompts";
import { persistLook } from "@/lib/storage/looks";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { sendLookReadyEmailToUser } from "@/lib/external/email";
import { lookUrl } from "@/lib/data/links";

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

/** Social Video - generateVideo(). Body: { image, prompt?, productId? }. Metered. */
export async function POST(req: Request) {
  const startedAt = Date.now();
  let body: {
    image?: string;
    prompt?: string;
    productId?: string;
    campaign?: string;
  } = {};
  let reserved: string | null = null;
  try {
    body = await req.json();
    const { image, prompt, productId, campaign } = body;
    if (!image) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    // Reserve one video against the user's quota before the paid call.
    const r = await reserveVideo();
    if ("needAuth" in r) {
      return NextResponse.json(
        { error: "Sign in required", code: "SIGN_IN_REQUIRED" },
        { status: 401 },
      );
    }
    if ("ok" in r && r.ok === false) {
      return NextResponse.json(
        { error: "Video limit reached", code: "LIMIT_REACHED" },
        { status: 402 },
      );
    }
    if ("ok" in r && r.ok) reserved = r.source;

    // The film scene is built per-format on the client; fall back to a default.
    // Wrap it with the admin-editable identity-lock prompt so the user's face
    // is preserved (provider-agnostic).
    const scene = prompt?.trim() || FILM_PROMPT;
    const { videoIdentity } = await getPrompts();
    const finalPrompt = composePrompt(videoIdentity, scene);

    const provider = getVideoProvider();
    const result = await provider.generateVideo({ image, prompt: finalPrompt });

    const userId = await currentUserId();
    const saved = await persistLook({
      kind: "video",
      source: result.videoUrl,
      userId,
      productId,
      inputRef: imageRefOf(image),
      posterSource: result.posterUrl ?? image,
      campaign,
    });

    await logGeneration({
      kind: "video",
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      productId,
      imageRef: imageRefOf(image),
      status: "ok",
      durationMs: Date.now() - startedAt,
    });

    // Video look ready → email the user its shareable URL (non-blocking; no-op
    // when Resend/email unconfigured). Only for a real, persisted /look/[id].
    if (userId && saved.persisted) {
      await sendLookReadyEmailToUser(userId, {
        lookUrl: lookUrl(saved.id),
        posterUrl: saved.posterUrl ?? undefined,
        kindLabel: "film",
      });
    }

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
      kind: "video",
      productId: body?.productId,
      imageRef: imageRefOf(body?.image),
      status: "error",
      durationMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
