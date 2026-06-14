import type { TryOnProvider, VideoProvider, IdentityProvider } from "@/lib/ai/types";
import {
  MockTryOnProvider,
  MockVideoProvider,
  MockIdentityProvider,
} from "@/lib/ai/providers/mock";
import {
  GrokProvider,
  GrokIdentityProvider,
  GrokVideoProvider,
} from "@/lib/ai/providers/grok";
import { KlingProvider, KlingTryOnProvider } from "@/lib/ai/providers/kling";
import { OpenAIImageProvider } from "@/lib/ai/providers/openai";
import { GeminiImageProvider } from "@/lib/ai/providers/gemini";

/**
 * Provider registry — plug-and-play, env-driven.
 *
 * To add a model/provider:
 *   1. Implement the TryOnProvider or VideoProvider interface (lib/ai/types.ts).
 *   2. Add ONE entry to the relevant registry below.
 *   3. Select it from env: TRYON_PROVIDER / VIDEO_PROVIDER (+ TRYON_MODEL / VIDEO_MODEL).
 *
 * Selection is purely env-driven. Default is `mock` (so `npm run dev` works with
 * zero config). If a real provider is selected but its keys are missing, we throw
 * a clear error rather than silently falling back — you always know what ran.
 */

interface ProviderDescriptor<T> {
  /** Env keys that MUST be present for this provider to run. */
  requiredEnv: string[];
  /** Build the provider — reads its own keys + model from env. */
  create: () => T;
}

/** Model resolution — each is env-selectable; unset → the provider's default. */
const tryOnModel = () => process.env.TRYON_MODEL ?? undefined;
const videoModel = () => process.env.VIDEO_MODEL ?? undefined;
const identityModel = () => process.env.IDENTITY_MODEL ?? undefined;

const TRYON_REGISTRY: Record<string, ProviderDescriptor<TryOnProvider>> = {
  mock: { requiredEnv: [], create: () => new MockTryOnProvider() },
  // Real garment-on-person try-on (image + image → image). Default.
  kling: {
    requiredEnv: ["KLING_ACCESS_KEY", "KLING_SECRET_KEY"],
    create: () =>
      new KlingTryOnProvider(
        process.env.KLING_ACCESS_KEY!,
        process.env.KLING_SECRET_KEY!,
        tryOnModel(),
      ),
  },
  // Text-conditioned xAI image gen — kept as a selectable fallback.
  grok: {
    requiredEnv: ["XAI_API_KEY"],
    create: () => new GrokProvider(process.env.XAI_API_KEY!, tryOnModel()),
  },
  // GPT-Image (Images Edit): person + garment + prompt → composed scene image.
  // Prompt-capable (unlike Kling try-on). Used for the FIFA moment image prompt.
  "gpt-image": {
    requiredEnv: ["OPENAI_API_KEY"],
    create: () =>
      new OpenAIImageProvider(
        process.env.OPENAI_API_KEY!,
        process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
      ),
  },
  // Gemini ("Nano Banana") image editing: person + garment + prompt → scene image.
  // Lower latency than GPT-Image; switch models via GEMINI_IMAGE_MODEL.
  gemini: {
    requiredEnv: ["GEMINI_API_KEY"],
    create: () =>
      new GeminiImageProvider(
        process.env.GEMINI_API_KEY!,
        process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image",
      ),
  },
};

const VIDEO_REGISTRY: Record<string, ProviderDescriptor<VideoProvider>> = {
  mock: { requiredEnv: [], create: () => new MockVideoProvider() },
  // Animate the try-on image into a 360°/film (image → video). Default.
  grok: {
    requiredEnv: ["XAI_API_KEY"],
    create: () => new GrokVideoProvider(process.env.XAI_API_KEY!, videoModel()),
  },
  // Kling image→video — kept as a selectable fallback.
  kling: {
    requiredEnv: ["KLING_ACCESS_KEY", "KLING_SECRET_KEY"],
    create: () =>
      new KlingProvider(
        process.env.KLING_ACCESS_KEY!,
        process.env.KLING_SECRET_KEY!,
        videoModel(),
      ),
  },
};

const IDENTITY_REGISTRY: Record<string, ProviderDescriptor<IdentityProvider>> = {
  mock: { requiredEnv: [], create: () => new MockIdentityProvider() },
  grok: {
    requiredEnv: ["XAI_API_KEY"],
    create: () => new GrokIdentityProvider(process.env.XAI_API_KEY!, identityModel()),
  },
};

/** Pick a provider from env, validating its keys (fail loud). */
function select<T>(
  registry: Record<string, ProviderDescriptor<T>>,
  envVar: string,
): T {
  const name = process.env[envVar] || "mock"; // zero-config dev → mock
  const descriptor = registry[name];
  if (!descriptor) {
    throw new Error(
      `${envVar}="${name}" is not a registered provider. Available: ${Object.keys(registry).join(", ")}`,
    );
  }
  const missing = descriptor.requiredEnv.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `${envVar}="${name}" requires env: ${missing.join(", ")}`,
    );
  }
  return descriptor.create();
}

export function getTryOnProvider(): TryOnProvider {
  return select(TRYON_REGISTRY, "TRYON_PROVIDER");
}

export function getVideoProvider(): VideoProvider {
  return select(VIDEO_REGISTRY, "VIDEO_PROVIDER");
}

export function getIdentityProvider(): IdentityProvider {
  return select(IDENTITY_REGISTRY, "IDENTITY_PROVIDER");
}

/** Diagnostic view: what's selected and which providers are configured. */
export function providerStatus() {
  const configured = <T>(registry: Record<string, ProviderDescriptor<T>>) =>
    Object.fromEntries(
      Object.entries(registry).map(([name, d]) => [
        name,
        d.requiredEnv.every((k) => Boolean(process.env[k])),
      ]),
    );

  return {
    tryOn: {
      selected: process.env.TRYON_PROVIDER || "mock",
      model: tryOnModel() ?? null,
      configured: configured(TRYON_REGISTRY),
    },
    video: {
      selected: process.env.VIDEO_PROVIDER || "mock",
      model: videoModel() ?? null,
      configured: configured(VIDEO_REGISTRY),
    },
    identity: {
      selected: process.env.IDENTITY_PROVIDER || "mock",
      model: identityModel() ?? null,
      configured: configured(IDENTITY_REGISTRY),
    },
  };
}
