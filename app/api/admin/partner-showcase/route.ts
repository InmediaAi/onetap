import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_URLS = 12;

/** GET — current showcase clip URLs. Password via header. */
export async function GET(req: Request) {
  if (!checkAdmin(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ urls: [] });
  const { data, error } = await db
    .from("partner_config")
    .select("showcase_urls")
    .eq("id", "default")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ urls: data?.showcase_urls ?? [] });
}

/** POST — replace the showcase clip URLs. Body: { password, urls: string[] }. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkAdmin(body?.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const urls = Array.isArray(body?.urls)
    ? Array.from(
        new Set(
          body.urls
            .map((u: unknown) => (typeof u === "string" ? u.trim() : ""))
            .filter((u: string) => /^https?:\/\//i.test(u)),
        ),
      ).slice(0, MAX_URLS)
    : [];

  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const { error } = await db
    .from("partner_config")
    .upsert(
      { id: "default", showcase_urls: urls, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, urls });
}
