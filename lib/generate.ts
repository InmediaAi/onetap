import type { GenerationKind } from "@/lib/ai/types";
import { useAtelier } from "@/lib/store";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { getAttribution } from "@/lib/analytics/utm";

/**
 * Shared "one tap" reel composer used by the 360° and Creator studios.
 * (The Curator try-on modal keeps its own per-mode flow.)
 *
 * Video quota is enforced SERVER-SIDE in the video routes — a 402 surfaces here
 * as a VideoLimitError, which callers map to opening the pricing modal.
 */

export class VideoLimitError extends Error {
  constructor() {
    super("Video limit reached");
    this.name = "VideoLimitError";
  }
}

export class SignInRequiredError extends Error {
  constructor() {
    super("Sign in required");
    this.name = "SignInRequiredError";
  }
}

const ENDPOINT: Record<"spin" | "video", string> = {
  spin: "/api/generate-360",
  video: "/api/generate-video",
};

export interface ComposeArgs {
  /** "spin" (360° turn) or "video" (influencer film). */
  kind: Extract<GenerationKind, "spin" | "video">;
  /** The user's likeness (data/hosted URL). */
  likeness: string;
  /** The garment/piece image to wear (data/hosted URL). Optional. */
  pieceImage?: string;
  /** Optional directive prompt (e.g. the built film brief). */
  prompt?: string;
  /** Product id to attach to the saved look (for /look/[id]). */
  productId: string;
}

export interface ComposeResult {
  videoUrl: string;
  posterUrl?: string;
  lookId: string;
  /** The intermediate on-you try-on still (the "middleware" image), if composed. */
  imageUrl?: string;
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 401) throw new SignInRequiredError();
  if (res.status === 402) throw new VideoLimitError();
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Generation failed");
  return data;
}

export async function composeReel({
  kind,
  likeness,
  pieceImage,
  prompt,
  productId,
}: ComposeArgs): Promise<ComposeResult> {
  const startedAt = Date.now();
  const campaign = getAttribution()?.utm_campaign;
  track(EVENTS.GENERATION_STARTED, { kind, productId });

  try {
    // 1) if we have a garment image, compose the on-you image first (free,
    //    unlimited); otherwise animate the likeness directly. The still try-on
    //    uses its own predefined prompt (server default) — the film/spin prompt
    //    describes motion and only applies to the video step below.
    let sourceImage = likeness;
    if (pieceImage) {
      const tryon = await post("/api/generate-image", {
        userImage: likeness,
        productImage: pieceImage,
        productId,
        campaign,
      });
      sourceImage = tryon.imageUrl;
    }

    // 2) animate it into the requested output (this is the metered "video").
    const out = await post(ENDPOINT[kind], {
      image: sourceImage,
      prompt: prompt || undefined,
      productId,
      campaign,
    });

    // The route persisted the look and returned its durable id + URL.
    const lookId: string = out.lookId;
    useAtelier.getState().addLook({
      id: lookId,
      productId,
      kind,
      inputImage: likeness,
      assetUrl: out.videoUrl,
      posterUrl: out.posterUrl,
      createdAt: Date.now(),
    });

    track(EVENTS.GENERATION_COMPLETED, {
      kind,
      productId,
      lookId,
      durationMs: Date.now() - startedAt,
    });
    return {
      videoUrl: out.videoUrl,
      posterUrl: out.posterUrl,
      lookId,
      imageUrl: pieceImage ? sourceImage : undefined,
    };
  } catch (err) {
    if (err instanceof SignInRequiredError) {
      track(EVENTS.SIGN_IN_REQUIRED, { kind, productId });
      useAtelier.getState().openSignIn();
    } else if (err instanceof VideoLimitError) {
      track(EVENTS.VIDEO_LIMIT_REACHED, { kind, productId });
      useAtelier.getState().openPricing();
    } else {
      track(EVENTS.GENERATION_FAILED, {
        kind,
        productId,
        durationMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
    throw err;
  }
}
