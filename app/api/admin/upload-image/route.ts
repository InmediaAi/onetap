import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin/auth";
import { uploadProductImageBytes } from "@/lib/storage/productImages";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Manual image upload — the guaranteed fallback when a retailer CDN blocks our
 * server fetch. The admin's browser reads the file as a data URL and posts it
 * here; we store the bytes in the product-images bucket and return the public
 * URL (which the admin form adds to the piece, like a pasted image URL).
 * Body: { password, dataUrl }.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!checkAdmin(body?.password)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
    const m = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
    if (!m) {
      return NextResponse.json({ error: "Expected a base64 image data URL" }, { status: 400 });
    }
    const contentType = m[1].toLowerCase();
    const bytes = Buffer.from(m[2], "base64");
    if (bytes.length === 0) {
      return NextResponse.json({ error: "Empty image" }, { status: 400 });
    }
    if (bytes.length > 15 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large (max 15MB)" }, { status: 413 });
    }

    const url = await uploadProductImageBytes(bytes, contentType);
    if (!url) {
      return NextResponse.json({ error: "Upload failed (storage not configured?)" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
