import crypto from "node:crypto";
import { sleep } from "@/lib/utils";
import {
  logApiRequest,
  logApiResponse,
  logApiNote,
  summarizeImage,
} from "@/lib/ai/debug";
import { SPIN_PROMPT, FILM_PROMPT } from "@/lib/ai/prompts";
import type {
  VideoProvider,
  VideoInput,
  VideoResult,
  TryOnProvider,
  TryOnInput,
  TryOnResult,
} from "@/lib/ai/types";

/**
 * KlingProvider — Kling image→video (https://app.klingai.com).
 *
 * Kling authenticates with a short-lived JWT (HS256) signed from an access key
 * + secret. Video generation is async: submit a task, then poll until it
 * completes. Requires KLING_ACCESS_KEY and KLING_SECRET_KEY.
 */

const BASE = process.env.KLING_BASE_URL || "https://api.klingai.com";
const SUBMIT_PATH = "/v1/videos/image2video";
const TRYON_PATH = "/v1/images/kolors-virtual-try-on";
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 60; // ~4 min ceiling

/**
 * Resolve any image input to BARE base64 for Kling. Kling's own image-fetcher
 * is unreliable with redirects, http URLs, signed/tokenized URLs, and
 * extension-less paths ("…/body?token=…") — so we download server-side and send
 * the bytes directly (Kling accepts base64 without the `data:` prefix).
 */
async function toKlingImage(src: string, label: string): Promise<string> {
  if (src.startsWith("data:")) {
    const comma = src.indexOf(",");
    return comma >= 0 ? src.slice(comma + 1) : src;
  }
  let res: Response;
  try {
    res = await fetch(src); // Node fetch follows http→https redirects
  } catch (e) {
    throw new Error(`could not download ${label} (${e instanceof Error ? e.message : "fetch error"})`);
  }
  if (!res.ok) throw new Error(`could not download ${label} (HTTP ${res.status})`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/** Sign a short-lived HS256 JWT per Kling's auth scheme. */
function signJwt(accessKey: string, secretKey: string): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url(
    JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 }),
  );
  const signature = base64url(
    crypto.createHmac("sha256", secretKey).update(`${header}.${payload}`).digest(),
  );
  return `${header}.${payload}.${signature}`;
}

export class KlingProvider implements VideoProvider {
  readonly name = "kling";
  private accessKey: string;
  private secretKey: string;
  private model: string;

  constructor(accessKey: string, secretKey: string, model = "kling-v1") {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.model = model;
  }

  private get authHeader() {
    return `Bearer ${signJwt(this.accessKey, this.secretKey)}`;
  }

  private async run(prompt: string, image: string): Promise<VideoResult> {
    const body = {
      model_name: this.model,
      image,
      prompt,
      mode: "std",
      duration: "5",
    };
    const url = `${BASE}${SUBMIT_PATH}`;
    logApiRequest("kling:video", "POST", url, { ...body, image: summarizeImage(image) });

    const submit = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!submit.ok) {
      const detail = await submit.text().catch(() => "");
      logApiResponse("kling:video", `submit ${submit.status}`, detail);
      throw new Error(`Kling submit failed (${submit.status}): ${detail}`);
    }

    const submitData = (await submit.json()) as {
      data?: { task_id?: string };
    };
    logApiResponse("kling:video", `submit ${submit.status}`, submitData);
    const taskId = submitData.data?.task_id;
    if (!taskId) throw new Error("Kling returned no task_id");

