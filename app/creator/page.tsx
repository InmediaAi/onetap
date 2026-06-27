import Header from "@/components/Header";
import CreatorBuilder from "@/components/CreatorBuilder";
import SiteFooter from "@/components/SiteFooter";
import { queryProducts } from "@/lib/data/productQuery";
import { EMPTY_FILTERS } from "@/lib/data/facets";

const PICKER_PAGE_SIZE = 12;

export default async function CreatorPage() {
  // First page of the "choose from Curator" picker; the client fetches more.
  const { products, total } = await queryProducts(EMPTY_FILTERS, 1, PICKER_PAGE_SIZE);

  return (
    <main>
      <Header />
      <CreatorBuilder initialProducts={products} initialTotal={total} />
      <SiteFooter />
    </main>
  );
}
