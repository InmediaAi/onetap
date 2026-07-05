import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { createServiceClient } from "@/lib/supabase/server";
import { syncRegisteredBrands } from "@/lib/external/mailchimp";
import {
  STYLES,
  CATEGORIES,
  GOALS,
  MOODS,
  SETTINGS,
} from "@/lib/data/vocab";

export const runtime = "nodejs";

/** Keep only values that are in the allowed vocabulary (max 60). */
function only(values: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(values)) return [];
  const set = new Set(allowed);
  return Array.from(
    new Set(values.filter((v): v is string => typeof v === "string" && set.has(v))),
  ).slice(0, 60);
}

/**
 * Update the signed-in user's profile.
 * username is validated/uniqued via set_username(); other fields update the row
 * directly (RLS: own row only). Vocab arrays are filtered to allowed values.
 */
export async function PATCH(req: Request) {
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (Array.isArray(body.brands)) {
    patch.favorite_brands = body.brands.slice(0, 60).map(String);
  }
  if (typeof body.selfiePath === "string") patch.selfie_url = body.selfiePath;
  if (typeof body.bodyPath === "string") patch.body_url = body.bodyPath;
  if (typeof body.leftPath === "string") patch.left_url = body.leftPath;
  if (typeof body.rightPath === "string") patch.right_url = body.rightPath;
  if (typeof body.backPath === "string") patch.back_url = body.backPath;
  if (body.style !== undefined) patch.style = only(body.style, STYLES);
  if (body.categories !== undefined) patch.categories = only(body.categories, CATEGORIES);
  if (body.goals !== undefined) patch.goals = only(body.goals, GOALS);
  if (body.sceneMood !== undefined) patch.scene_mood = only(body.sceneMood, MOODS);
  if (body.sceneSetting !== undefined) patch.scene_setting = only(body.sceneSetting, SETTINGS);
  if (body.heightInches !== undefined) {
    const h = Number(body.heightInches);
    patch.height_inches = Number.isFinite(h) && h >= 56 && h <= 76 ? Math.round(h) : null;
  }
  if (body.onboarded === true) patch.onboarded = true;
  // Free-form display name (distinct from the strict `username` handle below).
  if (typeof body.name === "string") {
    const n = body.name.trim().slice(0, 80);
    patch.display_name = n || null;
  }

  // When brands are changing, read the previous set first so we can reconcile
  // Mailchimp tags (deactivate the ones the user deselected).
  let prevBrands: string[] = [];
  if (Array.isArray(patch.favorite_brands)) {
    const { data: prev } = await sb
      .from("profiles")
      .select("favorite_brands")
      .eq("user_id", user.id)
      .maybeSingle();
    prevBrands = (prev?.favorite_brands as string[] | null) ?? [];
  }

  // Persist the editable fields. RLS allows a user to UPDATE (not INSERT) their
  // own row — the signup trigger seeds it. Update + check the error (the old
  // upsert silently failed RLS, so nothing was ever saved).
  const hasFields = Object.keys(patch).length > 1; // beyond updated_at
  if (hasFields) {
    const { data: updated, error } = await sb
      .from("profiles")
      .update(patch)
      .eq("user_id", user.id)
      .select("user_id")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Row missing (user predates the signup trigger) → seed it with the service
    // role, since clients can't INSERT into profiles by design.
    if (!updated) {
      const svc = createServiceClient();
      if (!svc) {
        return NextResponse.json(
          { error: "Profile row missing and service role not configured." },
          { status: 500 },
        );
      }
      const { error: seedErr } = await svc
        .from("profiles")
        .upsert(
          { user_id: user.id, email: user.email, ...patch },
          { onConflict: "user_id" },
        );
      if (seedErr) {
        return NextResponse.json({ error: seedErr.message }, { status: 500 });
      }
    }
  }

  if (typeof body.username === "string" && body.username.trim()) {
    const { error } = await sb.rpc("set_username", { p_username: body.username });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  // Brands changed (onboarding OR a later profile edit) → reconcile the registered
  // Mailchimp contact's brand tags: newly-selected active, deselected inactive.
  // Non-blocking: never fails the profile save.
  if (Array.isArray(patch.favorite_brands)) {
    const selected = patch.favorite_brands as string[];
    const removed = prevBrands.filter((b) => !selected.includes(b));
    await syncRegisteredBrands(user.email, selected, removed);
  }

  return NextResponse.json({ ok: true });
}
