import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { SEED_PROMPTS, type PromptId } from "@/lib/ai/prompts";
import { bustPromptsCache } from "@/lib/ai/getPrompts";

export const runtime = "nodejs";

const PROMPT_IDS = Object.keys(SEED_PROMPTS) as PromptId[];

/** GET — the editable AI prompts (admin list). Password via header. Seeds any
 *  missing rows so the editor always shows both, even before the DB is seeded. */
export async function GET(req: Request) {
  if (!checkAdmin(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ prompts: [] });

  const { data } = await db.from("ai_prompts").select("id, label, content, updated_at");
  const byId = new Map((data ?? []).map((r) => [r.id, r]));
  const prompts = PROMPT_IDS.map((id) => {
    const row = byId.get(id);
    return {
      id,
      label: (row?.label as string) || SEED_PROMPTS[id].label,
      content: (row?.content as string) ?? SEED_PROMPTS[id].content,
      updated_at: (row?.updated_at as string) ?? null,
    };
  });
  return NextResponse.json({ prompts });
}

/** POST — update one prompt. Body: { password, id, content }. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!checkAdmin(body?.password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const id = body?.id as string;
    if (!PROMPT_IDS.includes(id as PromptId)) {
      return NextResponse.json({ error: "Unknown prompt id" }, { status: 400 });
    }
    const content = typeof body?.content === "string" ? body.content.trim().slice(0, 8000) : "";
    if (!content) {
      return NextResponse.json({ error: "Prompt cannot be empty" }, { status: 400 });
    }

    const db = createServiceClient();
    if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });

    const { data, error } = await db
      .from("ai_prompts")
      .upsert(
        { id, label: SEED_PROMPTS[id as PromptId].label, content, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      )
      .select("id, label, content, updated_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    bustPromptsCache(); // drop the in-memory cache so generations pick it up now
    return NextResponse.json({ ok: true, prompt: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
