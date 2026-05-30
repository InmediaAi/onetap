/**
 * Provider-agnostic AI contracts. UI and API routes depend ONLY on these
 * interfaces — never on a concrete provider. Add OpenAI / Runway / Pika / Luma
 * by implementing one of these and registering it in `lib/ai/index.ts`.
 */

export type GenerationKind = "tryon" | "spin" | "video";

export interface TryOnInput {
  /** Data URL or hosted URL of the user's portrait. */
  userImage: string;
  /** Hosted URL of the product image. */
  productImage: string;
}

export interface VideoInput {
  /** Source image to animate — typically the generated try-on image. */
  image: string;
}

export interface TryOnResult {
  imageUrl: string;
  provider: string;
}

export interface VideoResult {
  videoUrl: string;
  posterUrl?: string;
  provider: string;
}

export interface TryOnProvider {
  readonly name: string;
  generateTryOn(input: TryOnInput): Promise<TryOnResult>;
}

export interface VideoProvider {
  readonly name: string;
  generate360(input: VideoInput): Promise<VideoResult>;
  generateVideo(input: VideoInput): Promise<VideoResult>;
}
