import "server-only";
import { COLOUR_NAMES } from "@/lib/data/vocab";

/**
 * Best-effort product extraction from a retailer page's HTML.
 *
 * Strategy (no per-site scrapers, no headless browser):
 *   1. schema.org/Product JSON-LD  — present on most retailers for SEO.
 *   2. Open Graph / meta tags      — fallback for anything still missing.
 * Whatever can't be found is left empty for the admin to fill in manually.
 * Category + colours are GUESSED from the title (admin reviews/adjusts).
 */

export interface ExtractedProduct {
  brand: string;
  name: string;
  price: string; // formatted display string (back-compat)
  /** Raw numeric amount + currency, for the amount+currency admin fields. */
  priceAmount?: number;
  currency?: string;
  /** Primary image (images[0]) — kept for back-compat. */
  imageUrl: string;
  /** Up to SCRAPE_MAX image variants (primary first). */
  images: string[];
  /** Best-effort guesses from the title (admin confirms). */
  category?: string;
  colours?: string[];
}

/** How many image variants to pull from a page (admin can add more manually). */
export const SCRAPE_MAX_IMAGES = 3;

/** Keyword → PRODUCT_CATEGORIES, checked in order (first match wins). */
const CATEGORY_KEYWORDS: [RegExp, string][] = [
  [/co-?ord|matching set|two-?piece/i, "Co-Ord Sets"],
  [/jumpsuit|playsuit|catsuit/i, "Jumpsuits"],
  [/dress|gown|kaftan|caftan/i, "Dresses"],
  [/blazer/i, "Blazers"],
  [/suit|tailored set|tailoring/i, "Tailoring"],
  [/coat|jacket|trench|parka|anorak|outerwear|puffer|cape/i, "Outerwear"],
  [/jean|denim/i, "Denim"],
  [/trouser|pant|chino|legging/i, "Trousers"],
  [/skirt/i, "Skirts"],
  [/short(s|\b)/i, "Shorts"],
  [/knit|sweater|cardigan|jumper|cashmere|pullover/i, "Knitwear"],
  [/shirt/i, "Shirts"],
  [/top|blouse|camisole|cami|tank|tee|t-shirt|bodysuit/i, "Tops & Blouses"],
];

/** Colour-word synonyms → a COLOUR_NAMES value. */
const COLOUR_SYNONYMS: Record<string, string> = {
  gray: "Grey",
  wine: "Burgundy",
  gold: "Metallic",
  silver: "Metallic",
  tan: "Camel",
  ecru: "Cream",
};

function guessCategory(name: string): string | undefined {
  return CATEGORY_KEYWORDS.find(([re]) => re.test(name))?.[1];
}

function guessColours(name: string): string[] {
  const lower = ` ${name.toLowerCase()} `;
  const hits = new Set<string>();
  for (const c of COLOUR_NAMES) {
    if (c === "Multi-Color") continue;
    if (lower.includes(` ${c.toLowerCase()} `) || lower.includes(`${c.toLowerCase()},`)) hits.add(c);
  }
  for (const [word, name2] of Object.entries(COLOUR_SYNONYMS)) {
    if (lower.includes(` ${word} `)) hits.add(name2);
  }
  return [...hits];
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "$",
  AUD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  CHF: "CHF ",
  SEK: "kr ",
  DKK: "kr ",
  NOK: "kr ",
};

