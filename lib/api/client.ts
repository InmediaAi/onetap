import { toast } from "@/lib/toast/bus";

/**
 * Central client-side API helper. Every call gets consistent, user-friendly
 * failure handling: on a network error or a non-2xx response it shows a
 * meaningful toast (from the server's `{ error }` message, or a friendly default
 * keyed by status) and throws an `ApiError` the caller can branch on.
 *
 * Server routes return `{ error: "..." }` + an HTTP status on failure — this
 * helper reads that shape. Pass `handled` for statuses the caller resolves with
 * its own UX (e.g. 401 → sign-in, 402 → pricing) so no toast is shown for them.
 */

export class ApiError extends Error {
  status: number;
  data: unknown;
  /** Whether apiJson already surfaced a toast for this error (avoids double-toast). */
  toasted: boolean;
  constructor(message: string, status: number, data: unknown, toasted: boolean) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
    this.toasted = toasted;
  }
}

/** Friendly fallback copy per status when the server sends no usable message. */
const FRIENDLY: Record<number, string> = {
  400: "Please check your details and try again.",
  401: "Please sign in to continue.",
  402: "You've reached your plan limit.",
  403: "You don't have access to that.",
  404: "That could not be found.",
  408: "The request timed out. Please try again.",
  409: "That conflicts with something already saved. Please refresh and retry.",
  413: "That file is too large.",
  429: "Too many requests — please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again.",
  502: "Our service is having trouble right now. Please try again shortly.",
  503: "This is temporarily unavailable. Please try again soon.",
  504: "The server took too long to respond. Please try again.",
};

export function friendlyMessage(status: number, serverMsg?: string, override?: string): string {
  if (override && override.trim()) return override.trim();
  if (serverMsg && serverMsg.trim()) return serverMsg.trim();
  return FRIENDLY[status] || "Something went wrong. Please try again.";
}

export interface ApiOptions extends RequestInit {
  /** Show a toast automatically on failure (default true). */
  toastOnError?: boolean;
  /** Override the failure message shown/thrown. */
  errorMessage?: string;
  /** Statuses the caller handles itself: no toast is shown, but ApiError still throws. */
  handled?: number[];
}

function serverErrorOf(data: unknown): string | undefined {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as { error?: unknown }).error;
    if (typeof e === "string") return e;
  }
  return undefined;
}

/**
 * fetch + JSON with built-in toast-on-failure. Returns the parsed body on success;
 * throws `ApiError` on network error or non-2xx (after toasting, unless suppressed).
 */
export async function apiJson<T = unknown>(
  input: RequestInfo | URL,
  opts: ApiOptions = {},
): Promise<T> {
  const { toastOnError = true, errorMessage, handled = [], ...init } = opts;

  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    const msg = "Can't reach the server. Check your connection and try again.";
    if (toastOnError) toast.error(msg);
    throw new ApiError(msg, 0, null, toastOnError);
  }

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty / non-JSON body — leave data null */
  }

  if (!res.ok) {
    const msg = friendlyMessage(res.status, serverErrorOf(data), errorMessage);
    const doToast = toastOnError && !handled.includes(res.status);
    if (doToast) toast.error(msg);
    throw new ApiError(msg, res.status, data, doToast);
  }

  return data as T;
}
