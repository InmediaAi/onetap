/**
 * Client-side photo-composition check via Google MediaPipe Pose Landmarker.
 *
 * Distinguishes a true full-length ("body") shot from a face/upper-body crop,
 * and a face selfie from a full-length, using per-landmark visibility from the
 * 33-point pose model. Runs entirely in the browser — the photo never leaves
 * the device for validation.
 *
 * The WASM runtime + the lite model are loaded lazily from CDN on first use
 * (not bundled), then cached by the browser. The landmarker instance is created
 * once and reused. Everything FAILS OPEN: if the model can't load/run, we allow
 * the upload rather than hard-block on infra issues.
 */

import type { ImageCheck } from "./validate";

// Pinned to the installed @mediapipe/tasks-vision version (keep in sync).
const TASKS_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// MediaPipe Pose landmark indices.
const NOSE = 0;
const LEFT_EYE = 2;
const RIGHT_EYE = 5;
// Legs = the discriminator between a full/most-of-body shot and a face/upper-body
// crop. Knees (25/26) are included because ankles/feet are often cut off at the
// frame bottom or under-detected on tall portraits (the "square ROI" warning) —
// using knees too avoids wrongly rejecting genuine full-length photos.
const LEGS = [25, 26, 27, 28, 29, 30, 31, 32]; // knees, ankles, heels, feet
const VIS = 0.5; // visibility threshold for "present in frame"

type Landmark = { x: number; y: number; z: number; visibility?: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let landmarkerPromise: Promise<any> | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
// MediaPipe / TFLite / emscripten write a stream of INFO + WARNING lines to
// stderr (XNNPACK delegate, GL context, feedback manager, ROI projection, …).
// Emscripten routes stderr to console.error, which the Next.js dev overlay then
// surfaces as a "Console Error" — pure noise, not a real failure. Swallow only
// those specific lines; everything else passes through untouched. Installed once.
let logFilterInstalled = false;
function installMediaPipeLogFilter() {
  if (logFilterInstalled || typeof console === "undefined") return;
  logFilterInstalled = true;
  const NOISE =
    /tasks-vision|vision_wasm_internal|XNNPACK|TensorFlow Lite|inference_feedback_manager|Feedback manager|landmark_projection_calculator|NORM_RECT|gl_context|OpenGL error checking/i;
  (["error", "warn", "info", "log", "debug"] as const).forEach((level) => {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      const text = args.map((a) => (typeof a === "string" ? a : "")).join(" ");
      if (NOISE.test(text)) return; // drop MediaPipe/emscripten noise
      original(...args);
    };
  });
}

function getLandmarker(): Promise<any> {
  if (!landmarkerPromise) {
    installMediaPipeLogFilter();
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL },
        runningMode: "IMAGE",
        numPoses: 1,
      });
    })().catch((e) => {
      landmarkerPromise = null; // allow a later retry
      throw e;
    });
  }
  return landmarkerPromise;
}

/** Decode a File into a fully-loaded HTMLImageElement (object URL, revoked after). */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode failed"));
    };
    img.src = url;
  });
}

const visible = (l?: Landmark) => Boolean(l && (l.visibility ?? 0) >= VIS);

/**
 * Check that a picked photo matches its slot. Returns ok=false with a friendly
 * message only when the model confidently disagrees; otherwise (incl. any error)
 * fails open with ok=true.
 */
export async function checkComposition(
  file: File,
  kind: "body" | "selfie",
): Promise<ImageCheck> {
  if (process.env.NEXT_PUBLIC_DISABLE_POSE_CHECK === "1") return { ok: true };

  let img: HTMLImageElement | null = null;
  try {
    const [landmarker, image] = await Promise.all([getLandmarker(), loadImage(file)]);
    img = image;
    const result = landmarker.detect(image);
    const pose: Landmark[] | undefined = result?.landmarks?.[0];

    // No person detected at all → don't block (model can be unsure on odd crops
    // or lighting). We only reject when the model CONFIDENTLY disagrees.
    if (!pose) return { ok: true };

    const hasHead = visible(pose[NOSE]) || visible(pose[LEFT_EYE]) || visible(pose[RIGHT_EYE]);
    const hasLegs = LEGS.some((i) => visible(pose[i]));

    if (kind === "body") {
      // Full-length must show the legs. Legs present → accept; a face/upper-body
      // crop (head but no legs) is the one case we confidently reject.
      if (hasLegs) return { ok: true };
      return {
        ok: false,
        error:
          "This looks like a face or upper-body photo — please upload a full-length, head-to-toe shot.",
      };
    }

    // kind === "selfie" — reject a full-length; accept a face/head-and-shoulders.
    if (hasLegs) {
      return {
        ok: false,
        error: "That’s a full-length photo — please upload a close-up face selfie.",
      };
    }
    if (!hasHead) {
      return {
        ok: false,
        error: "We couldn’t find a clear face — try a head-and-shoulders selfie.",
      };
    }
    return { ok: true };
  } catch (e) {
    // CDN blocked, WASM/WebGL unavailable, decode error, etc. — never block.
    console.warn("[poseCheck] skipped (failed open):", e);
    return { ok: true };
  } finally {
    if (img?.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
}
