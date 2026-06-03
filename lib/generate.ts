import type { GenerationKind } from "@/lib/ai/types";
import { CREDIT_COST } from "@/lib/credits";
import { useAtelier } from "@/lib/store";
import { createId } from "@/lib/utils";

/**
 * Shared "one tap" reel composer used by the 360° and Creator studios.
 * (The Curator try-on modal keeps its own per-mode flow.)
 *
 * Gates on the OUTPUT cost up front, composes the on-you image internally
 * (likeness + piece → try-on), then animates it (spin / film). Billed ONCE for
 * the output — the intermediate try-on is not separately charged. On success it
 * records a look and returns enough to render + share the result.
 */

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
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
  /** The garment/piece image to wear (data/hosted URL). */
  pieceImage: string;
  /** Optional directive prompt (e.g. the built film brief). */
  prompt?: string;
  /** Product id to attach to the saved look (for /look/[id]). */
  productId: string;
}

export interface ComposeResult {
  videoUrl: string;
  posterUrl?: string;
  lookId: string;
}

async function post(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
  const cost = CREDIT_COST[kind];

  // Gate on the output cost BEFORE any paid call.
  if (useAtelier.getState().credits < cost) {
    useAtelier.getState().openPricing();
    throw new InsufficientCreditsError();
  }

  // 1) compose the on-you image (not separately billed)
  const tryon = await post("/api/generate-image", {
    userImage: likeness,
    productImage: pieceImage,
    prompt: prompt || undefined,
  });

  // 2) animate it into the requested output
  const out = await post(ENDPOINT[kind], { image: tryon.imageUrl, prompt: prompt || undefined });

  const lookId = createId();
  useAtelier.getState().addLook({
    id: lookId,
    productId,
    kind,
    inputImage: likeness,
    assetUrl: out.videoUrl,
    posterUrl: out.posterUrl,
    createdAt: Date.now(),
  });
  // Charge once, only on success.
  useAtelier.getState().spendCredits(cost);

  return { videoUrl: out.videoUrl, posterUrl: out.posterUrl, lookId };
}
