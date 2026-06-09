/**
 * Fixed vocabularies — defined once, reused across Profile, Curator and the
 * Admin add-piece form. Free text in any of these would break the filters, so
 * every form uses these lists as dropdowns/chips. (Brands live in brands.ts.)
 */

/** B — Style (profile taste). */
export const STYLES = [
  "Quiet Luxury",
  "Minimalist",
  "Classic",
  "Chic",
  "Streetwear",
  "Boho",
  "Vintage",
  "Athleisure",
  "Trendy",
] as const;

/** C — Categories she reaches for (profile taste). */
export const CATEGORIES = [
  "Dresses",
  "Tops",
  "Denim",
  "Shoes",
  "Handbags",
  "Activewear",
  "Luxury",
  "Workwear",
  "Vacation Wear",
] as const;

/** D — Goals (what brings her to the atelier). */
export const GOALS = [
  "Try before buying",
  "Discover outfits",
  "Scenes to share on Instagram",
  "Build my wardrobe",
  "Find event outfits",
] as const;

/** E — Mood / aesthetic (Atelier Scenes preference). */
export const MOODS = [
  "Quiet Luxury",
  "Old Money",
  "European Summer",
  "Coastal Chic",
  "Minimalist",
  "Modern Glam",
  "Luxury Resort",
  "Street Style",
] as const;

/** F — Setting / background (Atelier Scenes preference). */
export const SETTINGS = [
  "Paris",
  "New York",
  "Milan",
  "Beach",
  "Rooftop",
  "Luxury Hotel",
  "Café",
  "Fashion Week",
] as const;

/**
 * G — Product Category (single per piece; Curator facet). Replaces the legacy
 * `type`/CLOTHING_TYPES facet.
 */
export const PRODUCT_CATEGORIES = [
  "Dresses",
  "Tops & Blouses",
  "Shirts",
  "Knitwear",
  "Tailoring",
  "Blazers",
  "Trousers",
  "Denim",
  "Skirts",
  "Shorts",
  "Jumpsuits",
  "Outerwear",
  "Co-Ord Sets",
] as const;

/**
 * Legacy clothing types — DEPRECATED, superseded by PRODUCT_CATEGORIES. Kept
 * exported only for back-compat; no longer used by admin or the Curator.
 */
export const CLOTHING_TYPES = ["All Clothing", ...PRODUCT_CATEGORIES] as const;
export const ALL_CLOTHING = "All Clothing";
export const UPLOADABLE_TYPES = PRODUCT_CATEGORIES;

/** Product Style (multi per piece; Curator facet). */
export const PRODUCT_STYLES = [
  "Quiet Luxury",
  "Minimal",
  "Classic",
  "Tailored",
  "Relaxed",
  "Romantic",
  "Feminine",
  "Modern",
  "Sculptural",
  "Statement",
] as const;

/** H — Colours, with swatch hex (Multi-Color has no single hex). */
export interface Colour {
  name: string;
  hex: string | null;
}
export const COLOURS: Colour[] = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Ivory", hex: "#F4EFE6" },
  { name: "Cream", hex: "#F3EAD8" },
  { name: "Beige", hex: "#D9CBB3" },
  { name: "Camel", hex: "#C19A6B" },
  { name: "Brown", hex: "#6B4F3A" },
  { name: "Grey", hex: "#9A9A9A" },
  { name: "Navy", hex: "#1F2A44" },
  { name: "Burgundy", hex: "#5E1F2A" },
  { name: "Olive", hex: "#6B6A3A" },
  { name: "Green", hex: "#5A6B4F" },
  { name: "Blue", hex: "#4F6D9A" },
  { name: "Red", hex: "#9B2D2D" },
  { name: "Pink", hex: "#E8B4C0" },
  { name: "Yellow", hex: "#D9C26A" },
  { name: "Metallic", hex: "#BFC1C2" },
  { name: "Multi-Color", hex: null },
];
export const COLOUR_NAMES = COLOURS.map((c) => c.name);

/** I — Occasions (piece tag + Curator facet). */
export const OCCASIONS = [
  "Everyday",
  "Work",
  "Weekend",
  "Date Night",
  "Cocktail",
  "Party Wear",
  "Wedding Guest",
  "Gala Dinner",
  "Black Tie",
  "Vacation",
  "Resort",
  "Fashion Week",
  "Special Occasion",
] as const;

/** Price brackets (USD-comparable amounts). Ranges are [min, max); last open. */
export interface PriceBracket {
  id: string;
  label: string;
  min: number;
  max: number;
}
export const PRICE_BRACKETS: PriceBracket[] = [
  { id: "u500", label: "Under $500", min: 0, max: 500 },
  { id: "500-1000", label: "$500–$1,000", min: 500, max: 1000 },
  { id: "1000-2500", label: "$1,000–$2,500", min: 1000, max: 2500 },
  { id: "2500-5000", label: "$2,500–$5,000", min: 2500, max: 5000 },
  { id: "5000-10000", label: "$5,000–$10,000", min: 5000, max: 10000 },
  { id: "10000+", label: "$10,000+", min: 10000, max: Infinity },
];

/** The bracket id an amount falls into (or null if non-positive). */
export function priceBracketId(amount: number | null | undefined): string | null {
  if (!amount || amount <= 0) return null;
  return PRICE_BRACKETS.find((b) => amount >= b.min && amount < b.max)?.id ?? null;
}

/** Currencies accepted for a piece's price. */
export const CURRENCIES = ["USD", "EUR", "GBP", "INR"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Height options for the Profile (4′8″–6′4″), value stored as total inches. */
export interface HeightOption {
  inches: number;
  label: string;
}
export const HEIGHTS: HeightOption[] = Array.from({ length: 6 * 4 + 4 - 8 + 1 }).map(
  (_, i) => {
    const inches = 56 + i; // 4'8" = 56in … 6'4" = 76in
    const ft = Math.floor(inches / 12);
    const inch = inches % 12;
    const cm = Math.round(inches * 2.54);
    return { inches, label: `${ft}′${inch}″ — ${cm} cm` };
  },
);

export function heightLabel(inches: number | null | undefined): string {
  if (!inches) return "";
  return HEIGHTS.find((h) => h.inches === inches)?.label ?? `${inches} in`;
}
