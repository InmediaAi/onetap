import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Generation logging — see the exact prompt sent for each image/video call.
 * Writes a structured console line (dev terminal / Vercel logs) AND a row to
 * the Supabase `generation_logs` table when configured. Best-effort: any
 * failure here is swallowed so it never breaks a generation.
 *
 * We deliberately do NOT store data-URL images (huge + PII). For image inputs
 * we record only a short reference via imageRefOf().
 */

export interface GenerationLogEntry {
  kind: string; // "tryon" | "spin" | "video"
  provider?: string;
  model?: string | null;
  prompt?: string | null;
  productId?: string | null;
  imageRef?: string | null;
  status: "ok" | "error";
  durationMs: number;
  error?: string | null;
}

/** Summarize an image input for logging — never store raw data URLs. */
export function imageRefOf(image: unknown): string | null {
  if (typeof image !== "string" || !image) return null;
  if (image.startsWith("data:")) return "data-url";
  return image.slice(0, 500);
}

export async function logGeneration(entry: GenerationLogEntry): Promise<void> {
  try {
    console.log(
      "[generation]",
      JSON.stringify({
        kind: entry.kind,
        provider: entry.provider,
        model: entry.model ?? null,
        status: entry.status,
        durationMs: Math.round(entry.durationMs),
        productId: entry.productId ?? null,
        prompt: entry.prompt ?? null,
        error: entry.error ?? null,
      }),
    );
  } catch {
    /* console failures are non-fatal */
  }

  try {
    const db = createServiceClient();
    if (!db) return; // Supabase unconfigured → console-only
    await db.from("generation_logs").insert({
      kind: entry.kind,
      provider: entry.provider ?? null,
      model: entry.model ?? null,
      prompt: entry.prompt ?? null,
      product_id: entry.productId ?? null,
      image_ref: entry.imageRef ?? null,
      status: entry.status,
      duration_ms: Math.round(entry.durationMs),
      error: entry.error ?? null,
    });
  } catch (e) {
    console.error(
      "[generation] log insert failed:",
      e instanceof Error ? e.message : e,
    );
  }
}
