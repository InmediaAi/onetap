import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import { fetchOccasionEdits } from "@/lib/data/getOccasions";
import { fetchBrands } from "@/lib/data/getBrands";
import { brandPath, curatorOccasionPath } from "@/lib/data/links";

/**
 * Admin-managed home editorial (see home_config). When the admin config is
 * empty the home page falls back to auto-derived defaults, so it always renders:
 *   • occasion tiles → auto from the catalog (fetchOccasionEdits)
 *   • house tiles    → top houses by catalog depth (fetchBrands)
 */

export interface OccasionTile {
  title: string;
  description: string;
  occasions: string[];
  image: string | null;
  href: string;
}

export interface HouseTile {
  name: string;
  image: string | null;
  href: string;
}

/** Default one-liners for the seeded occasions (used until admin edits them). */
const DEFAULT_OCCASION_DESC: Record<string, string> = {
  "Date Night": "For the evening that becomes the night.",
  Vacation: "Everything for the escape — resort, coast and beyond.",
  "Party & Cocktail": "Statement dressing for the room that turns.",
};

interface ConfigRow {
  occasion_tiles: unknown;
  house_tiles: unknown;
}

async function readConfig(): Promise<ConfigRow | null> {
  const db = createReadClient();
  if (!db) return null;
  try {
    const { data } = await db
      .from("home_config")
      .select("occasion_tiles, house_tiles")
      .eq("id", "default")
      .maybeSingle();
    return (data as ConfigRow) ?? null;
  } catch {
    return null;
  }
}

function toOccasions(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string") return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Trending-occasion tiles — admin config if set, else auto-derived from the catalog. */
export async function getHomeOccasionTiles(): Promise<OccasionTile[]> {
  const cfg = await readConfig();
  const raw = Array.isArray(cfg?.occasion_tiles) ? (cfg!.occasion_tiles as Record<string, unknown>[]) : [];
  if (raw.length) {
    return raw
      .map((t) => {
        const occ = toOccasions(t.occasions);
        const title = typeof t.title === "string" ? t.title.trim() : "";
        return {
          title,
          description: typeof t.description === "string" ? t.description.trim() : "",
          occasions: occ,
          image: typeof t.image === "string" && t.image ? t.image : null,
          href: occ.length ? curatorOccasionPath(occ) : "/curator",
        };
      })
      .filter((t) => t.title)
      .slice(0, 6);
  }
  // Fallback: auto-derived occasion edits.
  const edits = await fetchOccasionEdits();
  return edits.map((e) => ({
    title: e.label,
    description: DEFAULT_OCCASION_DESC[e.label] ?? "",
    occasions: e.occasions,
    image: e.heroImage,
    href: curatorOccasionPath(e.occasions),
  }));
}

/** House tiles for the carousel — admin config if set, else top 8 houses by depth. */
export async function getHomeHouseTiles(): Promise<HouseTile[]> {
  const cfg = await readConfig();
  const raw = Array.isArray(cfg?.house_tiles) ? (cfg!.house_tiles as Record<string, unknown>[]) : [];
  if (raw.length) {
    return raw
      .map((t) => {
        const name = typeof t.name === "string" ? t.name.trim() : "";
        return {
          name,
          image: typeof t.image === "string" && t.image ? t.image : null,
          href: name ? brandPath(name) : "/brands",
        };
      })
      .filter((t) => t.name)
      .slice(0, 8);
  }
  // Fallback: top 8 houses by catalog depth that have imagery.
  const brands = await fetchBrands();
  return brands
    .filter((b) => b.heroImage)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((b) => ({ name: b.name, image: b.heroImage, href: brandPath(b.name) }));
}
