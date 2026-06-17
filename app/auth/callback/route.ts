import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export const runtime = "nodejs";

/**
 * OAuth / magic-link callback. Exchanges the auth code for a session and sets
 * the session cookies ON THE REDIRECT RESPONSE (writing to the next/headers
 * cookie store does NOT reliably attach Set-Cookie to a self-built NextResponse,
 * which previously left the user unauthenticated server-side).
 *
 * Routing: first-time users (not yet onboarded) go to /onboarding; returning
 * users go to their intended screen (`next`).
 */
export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const popup = searchParams.get("popup") === "1";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Popup-OAuth landing: notify the opener (which then reads the new session) and
  // self-close, instead of redirecting. Session cookies ride this HTML response.
  const popupHtml = `<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;padding:24px;color:#333">Signed in — returning to OneTap…<script>try{if(window.opener)window.opener.postMessage("otp-oauth-done",${JSON.stringify(origin)});}catch(e){}window.close();</script></body>`;
  const popupResponse = (cookies: { name: string; value: string; options: CookieOptions }[]) => {
    const res = new NextResponse(popupHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
    for (const { name, value, options } of cookies) res.cookies.set(name, value, options);
    return res;
  };

  let dest = nextParam;

  if (code && url && anon) {
    const store = await cookies();
    const pending: { name: string; value: string; options: CookieOptions }[] = [];
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll: () => store.getAll(), // includes the PKCE code-verifier cookie
        setAll: (list) => {
          pending.push(...list); // attached to the redirect response below
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] code exchange failed:", error.message);
    } else if (data.user) {
      // New vs returning. If the `onboarded` column isn't there yet (migration
      // not run), treat as onboarded so existing users aren't pushed through it.
      let onboarded = true;
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("onboarded")
        .eq("user_id", data.user.id)
        .maybeSingle();
      if (!pErr) onboarded = Boolean(profile?.onboarded);
      // Campaign microsites (e.g. /fifa) capture the photo in-funnel — skip the
      // app onboarding and return the visitor straight to the campaign.
      const isCampaign = nextParam.startsWith("/fifa");
      if (!onboarded && !isCampaign) {
        // Send new users through onboarding, but PRESERVE their intended
        // destination (e.g. a campaign deeplink) so they resume after finishing.
        dest =
          nextParam && nextParam !== "/onboarding"
            ? `/onboarding?next=${encodeURIComponent(nextParam)}`
            : "/onboarding";
      } else if (dest === "/onboarding") {
        dest = "/"; // already done → don't repeat
      }
    }

    if (popup) return popupResponse(pending); // self-close + notify opener
    const res = NextResponse.redirect(`${origin}${dest}`);
    for (const { name, value, options } of pending) {
      res.cookies.set(name, value, options);
    }
    return res;
  }

  if (popup) return popupResponse([]); // no code / unconfigured — still close the popup

  return NextResponse.redirect(`${origin}${dest}`);
}
