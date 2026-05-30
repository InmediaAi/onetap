import type { TryOnProvider, VideoProvider } from "@/lib/ai/types";
import { MockTryOnProvider, MockVideoProvider } from "@/lib/ai/providers/mock";
import { GrokProvider } from "@/lib/ai/providers/grok";
import { KlingProvider } from "@/lib/ai/providers/kling";

/**
 * Central provider registry. Routes/UI call these — never a concrete provider.
 *
 * Selection is env-driven with an automatic mock fallback, so `npm run dev`
 * works with zero credentials. Add a provider (OpenAI, Runway, Pika, Luma) by
 * implementing the interface and extending the switch below.
 */

export function getTryOnProvider(): TryOnProvider {
  const key = process.env.XAI_API_KEY;
  switch (process.env.TRYON_PROVIDER || (key ? "grok" : "mock")) {
    case "grok":
      if (key) return new GrokProvider(key);
    // fall through to mock if no key
    default:
      return new MockTryOnProvider();
  }
}

export function getVideoProvider(): VideoProvider {
  const access = process.env.KLING_ACCESS_KEY;
  const secret = process.env.KLING_SECRET_KEY;
  const hasKling = Boolean(access && secret);
  switch (process.env.VIDEO_PROVIDER || (hasKling ? "kling" : "mock")) {
    case "kling":
      if (access && secret) return new KlingProvider(access, secret);
    // fall through to mock if no keys
    default:
      return new MockVideoProvider();
  }
}

/** True when at least one real provider is configured (for UI hints). */
export function liveModeStatus() {
  return {
    tryOn: Boolean(process.env.XAI_API_KEY),
    video: Boolean(process.env.KLING_ACCESS_KEY && process.env.KLING_SECRET_KEY),
  };
}
