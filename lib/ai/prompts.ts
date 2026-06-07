/**
 * Predefined generation prompts — single source of truth so they're easy to
 * tune and always appear in the request logs.
 *
 * - SPIN_PROMPT — the 360° turn (image → video). Used by generate-360.
 * - FILM_PROMPT — fallback for the Creator film when no built brief is supplied;
 *   the real film prompt is composed per-format by buildFilmPrompt() in
 *   lib/film/formats.ts from the user's field selections.
 *
 * Note: the Kling Virtual Try-On image step takes NO prompt (pure image-to-image).
 */

export const SPIN_PROMPT =
  "the character performs a 40-degree rotation in place: pausing precisely for " +
  "0.5 second, holding the pause with a natural, composed posture. then keep " +
  "rotating 40-degree in the same direction, pause 0.5 seconds. then rotate back " +
  "toward the camera and pause precisely for one full second. then he confidently " +
  "walks to the left and leaves off-screen from the side. in Paris Street";

export const FILM_PROMPT =
  "Cinematic luxury fashion clip. The model moves elegantly, editorial styling, " +
  "soft natural light, premium quiet-luxury mood, the outfit stays consistent " +
  "throughout, smooth camera, no warping.";
