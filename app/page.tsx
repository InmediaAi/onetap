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
        <h1>The pieces, chosen for you.</h1>
        <p className="sec-sub">
          From a hundred houses. Refine, and every piece that answers appears.
        </p>
      </section>

      <CatalogClient products={products} />

      <SiteFooter />
    </main>
  );
}
