import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/ssr-server";

export const runtime = "nodejs";

/**
 * OAuth / magic-link callback. Exchanges the auth code for a session cookie,
 * then redirects to `next` (defaults to onboarding).
 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const sb = await createServerSupabase();
    if (sb) await sb.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
