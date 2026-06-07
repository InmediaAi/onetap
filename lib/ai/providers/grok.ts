import { sleep } from "@/lib/utils";
import {
  logApiRequest,
  logApiResponse,
  logApiNote,
  summarizeImage,
} from "@/lib/ai/debug";
import { SPIN_PROMPT, FILM_PROMPT } from "@/lib/ai/prompts";
import type {
  TryOnProvider,
  TryOnInput,
  TryOnResult,
  VideoProvider,
  VideoInput,
  VideoResult,
  IdentityProvider,
  ModelSheetInput,
  ModelSheetResult,
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
const XAI_VIDEO_URL = "https://api.x.ai/v1/videos/generations";
const VIDEO_POLL_INTERVAL_MS = 4000;
const VIDEO_MAX_POLLS = 75; // ~5 min ceiling

export class GrokProvider implements TryOnProvider {
  readonly name = "grok";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "grok-2-image") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateTryOn(input: TryOnInput): Promise<TryOnResult> {
    const prompt =
      input.prompt?.trim() ||
      [
        "Editorial luxury fashion photograph, quiet-luxury aesthetic.",
        "A model wearing the referenced garment, full-length studio shot,",
        "soft neutral background, natural light, high-end magazine styling.",
        `Reference product: ${input.productImage}.`,
      ].join(" ");
    logApiRequest("grok:tryon", "POST", XAI_URL, { model: this.model, prompt });

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
    return { imageUrl, provider: this.name, prompt, model: this.model };
  }
}

/**
 * GrokIdentityProvider — composes the derived multi-angle "model sheet" from the
 * user's uploaded photos. Same caveat as GrokProvider: a true reference-driven
 * composite needs an image-conditioned model; this implements the contract +
 * prompt scaffolding so it can be swapped for one without touching callers.
 * Requires XAI_API_KEY.
 */
export class GrokIdentityProvider implements IdentityProvider {
  readonly name = "grok";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "grok-2-image") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async composeModelSheet(input: ModelSheetInput): Promise<ModelSheetResult> {
    const prompt = [
      "Editorial fashion model sheet, quiet-luxury studio aesthetic.",
      "One consistent person shown from multiple angles in a single image:",
      "full-length front, three-quarter, side profile, and a beauty close-up.",
      "Soft neutral seamless background, even natural light, true-to-life likeness.",
      input.prompt?.trim() ? input.prompt.trim() : "",
      `Reference photos: ${input.images.join(", ")}.`,
    ]
      .filter(Boolean)
      .join(" ");

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
      throw new Error(`Grok model-sheet failed (${res.status}): ${detail}`);
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
    return { imageUrl, provider: this.name, prompt, model: this.model };
  }
}

/**
 * GrokVideoProvider — xAI Grok image-to-video (POST /v1/videos/generations).
 * Animates the composed try-on image into a 360° turn or a film. Async: submit
 * → poll /v1/videos/{request_id} until `done`. Requires XAI_API_KEY.
 *
 * Output defaults: 9:16 vertical, 480p, 5s — all env-overridable
 * (VIDEO_ASPECT / VIDEO_RESOLUTION / VIDEO_DURATION).
 */
export class GrokVideoProvider implements VideoProvider {
  readonly name = "grok";
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model = "grok-imagine-video") {
    this.apiKey = apiKey;
    this.model = model;
  }

  private async run(prompt: string, image: string): Promise<VideoResult> {
    const duration = Number(process.env.VIDEO_DURATION) || 5;
    const aspect_ratio = process.env.VIDEO_ASPECT || "9:16";
    const resolution = process.env.VIDEO_RESOLUTION || "480p";

    const body = {
      model: this.model,
      prompt,
      image: { url: image },
      duration,
      aspect_ratio,
      resolution,
    };
    logApiRequest("grok:video", "POST", XAI_VIDEO_URL, {
      ...body,
      image: { url: summarizeImage(image) },
    });

    const submit = await fetch(XAI_VIDEO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!submit.ok) {
      const detail = await submit.text().catch(() => "");
      logApiResponse("grok:video", `submit ${submit.status}`, detail);
      throw new Error(`Grok video submit failed (${submit.status}): ${detail}`);
    }

    const submitData = (await submit.json()) as { request_id?: string };
    logApiResponse("grok:video", `submit ${submit.status}`, submitData);
    const requestId = submitData.request_id;
    if (!requestId) throw new Error("Grok returned no request_id");

    for (let i = 0; i < VIDEO_MAX_POLLS; i++) {
      await sleep(VIDEO_POLL_INTERVAL_MS);
      const poll = await fetch(`https://api.x.ai/v1/videos/${requestId}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!poll.ok) continue;

      const pollData = (await poll.json()) as {
        status?: string;
        video?: { url?: string };
      };
      const status = pollData.status;
      logApiNote("grok:video", `poll ${i + 1} status=${status}`);
      if (status === "done") {
        logApiResponse("grok:video", "result", pollData);
        const videoUrl = pollData.video?.url;
        if (!videoUrl) throw new Error("Grok video done but returned no URL");
        return { videoUrl, provider: this.name, prompt, model: this.model };
      }
      if (status === "failed" || status === "expired") {
        logApiResponse("grok:video", "result", pollData);
        throw new Error(`Grok video ${status}`);
      }
    }

    throw new Error("Grok video task timed out");
  }

  generate360(input: VideoInput): Promise<VideoResult> {
    return this.run(input.prompt?.trim() || SPIN_PROMPT, input.image);
  }

  generateVideo(input: VideoInput): Promise<VideoResult> {
    return this.run(input.prompt?.trim() || FILM_PROMPT, input.image);
  }
}
