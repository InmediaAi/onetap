import { NextResponse } from "next/server";
import { nextQueuedTerm, generateDraftFor } from "@/lib/seo/pipeline";
import { isTextAiConfigured } from "@/lib/ai/text";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Scheduled draft pipeline — pops the next queued keyword and drafts ONE guide
 * (status=draft, awaiting review). Guarded by CRON_SECRET (Vercel Cron sends it
 * as `Authorization: Bearer <secret>`; a `?key=` query also works for testing).
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

  if (!isTextAiConfigured()) {
    return NextResponse.json({ ok: true, skipped: "no ANTHROPIC_API_KEY" });
  }

  const term = await nextQueuedTerm();
  if (!term) return NextResponse.json({ ok: true, drafted: null, message: "queue empty" });

  try {
    const r = await generateDraftFor(term, "seed");
    return NextResponse.json({ ok: true, drafted: r });
  } catch (e) {
    return NextResponse.json(
      { ok: false, term, error: e instanceof Error ? e.message : "Draft failed" },
      { status: 500 },
    );
  }
}

export const GET = run;
export const POST = run;
