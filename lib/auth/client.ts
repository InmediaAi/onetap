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

/**
 * Popup-window OAuth — keeps the calling page alive so work can run in parallel
 * (FIFA pre-composes the scene image while the user signs in). The popup is
 * opened SYNCHRONOUSLY in the click (to dodge popup blockers) at about:blank,
 * then pointed at the OAuth URL once it resolves. Returns the popup handle, or
 * null if the browser blocked it (caller falls back to a full-page redirect).
 * The popup lands on /auth/callback?...&popup=1, which postMessages + self-closes.
 */
export function openAuthPopup(provider: "google" | "apple", next = "/fifa"): Window | null {
  if (typeof window === "undefined") return null;
  const popup = window.open(
    "about:blank",
    "otp-oauth",
    "width=480,height=720,menubar=no,toolbar=no,location=no,status=no",
  );
  if (!popup) return null; // blocked
  metaTrack("Lead", { method: provider, next });
  const sb = createBrowserSupabase();
  if (!sb) {
    popup.close();
    return null;
  }
  void sb.auth
    .signInWithOAuth({
      provider,
      options: {
        skipBrowserRedirect: true,
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}&popup=1`,
      },
    })
    .then(({ data, error }) => {
      if (error || !data?.url) {
        try {
          popup.close();
        } catch {
          /* ignore */
        }
        return;
      }
      popup.location.href = data.url;
    });
  return popup;
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
