import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * /robots.txt - allow crawling of public pages, disallow private/auth-gated and
 * API routes, and point crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/profile", "/closet", "/onboarding"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
