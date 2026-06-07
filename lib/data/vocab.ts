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
 * G — Clothing types. "All Clothing" is filter-only (clears the facet); the
 * other 18 are the uploadable types for a piece.
 */
export const CLOTHING_TYPES = [
  "All Clothing",
  "Dresses",
  "Swimwear",
  "Tops",
  "Blouses",
  "Tanks & Camis",
  "Matching Sets",
  "Knitwear",
  "Jeans",
  "Skirts",
  "Shorts",
  "Pants",
  "Coats & Jackets",
  "Blazers",
  "Suits",
  "Sport",
  "Loungewear",
  "Sleepwear",
  "Lingerie",
] as const;

export const ALL_CLOTHING = "All Clothing";
/** The 18 types an admin can tag a piece with (G minus "All Clothing"). */
export const UPLOADABLE_TYPES = CLOTHING_TYPES.filter((t) => t !== ALL_CLOTHING);

/** H — Colours, with swatch hex ("Print" has no single hex). */
export interface Colour {
  name: string;
  hex: string | null;
}
export const COLOURS: Colour[] = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Ivory", hex: "#F4EFE6" },
  { name: "Camel", hex: "#C19A6B" },
  { name: "Beige", hex: "#D9CBB3" },
  { name: "Grey", hex: "#9A9A9A" },
  { name: "Navy", hex: "#1F2A44" },
  { name: "Blue", hex: "#4F6D9A" },
  { name: "Burgundy", hex: "#5E1F2A" },
  { name: "Pink", hex: "#E8B4C0" },
  { name: "Green", hex: "#5A6B4F" },
  { name: "Print", hex: null },
];
export const COLOUR_NAMES = COLOURS.map((c) => c.name);

/** I — Occasions (piece tag + Curator facet). Vacation/Work feed quick chips. */
export const OCCASIONS = [
  "Evening",
  "Daytime",
  "Work",
  "Travel",
  "Vacation",
  "Event",
] as const;

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
