import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import ProductLanding from "@/components/campaign/ProductLanding";
import JsonLd from "@/components/seo/JsonLd";
import { fetchProduct } from "@/lib/data/getProducts";
import { campaignPath, campaignUrl } from "@/lib/data/links";
import { productSchema } from "@/lib/seo/schema";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * Per-product campaign landing page (PDP) - /try/{brand}/{slug}/{id}. The id is
 * the lookup; brand + slug are cosmetic. Same header/footer as home, shows the
 * piece, and a OneTap Try-On CTA that runs the exact Curator try-on flow.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProduct(id);
  if (!product) return { title: "Piece - OneTap Atelier" };
  const title = `${product.brand} - ${product.name} · OneTap Atelier`;
  const description =
    product.stylistNote || product.description || `See ${product.name} by ${product.brand} on you - one tap.`;
  const image = product.imageUrl;
  return {
    title,
    description,
    alternates: { canonical: campaignPath(product) },
    openGraph: { title, description, type: "website", images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function CampaignProductPage({
  params,
}: {
  params: Promise<{ brand: string; slug: string; id: string }>;
}) {
  const { id } = await params;
  const product = await fetchProduct(id);

  return (
    <main className="page-shell">
      <Header />
      {product ? (
        <>
          <JsonLd data={productSchema(product, campaignUrl(product, SITE))} />
          <ProductLanding product={product} />
        </>
      ) : (
        <div className="pdp-missing">
          <p className="eyebrow">OneTap Atelier</p>
          <h1>This piece isn’t available</h1>
          <p className="pdp-missing-sub">
            The link may have expired or the piece was removed. Browse the edit to find your next look.
          </p>
          <Link href="/curator" className="btn-line">
            Browse the Curator
          </Link>
        </div>
      )}
      <SiteFooter />
    </main>
  );
}
