import type {
  TryOnProvider,
  TryOnInput,
  TryOnResult,
} from "@/lib/ai/types";

/**
 * GrokProvider — xAI image generation (https://docs.x.ai).
 *
 * NOTE: xAI's public image endpoint is text-conditioned generation. True
 * garment-on-person try-on needs an image-conditioned model; this implements
 * the contract and prompt scaffolding so it can be upgraded to an edit/compose
 * model without touching callers. Requires XAI_API_KEY.
 */

const XAI_URL = "https://api.x.ai/v1/images/generations";

export class GrokProvider implements TryOnProvider {
  readonly name = "grok";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "grok-2-image") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateTryOn(input: TryOnInput): Promise<TryOnResult> {
    const prompt = [
      "Editorial luxury fashion photograph, quiet-luxury aesthetic.",
      "A model wearing the referenced garment, full-length studio shot,",
      "soft neutral background, natural light, high-end magazine styling.",
      `Reference product: ${input.productImage}.`,
    ].join(" ");

    const res = await fetch(XAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        n: 1,
        response_format: "url",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Grok generation failed (${res.status}): ${detail}`);
    }

    const data = (await res.json()) as {
      data?: Array<{ url?: string; b64_json?: string }>;
    };
    const first = data.data?.[0];
    const imageUrl = first?.url
      ? first.url
      : first?.b64_json
        ? `data:image/png;base64,${first.b64_json}`
        : "";

    if (!imageUrl) throw new Error("Grok returned no image");
    return { imageUrl, provider: this.name };
  }
}
