import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { checkAdmin } from "@/lib/admin/auth";
import { generateDraftFor, seedKeywords } from "@/lib/seo/pipeline";
import { isTextAiConfigured } from "@/lib/ai/text";

export const runtime = "nodejs";
export const maxDuration = 60; // drafting an article can take 20-40s

/**
 * Admin-triggered draft generation. Body: { password, term } → draft one guide;
 * { password, seed: true } → seed the keyword queue from catalog dimensions.
 * Never publishes — the draft awaits review on the Journal tab.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkAdmin(body?.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (body?.seed) {
    try {
      const seeded = await seedKeywords();
      return NextResponse.json({ ok: true, seeded });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Seed failed" },
        { status: 500 },
      );
    }
  }

  if (!isTextAiConfigured()) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not set — add it to enable AI drafting." },
      { status: 503 },
    );
  }

  const term = typeof body?.term === "string" ? body.term.trim() : "";
  if (!term) return NextResponse.json({ error: "Missing term" }, { status: 400 });

  try {
    const r = await generateDraftFor(term, "manual");
    revalidatePath("/journal");
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Draft failed" },
      { status: 500 },
    );
  }
}
