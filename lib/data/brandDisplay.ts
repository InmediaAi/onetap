import { kebab } from "@/lib/supabase/util";

/**
 * Human display name for a brand.
 *
 * The live catalog stores brand spellings inconsistently — some ALL-CAPS
 * ("VERSACE", "BOTTEGA VENETA"), some already proper ("Saint Laurent", "The
 * Row"). For prose surfaces (llms.txt) we want a clean display form without the
 * shouting. We only normalise when the stored name has NO lowercase letter (it
 * is shouting); already-correct names are returned untouched. A tiny override
 * map restores forms that can't be derived from the stored spelling (lost
 * accents, irregular internal caps).
 */

// Keyed by slug (kebab of the stored name) so it matches whatever casing the
// catalog holds.
const OVERRIDES: Record<string, string> = {
  toteme: "Totême",
  "stella-mccartney": "Stella McCartney",
};

// Lowercased connective words that stay lowercase mid-name ("Oscar de la Renta").
const CONNECTORS = new Set([
  "de", "la", "le", "du", "des", "di", "da", "van", "von", "der", "of", "and",
]);

function titleCaseToken(word: string, first: boolean): string {
  if (!word) return word;
  const lower = word.toLowerCase();
  if (!first && CONNECTORS.has(lower)) return lower;
  // Mc/Mac → capitalise the following letter too ("McCartney").
  if (/^mc[a-zà-ÿ]/.test(lower)) {
    return "Mc" + lower.charAt(2).toUpperCase() + lower.slice(3);
  }
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function brandDisplayName(name: string): string {
  const override = OVERRIDES[kebab(name)];
  if (override) return override;

  const trimmed = name.trim();
  // Has proper casing already (any ASCII lowercase letter) → leave it be.
  if (/[a-z]/.test(trimmed)) return trimmed;

  return trimmed
    .split(/\s+/)
    .map((w, i) => titleCaseToken(w, i === 0))
    .join(" ");
}
