import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function validUrl(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return /^https?:\/\//i.test(s) ? s.slice(0, 2000) : "";
}

/** GET - the stored admin config (empty arrays = site uses auto defaults). */
export async function GET(req: Request) {
  if (!checkAdmin(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ occasionTiles: [], houseTiles: [] });
  const { data } = await db
    .from("home_config")
    .select("occasion_tiles, house_tiles")
    .eq("id", "default")
    .maybeSingle();
  return NextResponse.json({
    occasionTiles: data?.occasion_tiles ?? [],
    houseTiles: data?.house_tiles ?? [],
  });
}

/** POST - replace one section. Body: { password, kind: "occasions"|"houses", tiles: [...] }. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkAdmin(body?.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const kind = body?.kind;
  const tilesIn = Array.isArray(body?.tiles) ? body.tiles : [];

  let patch: Record<string, unknown>;
  if (kind === "occasions") {
    const tiles = tilesIn
      .map((t: Record<string, unknown>) => ({
        title: clean(t.title, 60),
        description: clean(t.description, 240),
        occasions: clean(t.occasions, 200), // CSV of facet values
        image: validUrl(t.image),
      }))
      .filter((t: { title: string }) => t.title)
      .slice(0, 6);
    patch = { occasion_tiles: tiles };
  } else if (kind === "houses") {
    const tiles = tilesIn
      .map((t: Record<string, unknown>) => ({
        name: clean(t.name, 60),
        image: validUrl(t.image),
      }))
      .filter((t: { name: string }) => t.name)
      .slice(0, 8);
    patch = { house_tiles: tiles };
  } else {
    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  }

  const { error } = await db
    .from("home_config")
    .upsert({ id: "default", ...patch, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/"); // bust the home page ISR cache
  return NextResponse.json({ ok: true });
}
