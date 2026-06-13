import { logApiRequest, logApiResponse, summarizeImage } from "@/lib/ai/debug";
import type { TryOnProvider, TryOnInput, TryOnResult } from "@/lib/ai/types";

/**
 * OpenAIImageProvider — GPT-Image (Images Edit) scene composition.
 *
 * Unlike Kling Virtual Try-On (image+image→image, NO prompt), GPT-Image accepts
 * multiple reference images + a text prompt and returns a composed image. We
 * pass the person photo + the jersey + the moment's image prompt, and the model
 * places the jersey on the person within the prompted scene. Synchronous (no
 * polling); returns base64. Requires OPENAI_API_KEY. Model default: gpt-image-2.
 *
 * Note: gpt-image-2 does NOT accept `input_fidelity` (it always processes
 * reference images at high fidelity). `size` must have both dims divisible by
 * 16 with an aspect ratio between 1:3 and 3:1.
 */

const EDITS_URL = "https://api.openai.com/v1/images/edits";

/** Resolve a data/hosted URL to a Blob with a sane image content-type. */
async function toImageBlob(src: string, label: string): Promise<Blob> {
  if (src.startsWith("data:")) {
    const comma = src.indexOf(",");
    const meta = comma >= 0 ? src.slice(5, comma) : "image/png";
    const type = meta.split(";")[0] || "image/png";
    const payload = comma >= 0 ? src.slice(comma + 1) : "";
    const bytes = meta.includes("base64")
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload));
    return new Blob([bytes], { type });
  }
  let res: Response;
  try {
    res = await fetch(src);
  } catch (e) {
    throw new Error(`could not download ${label} (${e instanceof Error ? e.message : "fetch error"})`);
  }
  if (!res.ok) throw new Error(`could not download ${label} (HTTP ${res.status})`);
  const ct = res.headers.get("content-type") || "";
  const type = ct.startsWith("image/") ? ct : "image/png";
  const buf = Buffer.from(await res.arrayBuffer());
  return new Blob([buf], { type });
}

export class OpenAIImageProvider implements TryOnProvider {
  readonly name = "gpt-image";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gpt-image-2") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateTryOn(input: TryOnInput): Promise<TryOnResult> {
    // Anchor the two reference images, then layer the admin scene prompt.
    const base =
      "Place the apparel/jersey shown in the second image onto the person in the first image, " +
      "preserving the person's face, hair, body and proportions. Produce a single photorealistic image.";
    const prompt = input.prompt?.trim() ? `${base} ${input.prompt.trim()}` : base;
    const size = process.env.OPENAI_IMAGE_SIZE || "1024x1536";
    const quality = process.env.OPENAI_IMAGE_QUALITY || "auto";

    const [person, garment] = await Promise.all([
      toImageBlob(input.userImage, "person image"),
      toImageBlob(input.productImage, "garment image"),
    ]);

    const form = new FormData();
    form.append("model", this.model);
    form.append("prompt", prompt);
    form.append("size", size);
    form.append("quality", quality);
    form.append("n", "1");
    // Multiple reference images go under `image[]` (person first, garment second).
    form.append("image[]", person, "person.png");
    form.append("image[]", garment, "garment.png");

    logApiRequest("openai:image", "POST", EDITS_URL, {
      model: this.model,
      size,
      quality,
      prompt,
      person: summarizeImage(input.userImage),
      garment: summarizeImage(input.productImage),
    });

    const res = await fetch(EDITS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}` }, // don't set Content-Type — FormData sets the boundary
      body: form,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logApiResponse("openai:image", `edit ${res.status}`, detail);
      throw new Error(`GPT-Image edit failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    logApiResponse("openai:image", `edit ${res.status}`, { count: data.data?.length ?? 0 });
    const first = data.data?.[0];
    const imageUrl = first?.b64_json ? `data:image/png;base64,${first.b64_json}` : first?.url;
    if (!imageUrl) throw new Error("GPT-Image returned no image");
    return { imageUrl, provider: this.name, model: this.model, prompt };
  }
}
