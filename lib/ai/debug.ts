import "server-only";

/**
 * Provider-call logging — prints the exact endpoint, request params and the raw
 * responses we get from the AI APIs to the server terminal, so the pipeline can
 * be checked for accuracy. Image inputs are summarized (never raw base64) to
 * keep logs usable; API responses (status + URLs) are logged in full.
 *
 * On by default; set AI_DEBUG=0 to silence.
 */

const ON = process.env.AI_DEBUG !== "0";

/** Short, log-safe description of an image input (URL or data URL). */
export function summarizeImage(v: unknown): string {
  if (typeof v !== "string" || !v) return "(none)";
  if (v.startsWith("data:")) return `data-url(${v.length} chars)`;
  return v.length > 160 ? `${v.slice(0, 160)}…` : v;
}

function emit(tag: string, label: string, payload?: unknown): void {
  if (!ON) return;
  if (payload === undefined) {
    console.log(`[ai:${tag}] ${label}`);
    return;
  }
  try {
    console.log(`[ai:${tag}] ${label}`, JSON.stringify(payload, null, 2));
  } catch {
    console.log(`[ai:${tag}] ${label}`, payload);
  }
}

/** Log an outgoing request: method + URL + sanitized body. */
export function logApiRequest(
  tag: string,
  method: string,
  url: string,
  body: Record<string, unknown>,
): void {
  emit(tag, `→ ${method} ${url}`, body);
}

/** Log a raw API response (status + parsed JSON). */
export function logApiResponse(tag: string, label: string, payload: unknown): void {
  emit(tag, `← ${label}`, payload);
}

/** One-line progress note (poll transitions, ids, final URLs). */
export function logApiNote(tag: string, message: string): void {
  emit(tag, message);
}
