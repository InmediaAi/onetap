export interface Price {
  amount: number;
  currency: string; // ISO code — USD | EUR | GBP | INR
}

export interface Product {
  id: string;
  brand: string;
  /** Monogram shown as the editorial placeholder behind the product image. */
  mono: string;
  name: string;
  price: Price;
  /** Primary image (images[0]). */
  imageUrl: string;
  /** All image variants (primary first); always includes imageUrl. */
  images?: string[];
  // ── Filter metadata (entered at piece upload; powers Curator) ──
  /** Category (single) — from PRODUCT_CATEGORIES. */
  category?: string;
  /** Style (any-overlap match) — from PRODUCT_STYLES. */
  style?: string[];
  /** @deprecated legacy clothing type — superseded by `category`. */
  type?: string;
  /** Colours (any-overlap match) — from COLOUR_NAMES. */
  colours?: string[];
  /** Occasions (any-overlap match) — from OCCASIONS. */
  occasions?: string[];
  /** Drop date (ISO yyyy-mm-dd); "New in" is computed from it. */
  droppedAt?: string;
  description?: string;
  /** The one italic line on the card. */
  stylistNote?: string;
  /** Derived from the source URL host (e.g. "net-a-porter.com"). */
  sourceSite?: string;
  /** Outbound purchase link — where to buy the piece (retailer product page). */
  buyUrl?: string;
  /** Campaign-only piece (e.g. FIFA jerseys) — hidden from the main Curator grid. */
  campaignOnly?: boolean;
  /** Internal ranking 0–100 — orders the edit; never shown to members. */
  oneTapScore?: number;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
};

/** Display a price ("$4,290", "€1,150"). */
export function formatPrice(price: Price | null | undefined): string {
  if (!price || !Number.isFinite(price.amount)) return "";
  const symbol = CURRENCY_SYMBOL[price.currency] ?? `${price.currency} `;
  const hasCents = Math.round(price.amount * 100) % 100 !== 0;
  return (
    symbol +
    price.amount.toLocaleString("en-US", {
      minimumFractionDigits: hasCents ? 2 : 0,
      maximumFractionDigits: 2,
    })
  );
}

/** Numeric value for sorting. */
export function priceValue(price: Price) {
  return price?.amount || 0;
}

/**
 * "New in" window size (days). The window is anchored to the catalog's most
 * recent drop, NOT "today" — so New In always surfaces the freshest arrivals and
 * never goes empty just because nothing was added in the last calendar week.
 */
export const NEW_IN_WINDOW_DAYS = 7;

/**
 * Cutoff (ms) for "new in": `NEW_IN_WINDOW_DAYS` before the anchor. Pass the
 * catalog's latest `dropped_at` as the anchor; falls back to now when unknown.
 */
export function newInThreshold(latestDroppedAt?: string | null): number {
  const parsed = latestDroppedAt ? Date.parse(latestDroppedAt) : NaN;
  const anchor = Number.isNaN(parsed) ? Date.now() : parsed;
  return anchor - NEW_IN_WINDOW_DAYS * 86_400_000;
}

/** "New in" — dropped on/after the anchored cutoff (computed, never stored). */
export function isNewIn(droppedAt?: string, threshold?: number): boolean {
  if (!droppedAt) return false;
  const t = Date.parse(droppedAt);
  if (Number.isNaN(t)) return false;
  return t >= (threshold ?? newInThreshold());
}

const daysAgo = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

/**
 * Mock luxury catalog (used when Supabase is unconfigured). Enriched with the
 * filter metadata so the Curator filters work in local dev.
 */
export const products: Product[] = [
  {
    id: "the-row-coat",
    mono: "TR",
    brand: "The Row",
    name: "Oversized Wool Coat",
    price: { amount: 4290, currency: "USD" },
    imageUrl:
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=80",
    category: "Outerwear",
    style: ["Quiet Luxury", "Tailored"],
    colours: ["Camel", "Beige"],
    occasions: ["Everyday", "Work"],
    droppedAt: daysAgo(2),
    stylistNote: "The coat the season turns around.",
    oneTapScore: 86,
  },
  {
    id: "celine-blazer",
    mono: "C",
    brand: "Celine",
    name: "Tailored Crepe Blazer",
    price: { amount: 2850, currency: "USD" },
    imageUrl:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80",
    category: "Blazers",
    style: ["Classic", "Tailored"],
    colours: ["Black"],
    occasions: ["Work", "Cocktail"],
    droppedAt: daysAgo(18),
    stylistNote: "Sharp enough to carry the room.",
    oneTapScore: 80,
  },
  {
    id: "khaite-knit",
    mono: "K",
    brand: "Khaite",
    name: "Cashmere Ribbed Knit",
    price: { amount: 1180, currency: "USD" },
    imageUrl:
      "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80",
    category: "Knitwear",
    style: ["Minimal", "Relaxed"],
    colours: ["Ivory", "Beige"],
    occasions: ["Everyday", "Weekend"],
    droppedAt: daysAgo(30),
    oneTapScore: 70,
  },
  {
    id: "bottega-trouser",
    mono: "BV",
    brand: "Bottega Veneta",
    name: "Pleated Wide Trouser",
    price: { amount: 1650, currency: "USD" },
    imageUrl:
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80",
    category: "Trousers",
    style: ["Modern", "Tailored"],
    colours: ["Black"],
    occasions: ["Work", "Everyday"],
    droppedAt: daysAgo(40),
    oneTapScore: 72,
  },
  {
    id: "toteme-shirt",
    mono: "T",
    brand: "Totême",
    name: "Silk Column Shirt",
    price: { amount: 690, currency: "USD" },
    imageUrl:
      "https://images.unsplash.com/photo-1485231183945-fffde7cc051e?auto=format&fit=crop&w=900&q=80",
    category: "Shirts",
    style: ["Minimal", "Classic"],
    colours: ["Ivory", "White"],
    occasions: ["Work", "Resort"],
    droppedAt: daysAgo(5),
    oneTapScore: 66,
  },
  {
    id: "saint-laurent-dress",
    mono: "SL",
    brand: "Saint Laurent",
    name: "Draped Jersey Dress",
    price: { amount: 3490, currency: "USD" },
    imageUrl:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80",
    category: "Dresses",
    style: ["Statement", "Feminine"],
    colours: ["Black"],
    occasions: ["Date Night", "Gala Dinner"],
    droppedAt: daysAgo(1),
    stylistNote: "For the dinner that becomes the night.",
    oneTapScore: 90,
  },
  {
    id: "the-row-trench",
    mono: "TR",
    brand: "The Row",
    name: "Belted Cotton Trench",
    price: { amount: 3950, currency: "USD" },
    imageUrl:
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=80",
    category: "Outerwear",
    style: ["Quiet Luxury", "Classic"],
    colours: ["Camel"],
    occasions: ["Everyday", "Vacation"],
    droppedAt: daysAgo(22),
    oneTapScore: 78,
  },
  {
    id: "celine-skirt",
    mono: "C",
    brand: "Celine",
    name: "Wool Midi Skirt",
    price: { amount: 1250, currency: "USD" },
    imageUrl:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80",
    category: "Skirts",
    style: ["Classic", "Feminine"],
    colours: ["Grey", "Navy"],
    occasions: ["Work", "Everyday"],
    droppedAt: daysAgo(34),
    oneTapScore: 68,
  },
];

export function getProduct(id: string) {
  return products.find((p) => p.id === id);
}

export { priceBracketId, PRICE_BRACKETS } from "@/lib/data/vocab";
