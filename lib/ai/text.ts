import "server-only";

/**
 * Text drafting via the Anthropic (Claude) Messages API — used by the SEO content
 * pipeline to draft guides grounded on REAL catalog data. Env-gated: with no
 * ANTHROPIC_API_KEY the pipeline no-ops and guides are authored manually in admin.
 */

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_TEXT_MODEL || "claude-sonnet-5";

export function isTextAiConfigured(): boolean {
  return Boolean(API_KEY);
}

export interface CatalogContext {
  /** Real pieces to ground the copy (so examples/prices are first-hand). */
  pieces: { brand: string; name: string; price?: string; href: string }[];
  brands: string[];
  occasion?: string;
  category?: string;
}

export interface DraftedGuide {
  title: string;
  slug: string;
  metaDescription: string;
  answer: string;
  bodyMd: string;
  faq: { q: string; a: string }[];
  relatedBrands: string[];
  relatedOccasions: string[];
}

const SYSTEM = `You are a senior fashion editor and SEO/GEO specialist for OneTap Atelier, a curated luxury virtual try-on membership ("see it on yourself before you buy"). You write authoritative, non-thin editorial guides that rank on Google and get cited by AI answer engines.

Rules:
- Open the body with a DIRECT ANSWER to the query in the first 1-2 sentences.
- Use clean markdown: ## / ### headings, short paragraphs, and bullet lists.
- Ground the piece in the REAL catalog pieces provided (mention specific brands; you may reference example pieces). Never invent prices.
- Add internal markdown links to relevant pages: brand pages like [Brand](/brands/brand-slug), the curator [/curator], occasion pages [/occasions/wedding-guest], category pages [/shop/dresses]. Use lowercase, hyphenated slugs.
- Weave in the OneTap angle: readers can try each piece on themselves before buying.
- British-leaning, refined, concrete. No fluff, no emojis, no fabricated statistics.
- Output STRICT JSON only (no prose, no code fences) matching the requested schema.`;

function buildPrompt(topic: string, ctx: CatalogContext): string {
  const pieceLines = ctx.pieces
    .slice(0, 25)
    .map((p) => `- ${p.brand} — ${p.name}${p.price ? ` (${p.price})` : ""} [${p.href}]`)
    .join("\n");
  return `Topic / target query: "${topic}"
${ctx.occasion ? `Occasion: ${ctx.occasion}\n` : ""}${ctx.category ? `Category: ${ctx.category}\n` : ""}
Real catalog pieces to ground the guide (use several, link brands):
${pieceLines || "(none — write from expertise, still link relevant brand/occasion/category pages)"}

Brands available: ${ctx.brands.slice(0, 40).join(", ")}

Return STRICT JSON with exactly these keys:
{
  "title": "H1, compelling, includes the query intent",
  "slug": "lowercase-hyphenated-url-slug",
  "metaDescription": "~155 chars, includes the query, benefit-led",
  "answer": "1-2 sentence direct answer (the GEO lead paragraph)",
  "bodyMd": "the full markdown article (600-1100 words) with ## headings, lists and internal links",
  "faq": [{"q": "question", "a": "concise answer"}, ...3-5 items],
  "relatedBrands": ["Brand A", "Brand B"],
  "relatedOccasions": ["Wedding Guest"]
}`;
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON in model output");
  return JSON.parse(raw.slice(start, end + 1));
}

/** Draft a guide for a topic. Throws when unconfigured or on API error. */
export async function draftGuide(topic: string, ctx: CatalogContext): Promise<DraftedGuide> {
  if (!API_KEY) throw new Error("ANTHROPIC_API_KEY not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [{ role: "user", content: buildPrompt(topic, ctx) }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? []).map((b) => b.text ?? "").join("");
  const g = extractJson(text) as Partial<DraftedGuide>;
  if (!g.title || !g.bodyMd) throw new Error("Model output missing title/body");
  return {
    title: String(g.title),
    slug: String(g.slug || g.title),
    metaDescription: String(g.metaDescription || ""),
    answer: String(g.answer || ""),
    bodyMd: String(g.bodyMd),
    faq: Array.isArray(g.faq)
      ? g.faq
          .map((f) => ({ q: String(f?.q || ""), a: String(f?.a || "") }))
          .filter((f) => f.q && f.a)
      : [],
    relatedBrands: Array.isArray(g.relatedBrands) ? g.relatedBrands.map(String) : [],
    relatedOccasions: Array.isArray(g.relatedOccasions) ? g.relatedOccasions.map(String) : [],
  };
}
