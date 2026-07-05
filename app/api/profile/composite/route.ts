import { NextResponse } from "next/server";
import { getIdentityProvider } from "@/lib/ai";
import { logGeneration, imageRefOf } from "@/lib/ai/logGeneration";
import { createServerSupabase } from "@/lib/supabase/ssr-server";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL_PATH = "model"; // {uid}/model - system-derived, user cannot write it.

/** Fetch bytes from a hosted/data URL. */
async function toBytes(
  source: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    if (source.startsWith("data:")) {
      const comma = source.indexOf(",");
      const header = source.slice(5, comma);
      if (comma < 0 || !header.includes("base64")) return null;
      return {
        bytes: Buffer.from(source.slice(comma + 1), "base64"),
        contentType: header.split(";")[0] || "image/png",
      };
    }
    const res = await fetch(source);
    if (!res.ok) return null;
    return {
      bytes: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") || "image/png",
    };
  } catch {
    return null;
  }
}

/**
 * Generate the derived multi-angle "model sheet" from the user's uploaded
 * photos. System-only: written to the private avatars bucket via the service
 * role at {uid}/model (avatars RLS blocks users from writing that name), then
 * recorded in profiles.model_url. Free (image), no quota.
 */
export async function POST() {
  const startedAt = Date.now();
  const sb = await createServerSupabase();
  if (!sb) return NextResponse.json({ error: "Auth not configured" }, { status: 503 });

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const svc = createServiceClient();
  if (!svc) {
    return NextResponse.json(
      { error: "Storage not configured (SUPABASE_SERVICE_ROLE_KEY)" },
      { status: 503 },
    );
  }

  try {
    const { data: profile } = await sb
      .from("profiles")
      .select("selfie_url, body_url, left_url, right_url, back_url")
      .eq("user_id", user.id)
      .maybeSingle();

    // Use every angle on file - full body, both side looks, back, and face.
    const paths = [
      profile?.body_url,
      profile?.left_url,
      profile?.right_url,
      profile?.back_url,
      profile?.selfie_url,
    ].filter((p): p is string => typeof p === "string" && p.length > 0);

    if (paths.length < 2) {
      return NextResponse.json(
        { error: "Add at least two photos first." },
        { status: 400 },
      );
    }

    // Short-lived signed URLs the provider can read (private bucket).
    const signed = await Promise.all(
      paths.map(async (p) => {
        const { data } = await sb.storage.from("avatars").createSignedUrl(p, 600);
        return data?.signedUrl ?? null;
      }),
    );
    const images = signed.filter((u): u is string => Boolean(u));
    if (images.length < 2) {
      return NextResponse.json({ error: "Could not read your photos." }, { status: 400 });
    }

    const provider = getIdentityProvider();
    const result = await provider.composeModelSheet({ images });

    const got = await toBytes(result.imageUrl);
    if (!got) throw new Error("Could not read the generated image");

    const path = `${user.id}/${MODEL_PATH}`;
    const up = await svc.storage
      .from("avatars")
      .upload(path, got.bytes, {
        contentType: got.contentType,
        upsert: true,
        cacheControl: "3600",
      });
    if (up.error) throw new Error(up.error.message);

    await sb
      .from("profiles")
      .upsert({ user_id: user.id, email: user.email, model_url: path }, { onConflict: "user_id" });

    const { data: signedOut } = await sb.storage
      .from("avatars")
      .createSignedUrl(path, 3600);

    await logGeneration({
      kind: "model",
      provider: result.provider,
      model: result.model,
      prompt: result.prompt,
      imageRef: imageRefOf(images[0]),
      status: "ok",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ modelUrl: signedOut?.signedUrl ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    await logGeneration({
      kind: "model",
      status: "error",
      durationMs: Date.now() - startedAt,
      error: message,
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
