import "server-only";

/**
 * Best-effort product extraction from a retailer page's HTML.
 *
 * Strategy (no per-site scrapers, no headless browser):
 *   1. schema.org/Product JSON-LD  — present on most retailers for SEO.
 *   2. Open Graph / meta tags      — fallback for anything still missing.
 * Whatever can't be found is left empty for the admin to fill in manually.
 */

export interface ExtractedProduct {
  brand: string;
  name: string;
  price: string;
  imageUrl: string;
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

function pickImage(image: unknown, base: string): string {
  if (typeof image === "string") return abs(image, base);
  if (Array.isArray(image)) return pickImage(image[0], base);
  if (image && typeof image === "object") {
    const o = image as Record<string, unknown>;
    return abs(typeof o.url === "string" ? o.url : undefined, base);
  }
  return "";
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
  return {
    name: typeof product.name === "string" ? decodeEntities(product.name) : undefined,
    brand: pickBrand(product.brand) || undefined,
    imageUrl: pickImage(product.image, base) || undefined,
    price: offer.price !== undefined ? formatPrice(offer.price, offer.currency) : undefined,
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

function fromOpenGraph(html: string, base: string): Partial<ExtractedProduct> {
  const amount =
    meta(html, "product:price:amount") ||
    meta(html, "og:price:amount") ||
    meta(html, "twitter:data1");
  const currency =
    meta(html, "product:price:currency") || meta(html, "og:price:currency");
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return {
    name: meta(html, "og:title") || (titleTag ? decodeEntities(titleTag) : undefined),
    brand: meta(html, "og:brand") || meta(html, "product:brand") || meta(html, "og:site_name"),
    imageUrl: abs(meta(html, "og:image") || meta(html, "twitter:image"), base) || undefined,
    price: amount ? formatPrice(amount, currency) : undefined,
  };
}

/** Merge sources, JSON-LD winning over OG, dropping empty values. */
export function extractProduct(html: string, finalUrl: string): ExtractedProduct {
  const ld = fromJsonLd(html, finalUrl);
  const og = fromOpenGraph(html, finalUrl);
  const pick = (k: keyof ExtractedProduct) => (ld[k] || og[k] || "").trim();
  return {
    brand: pick("brand"),
    name: pick("name"),
    price: pick("price"),
    imageUrl: pick("imageUrl"),
  };
}
