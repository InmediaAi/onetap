import "server-only";
import { createReadClient } from "@/lib/supabase/server";
import { rowToProduct, type ProductRow } from "@/lib/supabase/util";
import { type Product } from "@/lib/data/products";

/**
 * Campaign reader for the public landing (e.g. /fifa). Reads the campaign, its
 * teams (nation colours/flags), jerseys (per-kit products) and moments via the
 * anon client (public-read RLS). Returns null when unconfigured or not found.
 */

export interface CampaignJersey {
  kit: string; // "Home" | "Home (Authentic)" | "Away" | "Away (Authentic)"
  product: Product;
}
export interface CampaignTeam {
  country: string;
  accent: string | null;
  flag: string | null;
  jerseys: CampaignJersey[];
}
export interface CampaignMoment {
  id: string;
  label: string;
  prompt: string;
}
export interface CampaignSnapshot {
  id: string;
  title: string;
  subtitle: string | null;
  accent: string | null;
  teams: CampaignTeam[];
  moments: CampaignMoment[];
}

export async function getCampaign(id: string): Promise<CampaignSnapshot | null> {
  const db = createReadClient();
  if (!db) return null;
  try {
    const { data: campaign } = await db
      .from("campaigns")
      .select("id, title, subtitle, accent, active")
      .eq("id", id)
      .eq("active", true)
      .maybeSingle();
    if (!campaign) return null;

    const [{ data: teams }, { data: jerseys }, { data: moments }] = await Promise.all([
      db.from("campaign_teams").select("*").eq("campaign_id", id).order("sort_order"),
      db.from("campaign_jerseys").select("*").eq("campaign_id", id).order("sort_order"),
      db.from("campaign_moments").select("*").eq("campaign_id", id).order("sort_order"),
    ]);

    // Resolve jersey products in one query.
    const ids = Array.from(
      new Set((jerseys ?? []).map((j) => j.product_id).filter(Boolean) as string[]),
    );
    const productById = new Map<string, Product>();
    if (ids.length) {
      const { data: prows } = await db.from("products").select("*").in("id", ids);
      (prows as ProductRow[] | null)?.forEach((r) => productById.set(r.id, rowToProduct(r)));
    }

    const teamList: CampaignTeam[] = (teams ?? []).map((t) => ({
      country: t.country,
      accent: t.accent ?? null,
      flag: t.flag ?? null,
      jerseys: (jerseys ?? [])
        .filter((j) => j.country === t.country && j.product_id && productById.has(j.product_id))
        .map((j) => ({ kit: j.kit, product: productById.get(j.product_id)! })),
    }));

    return {
      id: campaign.id,
      title: campaign.title,
      subtitle: campaign.subtitle ?? null,
      accent: campaign.accent ?? null,
      teams: teamList,
      moments: (moments ?? []).map((m) => ({ id: m.id, label: m.label, prompt: m.prompt })),
    };
  } catch {
    return null;
  }
}
