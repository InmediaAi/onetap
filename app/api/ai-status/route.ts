import { NextResponse } from "next/server";
import { providerStatus } from "@/lib/ai";

export const runtime = "nodejs";

/**
 * Dev-only diagnostics — which provider + model is live for try-on and video,
 * and which registered providers have their env keys satisfied. Never exposed
 * in production (would leak configuration).
 */
export function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(providerStatus());
}
