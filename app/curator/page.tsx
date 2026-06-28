import Header from "@/components/Header";
import CatalogClient from "@/components/CatalogClient";
import SiteFooter from "@/components/SiteFooter";
import { queryProducts } from "@/lib/data/productQuery";
import { getFacetRows } from "@/lib/data/facetSource";
import { computeFacets, EMPTY_FILTERS } from "@/lib/data/facets";

const PAGE_SIZE = 20;

export default async function CuratorPage() {
  // First page + facets computed server-side (no filters) — the client takes
  // over for subsequent pages/filters. Never ships the whole catalog.
  const [{ products, total }, facetRows] = await Promise.all([
    queryProducts(EMPTY_FILTERS, 1, PAGE_SIZE),
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

      <CatalogClient initialProducts={products} initialTotal={total} initialFacets={facets} />

      <SiteFooter />
    </main>
  );
}
