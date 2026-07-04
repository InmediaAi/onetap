import Header from "@/components/Header";
import CatalogClient from "@/components/CatalogClient";
import SiteFooter from "@/components/SiteFooter";
import { queryProducts } from "@/lib/data/productQuery";
import { getFacetRows } from "@/lib/data/facetSource";
import { computeFacets, parseFilters, EMPTY_FILTERS } from "@/lib/data/facets";

const PAGE_SIZE = 20;

export default async function CuratorPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Honor a URL brand pre-select (e.g. a /brands landing CTA → ?brands=Ganni):
  // query the FILTERED first page server-side so the deep-link lands correct with
  // no unfiltered flash. Facets stay computed over the full catalog (EMPTY_FILTERS)
  // so the quick-brand row is the complete, stable set.
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(await searchParams)) {
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, x));
    else if (v != null) sp.set(k, v);
  }
  const filters = parseFilters(sp);
  const initialBrand = filters.brands[0] ?? null;
  const initialOccasions = filters.occasions;

  const [{ products, total }, facetRows] = await Promise.all([
    queryProducts(filters, 1, PAGE_SIZE),
    getFacetRows(),
  ]);
  const facets = computeFacets(facetRows, EMPTY_FILTERS);

  return (
    <main>
      <Header />

      <section className="sec-hero">
        <p className="eyebrow">OneTap Curator</p>
        <h1>The pieces, chosen for you.</h1>
        <p className="sec-sub">
          From a hundred houses. Refine, and every piece that answers appears.
        </p>
      </section>

      <CatalogClient
        initialProducts={products}
        initialTotal={total}
        initialFacets={facets}
        initialBrand={initialBrand}
        initialOccasions={initialOccasions}
      />

      <SiteFooter />
    </main>
  );
}
