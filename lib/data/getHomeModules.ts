import "server-only";
import { createReadClient } from "@/lib/supabase/server";

/**
 * Admin-managed home-page module cards (the three "ways to try on yourself").
 * Editable fields — title/tag/blurb + a background clip — live in `home_modules`
 * (public read; edited in /admin → Home). Route + CTA label stay code-defined.
 * Falls back to SEED when Supabase is unconfigured or the table is empty.
 */

export interface HomeModule {
  id: string;
  title: string;
  tag: string;
  blurb: string;
  videoUrl: string | null;
  posterUrl: string | null;
}

/** Fixed order + seed content (also the fallback when the DB is empty). */
export const SEED_HOME_MODULES: HomeModule[] = [
  {
    id: "curator",
    title: "OneTap Curator",
    tag: "OneTap Try-On",
    blurb: "Tap any piece from the houses you love and see it on your own body.",
    videoUrl: null,
    posterUrl: null,
  },
  {
    id: "tryon",
    title: "360° Try-On",
    tag: "OneTap TryOn",
    blurb: "Upload anything you’re considering and see yourself in it, from every angle.",
    videoUrl: null,
    posterUrl: null,
  },
  {
    id: "creator",
    title: "Atelier Scenes",
    tag: "OneTap Creator",
    blurb: "Place a piece in the world you’d wear it in — the film situates it in your life.",
    videoUrl: null,
    posterUrl: null,
  },
];

const ORDER = SEED_HOME_MODULES.map((m) => m.id);

interface Row {
  id: string;
  title: string | null;
  tag: string | null;
  blurb: string | null;
  video_url: string | null;
  poster_url: string | null;
}

export async function getHomeModules(): Promise<HomeModule[]> {
  const db = createReadClient();
  if (!db) return SEED_HOME_MODULES;
  try {
    const { data, error } = await db
      .from("home_modules")
      .select("id, title, tag, blurb, video_url, poster_url");
    if (error || !data?.length) return SEED_HOME_MODULES;

    const byId = new Map((data as Row[]).map((r) => [r.id, r]));
    // Always return the three modules in the fixed order, merging DB over seed.
    return SEED_HOME_MODULES.map((seed) => {
      const r = byId.get(seed.id);
      if (!r) return seed;
      return {
        id: seed.id,
        title: r.title ?? seed.title,
        tag: r.tag ?? seed.tag,
        blurb: r.blurb ?? seed.blurb,
        videoUrl: r.video_url ?? null,
        posterUrl: r.poster_url ?? null,
      };
    }).sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  } catch {
    return SEED_HOME_MODULES;
  }
}
