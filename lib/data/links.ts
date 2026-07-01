import { kebab } from "@/lib/supabase/util";

/**
 * Campaign landing-page link for a product:
 *   /try/{brand-slug}/{piece-slug}/{productId}
 * Brand + piece slugs are cosmetic (SEO/readability); the id is the lookup.
 * Shared by the admin "copy link" action and anywhere we surface the URL.
 */
export function campaignPath(p: { id: string; brand: string; name: string }): string {
  return `/try/${kebab(p.brand)}/${kebab(p.name)}/${encodeURIComponent(p.id)}`;
}

/** Absolute campaign URL. `origin` defaults to NEXT_PUBLIC_SITE_URL. */
export function campaignUrl(
  p: { id: string; brand: string; name: string },
  origin?: string,
): string {
  const base = origin || process.env.NEXT_PUBLIC_SITE_URL || "";
  return `${base}${campaignPath(p)}`;
}

/** Brand SEO landing page: /brands/{brand-slug}. */
export function brandPath(name: string): string {
  return `/brands/${kebab(name)}`;
}

/** Absolute brand landing URL (OG images, sitemap). */
export function brandUrl(name: string, origin?: string): string {
  const base = origin || process.env.NEXT_PUBLIC_SITE_URL || "";
  return `${base}${brandPath(name)}`;
}

/** Brand "new arrivals" SEO page: /brands/{brand-slug}/new-arrivals. */
export function brandNewArrivalsPath(name: string): string {
  return `/brands/${kebab(name)}/new-arrivals`;
}

/** Absolute brand new-arrivals URL (OG images, sitemap). */
export function brandNewArrivalsUrl(name: string, origin?: string): string {
  const base = origin || process.env.NEXT_PUBLIC_SITE_URL || "";
  return `${base}${brandNewArrivalsPath(name)}`;
}

/** Curator deep-link with a brand pre-selected in the filter. */
export function curatorBrandPath(name: string): string {
  return `/curator?brands=${encodeURIComponent(name)}`;
}
