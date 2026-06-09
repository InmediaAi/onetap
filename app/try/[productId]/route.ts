import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UTM_KEYS = ["utm_campaign", "utm_source", "utm_medium", "utm_content", "utm_term"];

/**
 * Campaign deeplink. `/try/<productId>?utm_*` → redirects to the Curator with
 * the product preselected (`/?try=<id>`), preserving UTM params so the global
 * AnalyticsProvider captures attribution. Anonymous-safe; the catalog gate then
 * handles sign-in / quota and auto-opens the try-on.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const { searchParams, origin } = new URL(req.url);

  const qs = new URLSearchParams({ try: productId });
  for (const k of UTM_KEYS) {
    const v = searchParams.get(k);
    if (v) qs.set(k, v);
  }
  return NextResponse.redirect(`${origin}/?${qs.toString()}`);
}
