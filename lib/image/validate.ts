/**
 * Client-side image validation against the Kling input guidelines, applied to
 * every user-uploaded photo (onboarding, profile, and uploaded pieces):
 *   • file size ≤ 10MB
 *   • width AND height ≥ 300px
 *   • composition (body/selfie only) — full-length vs face, via pose detection
 * Returns a friendly, specific message when a file doesn't qualify.
 */

import type { IdentityKind } from "@/lib/auth/client";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
export const MIN_IMAGE_DIM = 300; // px, per side

/** One-line guidance shown beside uploaders. */
export const IMAGE_GUIDELINE = "JPG or PNG · under 10MB · at least 300×300px.";

export interface ImageCheck {
  ok: boolean;
  error?: string;
}

function readDimensions(file: File): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

/**
 * Validate a picked file. Resolves ok=false with a specific message on failure.
 * When `kind` is "body" or "selfie", also checks composition (full-length vs
 * face) with on-device pose detection — see lib/image/poseCheck.ts.
 */
export async function validateImageFile(
  file: File,
  kind?: IdentityKind,
): Promise<ImageCheck> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "That isn’t an image — please choose a JPG or PNG." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return { ok: false, error: `That image is ${mb}MB — please use one under 10MB.` };
  }
  const dim = await readDimensions(file);
  if (!dim) {
    return { ok: false, error: "We couldn’t read that image — try a different JPG or PNG." };
  }
  if (dim.w < MIN_IMAGE_DIM || dim.h < MIN_IMAGE_DIM) {
    return {
      ok: false,
      error: `That image is ${dim.w}×${dim.h}px — it must be at least 300×300px.`,
    };
  }
  // Composition check (lazy-loads MediaPipe only for the two try-on photos).
  if (kind === "body" || kind === "selfie") {
    const { checkComposition } = await import("./poseCheck");
    const comp = await checkComposition(file, kind);
    if (!comp.ok) return comp;
  }
  return { ok: true };
}
