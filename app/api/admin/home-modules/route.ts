import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { SEED_HOME_MODULES } from "@/lib/data/getHomeModules";

export const runtime = "nodejs";

const MODULE_IDS = SEED_HOME_MODULES.map((m) => m.id);

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function validUrl(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return /^https?:\/\//i.test(s) ? s.slice(0, 2000) : null;
}

/** GET — the three home modules (seeds any missing rows so they're editable). */
export async function GET(req: Request) {
  if (!checkAdmin(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ modules: SEED_HOME_MODULES });

  const { data } = await db.from("home_modules").select("*");
  if (!data?.length) {
    // Seed the fixed set once so the editor always has all three rows.
    await db.from("home_modules").upsert(
      SEED_HOME_MODULES.map((m, i) => ({
        id: m.id,
        title: m.title,
        tag: m.tag,
        blurb: m.blurb,
        sort_order: i,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: "id" },
    );
  }
  const { data: rows, error } = await db
    .from("home_modules")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ modules: rows ?? [] });
}

/** POST — save one module. Body: { password, module: { id, title, tag, blurb, videoUrl, posterUrl } }. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkAdmin(body?.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const m = body?.module ?? {};
  const idx = MODULE_IDS.indexOf(m.id);
  if (idx === -1) {
    return NextResponse.json({ error: "Unknown module id" }, { status: 400 });
  }
  const seed = SEED_HOME_MODULES[idx];

  const { error } = await db.from("home_modules").upsert(
    {
      id: m.id,
      title: clean(m.title, 120) || seed.title,
      tag: clean(m.tag, 80) || seed.tag,
      blurb: clean(m.blurb, 400) || seed.blurb,
      video_url: validUrl(m.videoUrl),
      poster_url: validUrl(m.posterUrl),
      sort_order: idx,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath("/"); // bust the home page ISR cache
  return NextResponse.json({ ok: true });
}
