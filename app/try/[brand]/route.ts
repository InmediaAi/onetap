import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UTM_KEYS = ["utm_campaign", "utm_source", "utm_medium", "utm_content", "utm_term"];

/**
 * Legacy 1-segment campaign deeplink. `/try/<productId>?utm_*` → redirects to the
 * Curator with the product preselected (`/?try=<id>`), preserving UTM params.
 * (The first segment is named `brand` to match the 3-segment landing route
 * /try/[brand]/[slug]/[id]; here it simply carries the product id.)
 */
export async function GET(req: Request, { params }: { params: Promise<{ brand: string }> }) {
  const { brand: productId } = await params;
  const { searchParams, origin } = new URL(req.url);

  const qs = new URLSearchParams({ try: productId });
  for (const k of UTM_KEYS) {
    const v = searchParams.get(k);
    if (v) qs.set(k, v);
  }
  return NextResponse.redirect(`${origin}/?${qs.toString()}`);
}
