import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const STATUSES = ["new", "contacted", "closed"] as const;

/** GET - list partner enquiries (newest first). Password via header. */
export async function GET(req: Request) {
  if (!checkAdmin(req.headers.get("x-admin-password"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ leads: [] });
  const { data, error } = await db
    .from("partner_leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leads: data ?? [] });
}

/** PATCH - update a lead's status. Body: { password, id, status }. */
export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkAdmin(body?.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = typeof body?.id === "string" ? body.id : "";
  const status = body?.status;
  if (!id || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "id and a valid status are required" }, { status: 400 });
  }
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const { error } = await db.from("partner_leads").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** DELETE - remove a lead. Body: { password, id }. */
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!checkAdmin(body?.password)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = createServiceClient();
  if (!db) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const { error } = await db.from("partner_leads").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
