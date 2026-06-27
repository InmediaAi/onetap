import { NextResponse } from "next/server";
import { queryProducts } from "@/lib/data/productQuery";
import { parseFilters } from "@/lib/data/facets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PAGE_SIZE = 60;

/** Paginated, filtered Curator products → { products, total }. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const filters = parseFilters(sp);
  const page = Math.max(1, Number(sp.get("page")) || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(sp.get("pageSize")) || 16));

  const { products, total } = await queryProducts(filters, page, pageSize);
  return NextResponse.json(
    { products, total, page, pageSize },
    { headers: { "Cache-Control": "no-store" } },
  );
}
