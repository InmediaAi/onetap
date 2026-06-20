/**
 * Predefined generation prompts — single source of truth so they're easy to
 * tune and always appear in the request logs.
 *
 * - SPIN_PROMPT — the 360° turn (image → video). Used by generate-360.
 * - FILM_PROMPT — fallback for the Creator film when no built brief is supplied;
 *   the real film prompt is composed per-format by buildFilmPrompt() in
 *   lib/film/formats.ts from the user's field selections.
 *
 * The TWO core system prompts below — the try-on IMAGE base and the VIDEO
 * identity-lock — are admin-editable at runtime (table `ai_prompts`, read via
 * lib/ai/getPrompts.ts). The constants here are the SEED / fallback used when the
 * DB is unconfigured or empty, so behavior is unchanged out of the box.
 *
 * Note: the Kling Virtual Try-On image step takes NO prompt (pure image-to-image).
 */

export const SPIN_PROMPT =
  "the person performs a 40-degree rotation in place: pausing precisely for " +
  "0.5 second, holding the pause with a natural, composed posture. then keep " +
  "rotating 40-degree in the same direction, pause 0.5 seconds. then rotate back " +
  "toward the camera and pause precisely for one full second. then they confidently " +
  "walk to the left and leave off-screen from the side. in Paris Street";

export const FILM_PROMPT =
  "Cinematic luxury fashion clip. The person moves elegantly, editorial styling, " +
  "soft natural light, premium quiet-luxury mood, the outfit stays consistent " +
  "throughout, smooth camera, no warping.";

/** Stable ids for the admin-editable prompts (also the `ai_prompts` row keys). */
export type PromptId = "tryon_image" | "video_identity" | "spin_scene";

/**
 * SEED / fallback for the two admin-editable prompts. Each is a template; the
 * `{scene}` token marks where the per-request scene/garment prompt is injected
 * (composePrompt appends it if the token is absent).
 *
 * - tryon_image: prepended to the image step so the garment is placed onto the
 *   person from the reference image(s) while preserving identity.
 * - video_identity: the identity-lock preamble wrapped around every video / 360
 *   scene so image-to-video animates the real person instead of regenerating them.
 */
export const SEED_PROMPTS: Record<PromptId, { label: string; content: string }> = {
  tryon_image: {
    label: "Try-on image (garment placement + identity)",
    content:
      "The first image is the person. Every image after it is a reference view of the SAME garment " +
      "(front/back/detail). Place that garment onto the person, using all the references together to " +
      "reproduce its exact cut, colour, pattern and details, and preserving the person's face, hair, " +
      "body and proportions. Produce a single photorealistic image. {scene}",
  },
  video_identity: {
    label: "Video identity-lock (face preservation)",
    content:
      "Animate the real person shown in the provided image into a short video. " +
      "CRITICAL — preserve their identity exactly: keep the same face, facial " +
      "features, bone structure, skin tone and texture, hair, and body as in the " +
      "image. Do NOT change, beautify, smooth, slim, restyle, age, swap, or replace " +
      "the face, and do not alter the garment. Photorealistic and true to life — " +
      "real skin texture, not airbrushed, plastic, or CGI — with natural, believable " +
      "human motion and the identity perfectly consistent in every frame. Scene: {scene}",
  },
  spin_scene: {
    // The 360° turn scene injected into video_identity's {scene} (Curator + 360).
    label: "360° spin scene (motion for the turn)",
    content: SPIN_PROMPT,
  },
};

/**
 * Inject the per-request scene/garment prompt into a template. Replaces the
 * `{scene}` token if present; otherwise appends the scene after a space.
 */
export function composePrompt(template: string, scene?: string): string {
  const s = scene?.trim() ?? "";
  if (template.includes("{scene}")) return template.replace(/\{scene\}/g, s).trim();
  return s ? `${template.trim()} ${s}` : template.trim();
}
