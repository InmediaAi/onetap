"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Tiny dependency-free toast system for the admin panel. Green success / red
 * error toasts, top-right, auto-dismiss, click to close. Provided once at the
 * /admin route layout; any admin component can `useToast()`.
 */

type ToastKind = "success" | "error";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}
interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
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
    (kind: ToastKind, message: string) => {
      const id = (idRef.current += 1);
      const msg = message?.trim() || (kind === "success" ? "Done." : "Something went wrong.");
      setToasts((t) => [...t, { id, kind, message: msg }]);
      setTimeout(() => remove(id), 4200);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (m) => push("success", m),
      error: (m) => push("error", m),
    }),
    [push],
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="admin-toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`admin-toast ${t.kind}`}
            onClick={() => remove(t.id)}
            title="Dismiss"
          >
            <span className="at-icon" aria-hidden="true">
              {t.kind === "success" ? "✓" : "!"}
            </span>
            <span className="at-msg">{t.message}</span>
          </button>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
