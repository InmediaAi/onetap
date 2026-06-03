import Header from "@/components/Header";
import CatalogClient from "@/components/CatalogClient";
import SiteFooter from "@/components/SiteFooter";
import { fetchProducts } from "@/lib/data/getProducts";

export default async function CuratorPage() {
  const products = await fetchProducts();

  return (
    <main>
      <Header />

      <section className="sec-hero">
        <p className="eyebrow">OneTap Curator</p>
        <h1>Curated, not crowded.</h1>
        <p className="sec-sub">
          A standing edit of the most considered pieces in luxury fashion —
          hand-selected, then visualized on you in seconds.
        </p>
      </section>

      <CatalogClient products={products} />

      <SiteFooter />
    </main>
  );
}
