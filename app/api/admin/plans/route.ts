import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PLAN_IDS = ["free", "starter", "pro"] as const;

function clean(v: unknown, max = 300): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** GET - all tiers + the top-up config (admin list). Password via header. */
export async function GET(req: Request) {
  if (!checkAdmin(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ plans: [], config: null });

  const [{ data: plans }, { data: config }] = await Promise.all([
    db.from("billing_plans").select("*").order("sort_order", { ascending: true }),
    db.from("billing_config").select("*").eq("id", "default").maybeSingle(),
  ]);
  return NextResponse.json({ plans: plans ?? [], config: config ?? null });
}

/**
 * POST - update a tier OR the top-up config.
 * Body: { password, kind: "plan", plan: {...} } | { password, kind: "config", config: {...} }.
 * Tier ids are fixed (free/starter/pro); no create/delete.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!checkAdmin(body?.password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = createServiceClient();
    if (!db) {
      return NextResponse.json(
        { error: "Supabase is not configured (SUPABASE_SERVICE_ROLE_KEY)." },
        { status: 503 },
      );
    }

    if (body.kind === "config") {
      const c = body.config ?? {};
      const unit = Number(c.topupUnitPrice);
      const patch = {
        topup_unit_price: Number.isFinite(unit) && unit >= 0 ? unit : 0,
        topup_currency: clean(c.topupCurrency, 8) || "USD",
        topup_enabled: Boolean(c.topupEnabled),
        updated_at: new Date().toISOString(),
      };
      const { error } = await db
        .from("billing_config")
        .upsert({ id: "default", ...patch }, { onConflict: "id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      revalidatePath("/pricing");
      return NextResponse.json({ ok: true });
    }

    // kind === "plan"
    const p = body.plan ?? {};
    if (!PLAN_IDS.includes(p.id)) {
      return NextResponse.json({ error: "Unknown plan id" }, { status: 400 });
    }
    const price = Number(p.monthlyPrice);
    const limit = Number(p.videoLimit);
    const features = Array.isArray(p.features)
      ? p.features.map((f: unknown) => clean(f, 120)).filter(Boolean).slice(0, 12)
      : [];

    const patch = {
      name: clean(p.name, 60) || p.id,
      tagline: clean(p.tagline, 200),
      monthly_price: Number.isFinite(price) && price >= 0 ? price : 0,
      currency: clean(p.currency, 8) || "USD",
      video_limit: Number.isFinite(limit) && limit >= 0 ? Math.round(limit) : 0,
      features,
      most_popular: Boolean(p.mostPopular),
      active: p.active === undefined ? true : Boolean(p.active),
      updated_at: new Date().toISOString(),
    };

    const { error } = await db.from("billing_plans").update(patch).eq("id", p.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    revalidatePath("/pricing");
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
