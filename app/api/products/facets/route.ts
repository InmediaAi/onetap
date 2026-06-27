import { NextResponse } from "next/server";
import { getFacetRows } from "@/lib/data/facetSource";
import { computeFacets, parseFilters } from "@/lib/data/facets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cross-filtered Curator filter options → { facets }. Computed server-side from
 *  a cached lightweight projection (no product rows shipped to the client). */
export async function GET(req: Request) {
  const filters = parseFilters(new URL(req.url).searchParams);
  const rows = await getFacetRows();
  const facets = computeFacets(rows, filters);
  return NextResponse.json({ facets }, { headers: { "Cache-Control": "no-store" } });
}
