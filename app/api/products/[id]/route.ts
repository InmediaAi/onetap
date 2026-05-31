import { NextResponse } from "next/server";
import { fetchProduct } from "@/lib/data/getProducts";

export const runtime = "nodejs";

/** Public read of a single product by id (anon, mock fallback). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ product });
}