    // Poll until the task succeeds.
    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_INTERVAL_MS);
      const poll = await fetch(`${url}/${taskId}`, {
        headers: { Authorization: this.authHeader },
      });
      if (!poll.ok) continue;

      const pollData = (await poll.json()) as {
        data?: {
          task_status?: string;
          task_result?: { videos?: Array<{ url?: string }> };
        };
      };
      const status = pollData.data?.task_status;
      logApiNote("kling:video", `poll ${i + 1} status=${status}`);
      if (status === "succeed") {
        logApiResponse("kling:video", "result", pollData);
        const videoUrl = pollData.data?.task_result?.videos?.[0]?.url;
        if (!videoUrl) throw new Error("Kling succeeded but returned no video URL");
        return { videoUrl, provider: this.name, prompt, model: this.model };
      }
      if (status === "failed" || status === "fail") {
        logApiResponse("kling:video", "result", pollData);
        throw new Error("Kling task failed");
      }
    }

    throw new Error("Kling task timed out");
  }

  generate360(input: VideoInput): Promise<VideoResult> {
    return this.run(input.prompt?.trim() || SPIN_PROMPT, input.image);
  }

  generateVideo(input: VideoInput): Promise<VideoResult> {
    return this.run(input.prompt?.trim() || FILM_PROMPT, input.image);
  }
}

/**
 * KlingTryOnProvider — Kling Kolors Virtual Try-On (image + image → image).
 * Composes the garment (cloth_image) onto the user's photo (human_image).
 * Same JWT auth + submit→poll shape as KlingProvider. Requires KLING_ACCESS_KEY
 * and KLING_SECRET_KEY.
 */
export class KlingTryOnProvider implements TryOnProvider {
  readonly name = "kling";
  private accessKey: string;
  private secretKey: string;
  private model: string;

  constructor(accessKey: string, secretKey: string, model = "kolors-virtual-try-on-v1-5") {
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.model = model;
  }

  private get authHeader() {
    return `Bearer ${signJwt(this.accessKey, this.secretKey)}`;
  }

  async generateTryOn(input: TryOnInput): Promise<TryOnResult> {
    const url = `${BASE}${TRYON_PATH}`;

    // Download both images server-side and send as base64 (see toKlingImage).
    const [human_image, cloth_image] = await Promise.all([
      toKlingImage(input.userImage, "human image"),
      toKlingImage(input.productImage, "cloth image"),
    ]);

    // Kling Virtual Try-On is pure image-to-image — no prompt. Log the SOURCES
    // (not the base64) plus the encoded sizes actually sent.
    logApiRequest("kling:tryon", "POST", url, {
      model_name: this.model,
      human_image: `base64 ${human_image.length} chars ← ${summarizeImage(input.userImage)}`,
      cloth_image: `base64 ${cloth_image.length} chars ← ${summarizeImage(input.productImage)}`,
    });

    const submit = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({ model_name: this.model, human_image, cloth_image }),
    });

    if (!submit.ok) {
      const detail = await submit.text().catch(() => "");
      logApiResponse("kling:tryon", `submit ${submit.status}`, detail);
      throw new Error(`Kling try-on submit failed (${submit.status}): ${detail}`);
    }

    const submitData = (await submit.json()) as { data?: { task_id?: string } };
    logApiResponse("kling:tryon", `submit ${submit.status}`, submitData);
    const taskId = submitData.data?.task_id;
    if (!taskId) throw new Error("Kling returned no task_id");

    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_INTERVAL_MS);
      const poll = await fetch(`${url}/${taskId}`, {
        headers: { Authorization: this.authHeader },
      });
      if (!poll.ok) continue;

      const pollData = (await poll.json()) as {
        data?: {
          task_status?: string;
          task_status_msg?: string;
          task_result?: { images?: Array<{ url?: string }> };
        };
      };
      const status = pollData.data?.task_status;
      logApiNote("kling:tryon", `poll ${i + 1} status=${status}`);
      if (status === "succeed") {
        logApiResponse("kling:tryon", "result", pollData);
        const imageUrl = pollData.data?.task_result?.images?.[0]?.url;
        if (!imageUrl) throw new Error("Kling try-on succeeded but returned no image URL");
        return { imageUrl, provider: this.name, model: this.model };
      }
      if (status === "failed" || status === "fail") {
        logApiResponse("kling:tryon", "result", pollData);
        throw new Error(`Kling try-on failed: ${pollData.data?.task_status_msg || "unknown"}`);
      }
    }

    throw new Error("Kling try-on task timed out");
  }
}
