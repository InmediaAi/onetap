import { logApiRequest, logApiResponse, logApiNote, summarizeImage } from "@/lib/ai/debug";
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
    // Garment reference views (front/back/detail). The first image is the
    // person; every image after it is a view of the SAME garment.
    const garmentSrcs = input.productImages?.length ? input.productImages : [input.productImage];
    const base =
      "The first image is the person. Every image after it is a reference view of the SAME garment " +
      "(front/back/detail). Place that garment onto the person, using all the references together to " +
      "reproduce its exact cut, colour, pattern and details, and preserving the person's face, hair, " +
      "body and proportions. Produce a single photorealistic image.";
    const prompt = input.prompt?.trim() ? `${base} ${input.prompt.trim()}` : base;

    const [person, ...garments] = await Promise.all([
      toInlineImage(input.userImage, "person image"),
      ...garmentSrcs.map((s, i) => toInlineImage(s, `garment image ${i + 1}`)),
    ]);

    // Optional aspect/size control. The docs show string values, but some
    // v1beta deployments reject them (enum mismatch) — so if the API 400s on
    // these fields we transparently retry WITHOUT them rather than fail.
    const aspect = process.env.GEMINI_IMAGE_ASPECT;
    const size = process.env.GEMINI_IMAGE_SIZE;
    const responseFormat =
      aspect || size
        ? { image: { ...(aspect ? { aspectRatio: aspect } : {}), ...(size ? { imageSize: size } : {}) } }
        : null;

    const baseUrl = process.env.GEMINI_BASE_URL || DEFAULT_BASE;
    const url = `${baseUrl}/models/${this.model}:generateContent`;
    const parts = [
      { text: prompt },
      { inline_data: { mime_type: person.mime, data: person.data } },
      ...garments.map((g) => ({ inline_data: { mime_type: g.mime, data: g.data } })),
    ];

    const attempt = async (withFormat: boolean) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const generationConfig: Record<string, any> = { responseModalities: ["TEXT", "IMAGE"] };
      if (withFormat && responseFormat) generationConfig.responseFormat = responseFormat;
      logApiRequest("gemini:image", "POST", url, {
        model: this.model,
        prompt,
        generationConfig,
        person: summarizeImage(input.userImage),
        garments: garmentSrcs.length,
      });
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify({ contents: [{ parts }], generationConfig }),
      });
      return { ok: res.ok, status: res.status, text: await res.text() };
    };

    let r = await attempt(Boolean(responseFormat));
    if (
      !r.ok &&
      responseFormat &&
      r.status === 400 &&
      /response_format|aspect_ratio|image_size/i.test(r.text)
    ) {
      logApiNote("gemini:image", "aspect/size rejected by API — retrying without responseFormat");
      r = await attempt(false);
    }
    if (!r.ok) {
      logApiResponse("gemini:image", `edit ${r.status}`, r.text);
      throw new Error(`Gemini image failed (${r.status}): ${r.text.slice(0, 300)}`);
    }

    let data: unknown;
    try {
      data = JSON.parse(r.text);
    } catch {
      throw new Error("Gemini returned a non-JSON response.");
    }
    const img = firstImagePart(data);
    logApiResponse("gemini:image", `edit ${r.status}`, { gotImage: Boolean(img) });
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
