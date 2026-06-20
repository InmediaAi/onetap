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
    // Garment reference views (front/back/detail). The first image is the
    // person; every image after it is a view of the SAME garment.
    const garmentSrcs = input.productImages?.length ? input.productImages : [input.productImage];
    const base =
      "The first image is the person. Every image after it is a reference view of the SAME garment " +
      "(front/back/detail). Place that garment onto the person, using all the references together to " +
      "reproduce its exact cut, colour, pattern and details, and preserving the person's face, hair, " +
      "body and proportions. Produce a single photorealistic image.";
    const prompt = input.prompt?.trim() ? `${base} ${input.prompt.trim()}` : base;
    const size = process.env.OPENAI_IMAGE_SIZE || "1024x1536";
    const quality = process.env.OPENAI_IMAGE_QUALITY || "auto";

    const [person, ...garments] = await Promise.all([
      toImageBlob(input.userImage, "person image"),
      ...garmentSrcs.map((s, i) => toImageBlob(s, `garment image ${i + 1}`)),
    ]);

    const form = new FormData();
    form.append("model", this.model);
    form.append("prompt", prompt);
    form.append("size", size);
    form.append("quality", quality);
    form.append("n", "1");
    // Reference images go under `image[]` — person first, then every garment view.
    form.append("image[]", person, "person.png");
    garments.forEach((g, i) => form.append("image[]", g, `garment-${i + 1}.png`));

    logApiRequest("openai:image", "POST", EDITS_URL, {
      model: this.model,
      size,
      quality,
      prompt,
      person: summarizeImage(input.userImage),
      garments: garmentSrcs.length,
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
