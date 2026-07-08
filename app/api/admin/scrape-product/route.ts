import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/auth";
import { fetchPage } from "@/lib/admin/fetchPage";
import { extractProduct } from "@/lib/admin/extract";
import { enforceRateLimit, LIMITS } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Extract product basics from a retailer URL.
 * Body: { password, url }
 * Returns: { ok, blocked, partial, product: { brand, name, price, imageUrl, sourceUrl } }
 * Never throws on extraction - empty fields are expected (admin fills them in).
 */
export async function POST(req: Request) {
  try {
    const { password, url } = await req.json();
    if (!checkAdmin(password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }

    // Throttle outbound scrapes per IP (defends against the admin key being used
    // to fan out fetches to arbitrary external URLs).
    const limited = await enforceRateLimit(req, LIMITS.scrape);
    if (limited) return limited;

    const page = await fetchPage(url);
    if (!page.ok) {
      // Blocked or failed - return empty fields so the admin can fill manually.
      return NextResponse.json({
        ok: false,
        blocked: page.blocked,
        partial: true,
        reason: page.reason,
        product: { brand: "", name: "", price: "", imageUrl: "", images: [], sourceUrl: url },
      });
    }

    const extracted = extractProduct(page.html, page.finalUrl);
    const partial =
      !extracted.brand || !extracted.name || !extracted.price || extracted.images.length === 0;
    return NextResponse.json({
      ok: true,
      blocked: false,
      partial,
      product: { ...extracted, sourceUrl: page.finalUrl },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
