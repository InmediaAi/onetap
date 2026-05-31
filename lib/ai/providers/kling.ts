import crypto from "node:crypto";
import { sleep } from "@/lib/utils";
import type {
  VideoProvider,
  VideoInput,
  VideoResult,
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
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 60; // ~4 min ceiling

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
    const submit = await fetch(`${BASE}${SUBMIT_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authHeader,
      },
      body: JSON.stringify({
        model_name: this.model,
        image,
        prompt,
        mode: "std",
        duration: "5",
      }),
    });

    if (!submit.ok) {
      const detail = await submit.text().catch(() => "");
      throw new Error(`Kling submit failed (${submit.status}): ${detail}`);
    }

    const submitData = (await submit.json()) as {
      data?: { task_id?: string };
    };
    const taskId = submitData.data?.task_id;
    if (!taskId) throw new Error("Kling returned no task_id");

    // Poll until the task succeeds.
    for (let i = 0; i < MAX_POLLS; i++) {
      await sleep(POLL_INTERVAL_MS);
      const poll = await fetch(`${BASE}${SUBMIT_PATH}/${taskId}`, {
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
      if (status === "succeed") {
        const url = pollData.data?.task_result?.videos?.[0]?.url;
        if (!url) throw new Error("Kling succeeded but returned no video URL");
        return { videoUrl: url, provider: this.name };
      }
      if (status === "failed") throw new Error("Kling task failed");
    }

    throw new Error("Kling task timed out");
  }

  generate360(input: VideoInput): Promise<VideoResult> {
    return this.run(
      "The subject performs a slow, controlled 360-degree turn in place, " +
        "studio lighting, fashion lookbook, smooth rotation, no camera shake.",
      input.image,
    );
  }

  generateVideo(input: VideoInput): Promise<VideoResult> {
    return this.run(
      "Cinematic 10-second luxury fashion clip, model moving elegantly, " +
        "editorial styling, soft natural light, premium quiet-luxury mood.",
      input.image,
    );
  }
}
