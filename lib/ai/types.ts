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
  /** Optional directive prompt (e.g. the built influencer-film brief). */
  prompt?: string;
}

export interface TryOnResult {
  imageUrl: string;
  provider: string;
  /** The exact final prompt sent to the provider (for logging). */
  prompt?: string;
  /** The model used (for logging). */
  model?: string;
}

export interface VideoResult {
  videoUrl: string;
  posterUrl?: string;
  provider: string;
  /** The exact final prompt sent to the provider (for logging). */
  prompt?: string;
  /** The model used (for logging). */
  model?: string;
}

export interface TryOnProvider {
  readonly name: string;
  generateTryOn(input: TryOnInput): Promise<TryOnResult>;
}

export interface ModelSheetInput {
  /**
   * 2–4 reference photos of the same person (front/side/back/face), as signed,
   * hosted, or data URLs. Used to compose one multi-angle identity sheet.
   */
  images: string[];
  /** Optional directive prompt. */
  prompt?: string;
}

export interface ModelSheetResult {
  imageUrl: string;
  provider: string;
  /** The exact final prompt sent to the provider (for logging). */
  prompt?: string;
  /** The model used (for logging). */
  model?: string;
}

/**
 * Composes the derived identity image — a single multi-angle "model sheet"
 * built from the user's uploaded photos (front, sides, back, close-up).
 */
export interface IdentityProvider {
  readonly name: string;
  composeModelSheet(input: ModelSheetInput): Promise<ModelSheetResult>;
}

export interface VideoProvider {
  readonly name: string;
  generate360(input: VideoInput): Promise<VideoResult>;
  generateVideo(input: VideoInput): Promise<VideoResult>;
}
