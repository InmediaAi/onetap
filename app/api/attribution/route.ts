import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

export const runtime = "nodejs";

/**
 * Persist FIRST-TOUCH campaign attribution onto the signed-in user's profile.
 * Body: { utm_campaign?, utm_source?, utm_medium?, campaign_product? }.
 * Writes only when attributed_at is still null, so the original campaign that
 * brought the user in is never overwritten by a later visit.
 */
export async function PATCH(req: Request) {
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ ok: false });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ ok: false });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.slice(0, 200) : null);
  const patch = {
    utm_campaign: str(body.utm_campaign),
    utm_source: str(body.utm_source),
    utm_medium: str(body.utm_medium),
    campaign_product: str(body.campaign_product),
    attributed_at: new Date().toISOString(),
  };
  if (!patch.utm_campaign && !patch.utm_source && !patch.utm_medium) {
    return NextResponse.json({ ok: false });
  }

  // First-touch: only set when not already attributed.
  await sb
    .from("profiles")
    .update(patch)
    .eq("user_id", user.id)
    .is("attributed_at", null);

  return NextResponse.json({ ok: true });
}
