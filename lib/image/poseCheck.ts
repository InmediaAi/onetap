/**
 * Client-side photo-composition checks via Google MediaPipe — runs entirely in
 * the browser (the photo never leaves the device; no server/API; free model).
 *
 * One detector per slot, no overlap:
 *   • body   → Pose Landmarker — must show the legs (a face/upper-body crop is
 *              rejected as "not full-length").
 *   • selfie → Face Detector — must contain an actual, close-enough face (rejects
 *              non-face images AND tiny far-away / full-length faces).
 *
 * WASM runtime + the (lite) models load lazily from CDN on first use, then the
 * browser caches them. Each detector is created once and reused. Everything
 * FAILS OPEN: if a model can't load/run, we allow the upload rather than block.
 */

import type { ImageCheck } from "./validate";

// Pinned to the installed @mediapipe/tasks-vision version (keep in sync).
const TASKS_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VERSION}/wasm`;
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const FACE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.task";

// Legs = the discriminator between a full/most-of-body shot and a face/upper-body
// crop. Knees (25/26) are included because ankles/feet are often cut off at the
// frame bottom or under-detected on tall portraits — using knees too avoids
// wrongly rejecting genuine full-length photos.
const LEGS = [25, 26, 27, 28, 29, 30, 31, 32]; // knees, ankles, heels, feet
const VIS = 0.5; // pose visibility threshold for "present in frame"
const FACE_MIN_WIDTH = 0.1; // a selfie's face must span ≥10% of the frame width

type Landmark = { x: number; y: number; z: number; visibility?: number };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let landmarkerPromise: Promise<any> | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let faceDetectorPromise: Promise<any> | null = null;

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLandmarker(): Promise<any> {
  if (!landmarkerPromise) {
    installMediaPipeLogFilter();
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: POSE_MODEL_URL },
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFaceDetector(): Promise<any> {
  if (!faceDetectorPromise) {
    installMediaPipeLogFilter();
    faceDetectorPromise = (async () => {
      const { FilesetResolver, FaceDetector } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
      return FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_MODEL_URL },
        runningMode: "IMAGE",
        minDetectionConfidence: 0.5,
      });
    })().catch((e) => {
      faceDetectorPromise = null;
      throw e;
    });
  }
  return faceDetectorPromise;
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

/** Full-length ("body") — must show the legs. */
async function checkBody(file: File): Promise<ImageCheck> {
  let img: HTMLImageElement | null = null;
  try {
    const [landmarker, image] = await Promise.all([getLandmarker(), loadImage(file)]);
    img = image;
    const pose: Landmark[] | undefined = landmarker.detect(image)?.landmarks?.[0];
    // No person detected → don't block (the model can be unsure on odd crops).
    if (!pose) return { ok: true };
    if (LEGS.some((i) => visible(pose[i]))) return { ok: true };
    return {
      ok: false,
      error:
        "This looks like a face or upper-body photo — please upload a full-length, head-to-toe shot.",
    };
  } catch (e) {
    console.warn("[poseCheck] body skipped (failed open):", e);
    return { ok: true };
  } finally {
    if (img?.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
}

/** Face selfie — must contain an actual, close-enough face. */
async function checkFace(file: File): Promise<ImageCheck> {
  let img: HTMLImageElement | null = null;
  try {
    const [detector, image] = await Promise.all([getFaceDetector(), loadImage(file)]);
    img = image;
    const detections: Array<{ boundingBox?: { width?: number } }> =
      detector.detect(image)?.detections ?? [];
    if (detections.length === 0) {
      return {
        ok: false,
        error: "We couldn’t find a clear face — try a head-and-shoulders selfie.",
      };
    }
    const imgW = image.naturalWidth || image.width || 1;
    const widest = Math.max(...detections.map((d) => d.boundingBox?.width ?? 0));
    if (widest / imgW < FACE_MIN_WIDTH) {
      return {
        ok: false,
        error: "Move in closer — a head-and-shoulders selfie works best (the face is too far away).",
      };
    }
    return { ok: true };
  } catch (e) {
    console.warn("[faceCheck] skipped (failed open):", e);
    return { ok: true };
  } finally {
    if (img?.src.startsWith("blob:")) URL.revokeObjectURL(img.src);
  }
}

/**
 * Check that a picked photo matches its slot. One detector per slot; returns
 * ok=false with a friendly message only when the model confidently disagrees,
 * and fails open on any error.
 */
export async function checkComposition(
  file: File,
  kind: "body" | "selfie",
): Promise<ImageCheck> {
  if (process.env.NEXT_PUBLIC_DISABLE_POSE_CHECK === "1") return { ok: true };
  return kind === "selfie" ? checkFace(file) : checkBody(file);
}
