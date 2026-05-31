import Header from "@/components/Header";
import CatalogClient from "@/components/CatalogClient";
import { fetchProducts } from "@/lib/data/getProducts";

export default async function HomePage() {
  const products = await fetchProducts();

  return (
    <main>
      <Header />

      <CatalogClient products={products} />

      <footer className="foot">
        <div className="foot-inner">
          <span className="wordmark">OneTap Atelier</span>
          <div className="fmeta">
            <span className="label">Confidential — By Invitation</span>
            <span className="label">&copy; MMXXVI</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
