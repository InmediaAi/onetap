"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (auth-aware, cookie-backed session). Use in client
 * components for sign-in/out and authenticated reads. Returns null when
 * Supabase isn't configured so the app degrades gracefully in dev.
 */
export function createBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createBrowserClient(url, anon);
}

export function isAuthConfiguredClient() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
