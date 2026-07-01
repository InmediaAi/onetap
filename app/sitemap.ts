import type { MetadataRoute } from "next";
import { fetchBrands } from "@/lib/data/getBrands";
import { brandPath, brandNewArrivalsPath } from "@/lib/data/links";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Public, indexable routes. Private/auth-gated pages (profile, closet, admin,
// onboarding) are intentionally excluded — see app/robots.ts.
const PUBLIC_ROUTES: Array<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: "/curator", priority: 0.9 },
  { path: "/brands", priority: 0.8 },
  { path: "/tryon", priority: 0.8 },
  { path: "/fifa", priority: 0.8 },
  { path: "/pricing", priority: 0.6 },
  { path: "/privacy", priority: 0.3 },
  { path: "/terms", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = PUBLIC_ROUTES.map(({ path, priority }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority,
  }));

  // Per served brand (auto-discovered from the catalog): the landing page + its
  // keyword "new arrivals" page.
  const brands = await fetchBrands();
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
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
  ]);

  return [...staticEntries, ...brandEntries];
}
