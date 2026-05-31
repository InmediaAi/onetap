import { NextResponse } from "next/server";
import { checkAdmin, isAdminEnabled } from "@/lib/admin/auth";

export const runtime = "nodejs";

/** Verify the admin password. Body: { password }. */
export async function POST(req: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: "Admin is not configured. Set ADMIN_PASSWORD." },
      { status: 503 },
    );
  }
  try {
    const { password } = await req.json();
    if (!checkAdmin(password)) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
