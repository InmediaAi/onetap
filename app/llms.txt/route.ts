import { fetchBrands } from "@/lib/data/getBrands";
import { brandDisplayName } from "@/lib/data/brandDisplay";
import { presentOccasions, presentCategories } from "@/lib/seo/dimensions";
import { occasionCopy, categoryCopy } from "@/lib/seo/copy";
import { occasionPath, categoryPath } from "@/lib/data/links";
import { fetchGuides } from "@/lib/data/guides";

export const revalidate = 86400; // regenerate daily

const BASE = "https://www.onetapatelier.com";

/**
 * /llms.txt (spec: https://llmstxt.org) - a short, curated markdown index that
 * AI assistants read to understand the site. The houses section is generated
 * from the same live catalog as the sitemap (fetchBrands), so it never drifts
 * from /brands. Static copy is final brand copy - do not edit.
 */
export async function GET() {
  const [brands, occasions, categories, guides] = await Promise.all([
    fetchBrands(), // { name, slug } from the live catalog
    presentOccasions(),
    presentCategories(),
    fetchGuides(),
  ]);

  const guideBlock = guides.length
    ? `\n## Journal\n\n${guides
        .map((g) => `- [${g.title}](${BASE}/journal/${g.slug})${g.metaDescription ? `: ${g.metaDescription}` : ""}`)
        .join("\n")}\n`
    : "";

  const brandLines = brands
    .map((b) => {
      const name = brandDisplayName(b.name);
      return `- [${name}](${BASE}/brands/${b.slug}): Curated edit and new arrivals from ${name}`;
    })
    .join("\n");

  const occasionLines = occasions
    .map((o) => `- [${o}](${BASE}${occasionPath(o)}): ${occasionCopy(o).answer.split(".")[0]}.`)
    .join("\n");

  const categoryLines = categories
    .map((c) => `- [${c}](${BASE}${categoryPath(c)}): ${categoryCopy(c).answer.split(".")[0]}.`)
    .join("\n");

  const body = `# OneTap Atelier

> OneTap Atelier is a curated luxury membership for women. A curator selects pieces from more than 100 luxury houses; members see each piece on themselves - their face, their proportions - in one tap, before they commit. The promise: try it before you own it.

OneTap Atelier is a curation platform, not a marketplace. The catalog spans 100+ houses, but members are always shown a tight, personally chosen edit. Membership is tiered by access: Discovery (free), Atelier, Atelier Privé, and Atelier Maison. There are no discounts or sales at any tier.

Member images are protected: explicit consent, no training use without opt-in, deletion honoured.

## The platform

- [OneTap Curator](${BASE}/curator): A personalised edit from the catalog, with one-tap try-on
- [360° Try-On](${BASE}/tryon): Upload a piece and see it on yourself from every angle
- [Atelier Scenes](${BASE}/creator): Place a piece in a chosen setting - city, season, occasion
- [Membership](${BASE}/pricing): The four tiers - Discovery, Atelier, Atelier Privé, Atelier Maison
- [The houses](${BASE}/brands): All houses in the catalog

## The houses

${brandLines}

## Shop by occasion

${occasionLines}

## Shop by category

${categoryLines}
${guideBlock}
## Company

- [Partners](${BASE}/partners): For luxury houses and retailers
- [Privacy](${BASE}/privacy): How member images and data are protected
- [Terms](${BASE}/terms): Terms of membership

## Optional

- [Sitemap](${BASE}/sitemap.xml): Full index of pages, including individual pieces
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
