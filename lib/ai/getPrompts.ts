import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import { SEED_PROMPTS, type PromptId } from "@/lib/ai/prompts";

/**
 * Runtime source of truth for the two admin-editable generation prompts (table
 * `ai_prompts`, service-role read only — never exposed to the client). Falls back
 * to SEED_PROMPTS when Supabase is unconfigured or a row is missing.
 *
 * Cached in-memory with a short TTL so generation requests don't hit the DB every
 * time. The admin save route calls bustPromptsCache() for instant propagation
 * within the same instance; other instances pick up the edit within the TTL.
 */

const TTL_MS = 60_000;

export interface PromptSnapshot {
  tryonImage: string;
  videoIdentity: string;
  spinScene: string;
}

let cache: { value: PromptSnapshot; at: number } | null = null;

async function readPrompts(): Promise<PromptSnapshot> {
  const fallback: PromptSnapshot = {
    tryonImage: SEED_PROMPTS.tryon_image.content,
    videoIdentity: SEED_PROMPTS.video_identity.content,
    spinScene: SEED_PROMPTS.spin_scene.content,
  };

  const db = createServiceClient();
  if (!db) return fallback;

  try {
    const { data, error } = await db.from("ai_prompts").select("id, content");
    if (error || !data) return fallback;
    const map = new Map(data.map((r) => [r.id as PromptId, (r.content as string) ?? ""]));
    const pick = (id: PromptId) => map.get(id)?.trim() || SEED_PROMPTS[id].content;
    return {
      tryonImage: pick("tryon_image"),
      videoIdentity: pick("video_identity"),
      spinScene: pick("spin_scene"),
    };
  } catch {
    return fallback;
  }
}

export async function getPrompts(): Promise<PromptSnapshot> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;
  const value = await readPrompts();
  cache = { value, at: now };
  return value;
}

/** Drop the cache so the next read reflects an admin edit immediately. */
export function bustPromptsCache(): void {
  cache = null;
}
