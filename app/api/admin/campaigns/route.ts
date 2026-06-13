import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const CAMPAIGN = "fifa-worldcup";
const KITS = ["Home", "Home (Authentic)", "Away", "Away (Authentic)"];

function clean(v: unknown, max = 300): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** GET — campaign data for the admin manager (teams, jerseys, moments, jersey products). */
export async function GET(req: Request) {
  if (!checkAdmin(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ teams: [], jerseys: [], moments: [], products: [] });

  const [{ data: teams }, { data: jerseys }, { data: moments }, { data: products }] =
    await Promise.all([
      db.from("campaign_teams").select("*").eq("campaign_id", CAMPAIGN).order("sort_order"),
      db.from("campaign_jerseys").select("*").eq("campaign_id", CAMPAIGN).order("sort_order"),
      db.from("campaign_moments").select("*").eq("campaign_id", CAMPAIGN).order("sort_order"),
      db
        .from("products")
        .select("id, brand, name, image_url")
        .eq("campaign_only", true)
        .order("created_at", { ascending: false }),
    ]);

  return NextResponse.json({
    teams: teams ?? [],
    jerseys: jerseys ?? [],
    moments: moments ?? [],
    products: products ?? [],
  });
}

/** POST — mutate the campaign. Body: { password, action, ... }. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!checkAdmin(body?.password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = createServiceClient();
    if (!db) {
      return NextResponse.json({ error: "Supabase not configured." }, { status: 503 });
    }

    switch (body.action) {
      case "addJersey": {
        const country = clean(body.country, 80);
        const kit = KITS.includes(body.kit) ? body.kit : "";
        const productId = clean(body.productId, 200);
        if (!country || !kit || !productId) {
          return NextResponse.json({ error: "country, kit and product are required" }, { status: 400 });
        }
        const { error } = await db.from("campaign_jerseys").insert({
          campaign_id: CAMPAIGN,
          country,
          kit,
          product_id: productId,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        break;
      }
      case "removeJersey": {
        const { error } = await db
          .from("campaign_jerseys")
          .delete()
          .eq("id", clean(body.id, 80));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        break;
      }
      case "moment": {
        const label = clean(body.label, 80);
        const prompt = clean(body.prompt, 8000); // scene prompts can be long
        const imagePrompt = clean(body.imagePrompt, 8000); // optional still prompt
        if (!label || !prompt) {
          return NextResponse.json({ error: "label and prompt are required" }, { status: 400 });
        }
        // Append to the end of the order so new moments don't collide at 0.
        const { data: last } = await db
          .from("campaign_moments")
          .select("sort_order")
          .eq("campaign_id", CAMPAIGN)
          .order("sort_order", { ascending: false })
          .limit(1);
        const sort_order = (last?.[0]?.sort_order ?? -1) + 1;
        const { error } = await db
          .from("campaign_moments")
          .insert({ campaign_id: CAMPAIGN, label, prompt, image_prompt: imagePrompt || null, sort_order });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        break;
      }
      case "updateMoment": {
        const id = clean(body.id, 80);
        const label = clean(body.label, 80);
        const prompt = clean(body.prompt, 8000);
        const imagePrompt = clean(body.imagePrompt, 8000); // optional
        if (!id || !label || !prompt) {
          return NextResponse.json({ error: "id, label and prompt are required" }, { status: 400 });
        }
        const { error } = await db
          .from("campaign_moments")
          .update({ label, prompt, image_prompt: imagePrompt || null })
          .eq("id", id)
          .eq("campaign_id", CAMPAIGN);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        break;
      }
      case "reorderMoments": {
        // body.ids = moment ids in the desired order → sort_order = index.
        const ids = Array.isArray(body.ids)
          ? (body.ids as unknown[]).map((x) => clean(x, 80)).filter(Boolean)
          : [];
        if (!ids.length) {
          return NextResponse.json({ error: "ids are required" }, { status: 400 });
        }
        for (let i = 0; i < ids.length; i++) {
          const { error } = await db
            .from("campaign_moments")
            .update({ sort_order: i })
            .eq("id", ids[i])
            .eq("campaign_id", CAMPAIGN);
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        }
        break;
      }
      case "removeMoment": {
        const { error } = await db
          .from("campaign_moments")
          .delete()
          .eq("id", clean(body.id, 80));
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    revalidatePath("/fifa");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