/** Format a numeric amount + currency code into the catalog's "$4,290" style. */
export function formatPrice(amount: number | string, currency?: string): string {
  const n = typeof amount === "string" ? Number(amount.replace(/[^0-9.]/g, "")) : amount;
  if (!Number.isFinite(n) || n <= 0) return "";
  const code = (currency || "USD").toUpperCase();
  const symbol = CURRENCY_SYMBOLS[code] ?? `${code} `;
  const hasCents = Math.round(n * 100) % 100 !== 0;
  const grouped = n.toLocaleString("en-US", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${symbol}${grouped}`;
}

/** Decode the handful of HTML entities that show up in titles/brands. */
export function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&nbsp;/g, " ")
    .trim();
}

function abs(url: string | undefined, base: string): string {
  if (!url) return "";
  try {
    return new URL(url, base).href;
  } catch {
    return "";
  }
}

/** Flatten JSON-LD into a list of objects, expanding @graph and arrays. */
function flattenJsonLd(node: unknown, out: Record<string, unknown>[]) {
  if (Array.isArray(node)) {
    node.forEach((n) => flattenJsonLd(n, out));
    return;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    out.push(obj);
    if (Array.isArray(obj["@graph"])) flattenJsonLd(obj["@graph"], out);
  }
}

function hasType(obj: Record<string, unknown>, type: string): boolean {
  const t = obj["@type"];
  if (typeof t === "string") return t.toLowerCase() === type.toLowerCase();
  if (Array.isArray(t)) return t.some((x) => String(x).toLowerCase() === type.toLowerCase());
  return false;
}

/** Flatten a JSON-LD `image` value (string | array | {url|contentUrl}) to URLs. */
function imageList(image: unknown, base: string): string[] {
  const out: string[] = [];
  const walk = (img: unknown) => {
    if (!img) return;
    if (typeof img === "string") {
      const a = abs(img, base);
      if (a) out.push(a);
    } else if (Array.isArray(img)) {
      img.forEach(walk);
    } else if (typeof img === "object") {
      const o = img as Record<string, unknown>;
      if (typeof o.url === "string") walk(o.url);
      if (typeof o.contentUrl === "string") walk(o.contentUrl);
    }
  };
  walk(image);
  return out;
}

function pickBrand(brand: unknown): string {
  if (typeof brand === "string") return decodeEntities(brand);
  if (brand && typeof brand === "object") {
    const name = (brand as Record<string, unknown>).name;
    if (typeof name === "string") return decodeEntities(name);
  }
  return "";
}

function pickOffer(offers: unknown): { price?: string | number; currency?: string } {
  const list = Array.isArray(offers) ? offers : offers ? [offers] : [];
  for (const o of list) {
    if (o && typeof o === "object") {
      const obj = o as Record<string, unknown>;
      // Some sites nest under priceSpecification.
      const spec = obj.priceSpecification as Record<string, unknown> | undefined;
      const price =
        (obj.price as string | number | undefined) ??
        (obj.lowPrice as string | number | undefined) ??
        (spec?.price as string | number | undefined);
      const currency =
        (obj.priceCurrency as string | undefined) ??
        (spec?.priceCurrency as string | undefined);
      if (price !== undefined && price !== null && price !== "") {
        return { price, currency };
      }
    }
  }
  return {};
}

function fromJsonLd(html: string, base: string): Partial<ExtractedProduct> {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      flattenJsonLd(JSON.parse(m[1].trim()), out);
    } catch {
      // ignore malformed blocks
    }
  }
  const product = out.find((o) => hasType(o, "Product"));
  if (!product) return {};
  const offer = pickOffer(product.offers);
  const amount =
    offer.price !== undefined
      ? Number(String(offer.price).replace(/[^0-9.]/g, ""))
      : undefined;
  return {
    name: typeof product.name === "string" ? decodeEntities(product.name) : undefined,
    brand: pickBrand(product.brand) || undefined,
    images: imageList(product.image, base),
    price: offer.price !== undefined ? formatPrice(offer.price, offer.currency) : undefined,
    priceAmount: Number.isFinite(amount) ? amount : undefined,
    currency: offer.currency ? offer.currency.toUpperCase() : undefined,
  };
}

/** Read a <meta> content by property/name, first match wins. */
function meta(html: string, key: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m && m[1]) return decodeEntities(m[1]);
  }
  return undefined;
}

/** All <meta> contents for a property/name (e.g. several og:image tags). */
function metaAll(html: string, key: string): string[] {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`,
    "gi",
  );
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) if (m[1]) out.push(decodeEntities(m[1]));
  return out;
}

function fromOpenGraph(html: string, base: string): Partial<ExtractedProduct> {
  const amount =
    meta(html, "product:price:amount") ||
    meta(html, "og:price:amount") ||
    meta(html, "twitter:data1");
  const currency =
    meta(html, "product:price:currency") || meta(html, "og:price:currency");
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const amountNum = amount ? Number(amount.replace(/[^0-9.]/g, "")) : undefined;
  const ogImages = [
    ...metaAll(html, "og:image:secure_url"),
    ...metaAll(html, "og:image"),
    ...metaAll(html, "twitter:image"),
  ]
    .map((u) => abs(u, base))
    .filter(Boolean);
  return {
    name: meta(html, "og:title") || (titleTag ? decodeEntities(titleTag) : undefined),
    brand: meta(html, "og:brand") || meta(html, "product:brand") || meta(html, "og:site_name"),
    images: ogImages,
    price: amount ? formatPrice(amount, currency) : undefined,
    priceAmount: Number.isFinite(amountNum) ? amountNum : undefined,
    currency: currency ? currency.toUpperCase() : undefined,
  };
}

/** Merge sources, JSON-LD winning over OG, dropping empty values. */
export function extractProduct(html: string, finalUrl: string): ExtractedProduct {
  const ld = fromJsonLd(html, finalUrl);
  const og = fromOpenGraph(html, finalUrl);
  const pick = (k: "brand" | "name" | "price") => String(ld[k] || og[k] || "").trim();
  // JSON-LD images first, then OG; de-dupe and cap.
  const images = Array.from(
    new Set([...(ld.images ?? []), ...(og.images ?? [])]),
  ).slice(0, SCRAPE_MAX_IMAGES);
  const name = pick("name");
  return {
    brand: pick("brand"),
    name,
    price: pick("price"),
    imageUrl: images[0] ?? "",
    images,
    priceAmount: ld.priceAmount ?? og.priceAmount,
    currency: ld.currency || og.currency,
    category: guessCategory(name),
    colours: guessColours(name),
  };
}
