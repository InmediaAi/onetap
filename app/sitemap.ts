import type { MetadataRoute } from "next";
import { fetchBrands } from "@/lib/data/getBrands";
import { fetchProducts } from "@/lib/data/getProducts";
import { brandPath, brandNewArrivalsPath, campaignPath } from "@/lib/data/links";

// Regenerate daily so newly-added pieces appear without a redeploy.
export const revalidate = 86400;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Public, indexable routes. Private/auth-gated pages (profile, closet, admin,
// onboarding) are intentionally excluded - see app/robots.ts.
const PUBLIC_ROUTES: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: "/curator", priority: 0.9 },
  { path: "/brands", priority: 0.8 },
  { path: "/tryon", priority: 0.8 },
  { path: "/fifa", priority: 0.8 },
  { path: "/partners", priority: 0.6 },
  { path: "/pricing", priority: 0.6 },
  { path: "/about", priority: 0.4 },
  { path: "/contact", priority: 0.4 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
  { path: "/refunds", priority: 0.3 },
  { path: "/shipping", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  }));

  // Catalog read once; brands are derived from it, so both stay in sync and only
  // live/visible pieces (campaign-only excluded by fetchProducts) are emitted.
  const [brands, products] = await Promise.all([fetchBrands(), fetchProducts()]);

  // Per served brand (auto-discovered from the catalog): the landing page + its
  // keyword "new arrivals" page.
  const brandEntries: MetadataRoute.Sitemap = brands.flatMap((b) => [
    {
      url: `${SITE_URL}${brandPath(b.name)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${SITE_URL}${brandNewArrivalsPath(b.name)}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.6,
    },
  ]);

  // Per-product try-on page (PDP). campaignPath() builds the exact live URL
  // (/try/{brand}/{name}/{id}); the id segment is the route's lookup key.
  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}${campaignPath(p)}`,
    lastModified: p.droppedAt ? new Date(p.droppedAt) : now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...brandEntries, ...productEntries];
}
