import Header from "@/components/Header";
import CreatorBuilder from "@/components/CreatorBuilder";
import SiteFooter from "@/components/SiteFooter";
import { fetchProducts } from "@/lib/data/getProducts";

export default async function CreatorPage() {
  const products = await fetchProducts();

  return (
    <main>
      <Header />
      <CreatorBuilder products={products} />
      <SiteFooter />
    </main>
  );
}
