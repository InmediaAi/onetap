import Header from "@/components/Header";
import CatalogClient from "@/components/CatalogClient";
import { fetchProducts } from "@/lib/data/getProducts";

export default async function HomePage() {
  const products = await fetchProducts();

  return (
    <main>
      <Header />

      <div className="pagehead">
        <h1>New In</h1>
        <p>
          The newest arrivals, edited for the season. Each piece may be seen on
          you — a try-on, a turn, a ten-second film — before it is yours. Your
          likeness is kept <u>private to you</u>.
        </p>
      </div>

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
