import { NextResponse } from "next/server";
import { ingestGsc, isGscConfigured } from "@/lib/seo/gsc";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Scheduled GSC ingest — pulls Search Console "opportunity" queries into the
 * keyword_queue for the draft pipeline. Guarded by CRON_SECRET.
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not set" }, { status: 503 });
  }
  const auth = req.headers.get("authorization") || "";
  const key = new URL(req.url).searchParams.get("key");
  if (auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGscConfigured()) {
    return NextResponse.json({ ok: true, skipped: "GSC not configured" });
  }
  try {
    return NextResponse.json(await ingestGsc());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "GSC ingest failed" },
      { status: 500 },
    );
  }
}

export const GET = run;
export const POST = run;
