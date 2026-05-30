import { NextResponse } from "next/server";
import { getVideoProvider } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Social Video — generateVideo(). Body: { image } (generated try-on image). */
export async function POST(req: Request) {
  try {
    const { image } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "image is required" }, { status: 400 });
    }

    const provider = getVideoProvider();
    const result = await provider.generateVideo({ image });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
