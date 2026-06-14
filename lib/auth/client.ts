"use client";

import { createBrowserSupabase } from "@/lib/supabase/client";
import { metaTrack } from "@/lib/analytics";

/** Client auth + identity-image helpers (browser Supabase client). */

export async function signInWithProvider(
  provider: "google" | "apple",
  next = "/onboarding",
): Promise<void> {
  const sb = createBrowserSupabase();
  if (!sb) throw new Error("Auth is not configured");
  metaTrack("Lead", { method: provider, next }); // sign-in intent (Meta Pixel)
  await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
}

export async function signInWithEmail(email: string, next = "/onboarding"): Promise<void> {
  const sb = createBrowserSupabase();
  if (!sb) throw new Error("Auth is not configured");
  metaTrack("Lead", { method: "email", next });
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const sb = createBrowserSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

export type IdentityKind = "selfie" | "body" | "left" | "right" | "back";

/**
 * Upload a data-URL identity image to the private avatars bucket; returns its
 * storage path. Returns null only when Supabase is unconfigured (dev) — when it
 * is configured but the upload fails, it THROWS so callers can surface why
 * (e.g. missing `avatars` bucket, expired session, RLS). Previously this
 * swallowed every error, so photos silently never saved.
 */
export async function uploadIdentity(
  kind: IdentityKind,
  dataUrl: string,
): Promise<string | null> {
  const sb = createBrowserSupabase();
  if (!sb) return null; // not configured — keep the image in-memory for the session

  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Your session expired — please sign in again.");

  const blob = await (await fetch(dataUrl)).blob();
  const path = `${user.id}/${kind}`;
  const { error } = await sb.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
  if (error) {
    throw new Error(`Could not upload your ${kind} photo: ${error.message}`);
  }
  return path;
}
