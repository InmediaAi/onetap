/**
 * Imperative toast bus - lets ANY code (lib helpers, global error handlers, not
 * just React components) raise a user-facing toast. The <ToastProvider> registers
 * a listener; `toast.error(...)` / `toast.success(...)` are then rendered by it.
 *
 * Why a bus (vs only the `useToast()` hook): most failures originate in plain
 * functions (fetch helpers, window error handlers) that can't call a React hook.
 * Events raised before the provider mounts are buffered and flushed on register.
 *
 * Providers register as a STACK so a nested provider (e.g. the admin layout mounts
 * its own) receives events while mounted, and control returns to the root provider
 * when it unmounts - no toasts get lost after leaving a nested route.
 */

export type ToastKind = "success" | "error";

export interface ToastEmitOptions {
  /** A single inline action button. */
  action?: { label: string; onClick: () => void };
  /** Auto-dismiss delay in ms (default 4200). */
  duration?: number;
}

export interface ToastEvent {
  kind: ToastKind;
  message: string;
  opts?: ToastEmitOptions;
}

type Listener = (e: ToastEvent) => void;

const listeners: Listener[] = [];
const buffer: ToastEvent[] = [];

// De-dupe identical toasts fired in a short window (avoids spam from retries or
// a burst of failing requests all surfacing the same message).
let lastKey = "";
let lastAt = 0;

function current(): Listener | null {
  return listeners[listeners.length - 1] ?? null;
}

/** Called by <ToastProvider> on mount. Returns an unregister cleanup. */
export function registerToastListener(l: Listener): () => void {
  listeners.push(l);
  // Flush anything raised before a listener existed to the new top listener.
  if (buffer.length) buffer.splice(0).forEach((e) => l(e));
  return () => {
    const i = listeners.indexOf(l);
    if (i >= 0) listeners.splice(i, 1);
  };
}

function emit(kind: ToastKind, message: string, opts?: ToastEmitOptions): void {
  const msg =
    (message || "").trim() ||
    (kind === "success" ? "Done." : "Something went wrong. Please try again.");

  const key = `${kind}|${msg}`;
  const now = Date.now();
  if (key === lastKey && now - lastAt < 3000) return;
  lastKey = key;
  lastAt = now;

  const event: ToastEvent = { kind, message: msg, opts };
  const l = current();
  if (l) l(event);
  else buffer.push(event); // no provider yet — buffer until one registers
}

export const toast = {
  success: (message: string, opts?: ToastEmitOptions) => emit("success", message, opts),
  error: (message: string, opts?: ToastEmitOptions) => emit("error", message, opts),
};
