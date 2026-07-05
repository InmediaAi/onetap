"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { registerToastListener } from "@/lib/toast/bus";

/**
 * Tiny dependency-free toast system. Green success / red error toasts, top-right,
 * auto-dismiss, click to close. Mounted globally in the root layout; any
 * descendant can `useToast()`, and any code (lib helpers, global error handlers)
 * can raise one imperatively via `toast` from `@/lib/toast/bus` — the provider
 * subscribes to that bus below. Styles are the global `.admin-toast*` classes.
 */

type ToastKind = "success" | "error";
interface ToastAction {
  label: string;
  onClick: () => void;
}
interface ToastOptions {
  /** A single inline action button (e.g. "View" after a download). */
  action?: ToastAction;
  /** Auto-dismiss delay in ms (default 4200). */
  duration?: number;
}
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  action?: ToastAction;
}
interface ToastApi {
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string, opts?: ToastOptions) => {
      const id = (idRef.current += 1);
      const msg = message?.trim() || (kind === "success" ? "Done." : "Something went wrong.");
      setToasts((t) => [...t, { id, kind, message: msg, action: opts?.action }]);
      setTimeout(() => remove(id), opts?.duration ?? 4200);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
    }),
    [push],
  );

  // Bridge the imperative bus (lib helpers, global error handlers) into this
  // provider so those toasts render too. Registers as a stack — see bus.ts.
  useEffect(() => {
    return registerToastListener((e) => push(e.kind, e.message, e.opts));
  }, [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="admin-toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`admin-toast ${t.kind}`}
            onClick={() => remove(t.id)}
            role="status"
            title="Dismiss"
          >
            <span className="at-icon" aria-hidden="true">
              {t.kind === "success" ? "✓" : "!"}
            </span>
            <span className="at-msg">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="at-action"
                onClick={(e) => {
                  e.stopPropagation();
                  t.action!.onClick();
                  remove(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
