import { NextResponse } from "next/server";
import { getTryOnProvider } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Photo Try-On — generateTryOn(). Body: { userImage, productImage }. */
export async function POST(req: Request) {
  try {
    const { userImage, productImage } = await req.json();
    if (!userImage || !productImage) {
      return NextResponse.json(
        { error: "userImage and productImage are required" },
        { status: 400 },
      );
    }

    const provider = getTryOnProvider();
    const result = await provider.generateTryOn({ userImage, productImage });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
