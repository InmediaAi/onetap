import { logApiRequest, logApiResponse, summarizeImage } from "@/lib/ai/debug";
import type { TryOnProvider, TryOnInput, TryOnResult } from "@/lib/ai/types";

/**
 * GeminiImageProvider — Google Gemini ("Nano Banana") image editing.
 *
 * Like GPT-Image (and unlike Kling try-on), Gemini accepts multiple inline
 * reference images + a text prompt and returns a composed image. We pass the
 * person photo + the jersey + the moment's image prompt; the model places the
 * jersey on the person within the prompted scene. Synchronous; returns inline
 * base64. Requires GEMINI_API_KEY. Default model: gemini-3.1-flash-image (fast);
 * switch to gemini-3-pro-image via GEMINI_IMAGE_MODEL.
 *
 * REST: POST {base}/models/{model}:generateContent, header x-goog-api-key.
 */

const DEFAULT_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** Resolve a data/hosted URL to bare base64 + mime type for Gemini inline_data. */
async function toInlineImage(src: string, label: string): Promise<{ data: string; mime: string }> {
  if (src.startsWith("data:")) {
    const comma = src.indexOf(",");
    const meta = comma >= 0 ? src.slice(5, comma) : "image/png";
    const mime = meta.split(";")[0] || "image/png";
    const payload = comma >= 0 ? src.slice(comma + 1) : "";
    const data = meta.includes("base64")
      ? payload
      : Buffer.from(decodeURIComponent(payload)).toString("base64");
    return { data, mime };
  }
  let res: Response;
  try {
    res = await fetch(src);
  } catch (e) {
    throw new Error(`could not download ${label} (${e instanceof Error ? e.message : "fetch error"})`);
  }
  if (!res.ok) throw new Error(`could not download ${label} (HTTP ${res.status})`);
  const ct = res.headers.get("content-type") || "";
  const mime = ct.startsWith("image/") ? ct.split(";")[0] : "image/png";
  const data = Buffer.from(await res.arrayBuffer()).toString("base64");
  return { data, mime };
}

/** Pull the first inline image part out of a generateContent response. */
function firstImagePart(
  data: unknown,
): { data: string; mime: string } | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parts: any[] = (data as any)?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inline = p?.inline_data ?? p?.inlineData;
    if (inline?.data) return { data: inline.data, mime: inline.mime_type ?? inline.mimeType ?? "image/png" };
  }
  return null;
}

export class GeminiImageProvider implements TryOnProvider {
  readonly name = "gemini";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "gemini-3.1-flash-image") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateTryOn(input: TryOnInput): Promise<TryOnResult> {
    const base =
      "Place the apparel/jersey shown in the second image onto the person in the first image, " +
      "preserving the person's face, hair, body and proportions. Produce a single photorealistic image.";
    const prompt = input.prompt?.trim() ? `${base} ${input.prompt.trim()}` : base;

    const [person, garment] = await Promise.all([
      toInlineImage(input.userImage, "person image"),
      toInlineImage(input.productImage, "garment image"),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const generationConfig: Record<string, any> = { responseModalities: ["TEXT", "IMAGE"] };
    // Optional aspect/size control — only sent when explicitly configured, so
    // the default call stays robust against API field-name changes.
    const aspect = process.env.GEMINI_IMAGE_ASPECT;
    const size = process.env.GEMINI_IMAGE_SIZE;
    if (aspect || size) {
      generationConfig.responseFormat = {
        image: { ...(aspect ? { aspectRatio: aspect } : {}), ...(size ? { imageSize: size } : {}) },
      };
    }

    const body = {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: person.mime, data: person.data } },
            { inline_data: { mime_type: garment.mime, data: garment.data } },
          ],
        },
      ],
      generationConfig,
    };

    const baseUrl = process.env.GEMINI_BASE_URL || DEFAULT_BASE;
    const url = `${baseUrl}/models/${this.model}:generateContent`;
    logApiRequest("gemini:image", "POST", url, {
      model: this.model,
      prompt,
      generationConfig,
      person: summarizeImage(input.userImage),
      garment: summarizeImage(input.productImage),
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      logApiResponse("gemini:image", `edit ${res.status}`, detail);
      throw new Error(`Gemini image failed (${res.status}): ${detail.slice(0, 300)}`);
    }

    const data = (await res.json()) as unknown;
    const img = firstImagePart(data);
    logApiResponse("gemini:image", `edit ${res.status}`, { gotImage: Boolean(img) });
    if (!img) {
      // No image part — usually a safety block or text-only response.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = data as any;
      const reason =
        d?.candidates?.[0]?.finishReason ||
        d?.promptFeedback?.blockReason ||
        d?.candidates?.[0]?.content?.parts?.find((p: { text?: string }) => p?.text)?.text ||
        "no image returned";
      throw new Error(`Gemini returned no image (${String(reason).slice(0, 200)})`);
    }
    return {
      imageUrl: `data:${img.mime};base64,${img.data}`,
      provider: this.name,
      model: this.model,
      prompt,
    };
  }
}
