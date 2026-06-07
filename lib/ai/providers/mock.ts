import { sleep } from "@/lib/utils";
import type {
  TryOnProvider,
  VideoProvider,
  IdentityProvider,
  TryOnInput,
  TryOnResult,
  VideoInput,
  VideoResult,
  ModelSheetInput,
  ModelSheetResult,
} from "@/lib/ai/types";

/**
 * Offline-safe placeholder provider. Simulates a 3–5s luxury generation so the
 * full UX is demonstrable with zero API keys. Returns curated editorial assets.
 */

const GEN_DELAY_MS = 3500;

// Royalty-free editorial placeholders (monochrome / quiet-luxury).
const TRYON_IMAGE =
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1000&q=80";
const SPIN_VIDEO =
  "https://videos.pexels.com/video-files/4434242/4434242-uhd_2160_3840_24fps.mp4";
const SOCIAL_VIDEO =
  "https://videos.pexels.com/video-files/3214448/3214448-uhd_2560_1440_25fps.mp4";
const VIDEO_POSTER =
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=80";
const MODEL_SHEET =
  "https://images.unsplash.com/photo-1485231183945-fffde7cc051e?auto=format&fit=crop&w=1000&q=80";

export class MockTryOnProvider implements TryOnProvider {
  readonly name = "mock";

  async generateTryOn(_input: TryOnInput): Promise<TryOnResult> {
    await sleep(GEN_DELAY_MS);
    return { imageUrl: TRYON_IMAGE, provider: this.name, prompt: "[mock] try-on" };
  }
}

export class MockVideoProvider implements VideoProvider {
  readonly name = "mock";

  async generate360(input: VideoInput): Promise<VideoResult> {
    await sleep(GEN_DELAY_MS);
    return {
      videoUrl: SPIN_VIDEO,
      posterUrl: VIDEO_POSTER,
      provider: this.name,
      prompt: input.prompt?.trim() || "[mock] 360 spin",
    };
  }

  async generateVideo(input: VideoInput): Promise<VideoResult> {
    await sleep(GEN_DELAY_MS);
    return {
      videoUrl: SOCIAL_VIDEO,
      posterUrl: VIDEO_POSTER,
      provider: this.name,
      prompt: input.prompt?.trim() || "[mock] social video",
    };
  }
}

export class MockIdentityProvider implements IdentityProvider {
  readonly name = "mock";

  async composeModelSheet(_input: ModelSheetInput): Promise<ModelSheetResult> {
    await sleep(GEN_DELAY_MS);
    return { imageUrl: MODEL_SHEET, provider: this.name, prompt: "[mock] model sheet" };
  }
}
