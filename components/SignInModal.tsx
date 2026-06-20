"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { signInWithProvider } from "@/lib/auth/client";

/* Monochrome provider marks (currentColor), matching the onboarding page. */
const GoogleMark = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 11v2.4h3.97c-.16 1.03-1.2 3.02-3.97 3.02-2.39 0-4.34-1.98-4.34-4.42S9.61 7.58 12 7.58c1.36 0 2.27.58 2.79 1.08l1.9-1.83C15.47 5.69 13.89 5 12 5c-3.87 0-7 3.13-7 7s3.13 7 7 7c4.04 0 6.72-2.84 6.72-6.84 0-.46-.05-.81-.11-1.16H12z" />
  </svg>
);
const AppleMark = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.93 2.71-3.4 2.71-1.6.02-2.12-.94-3.92-.94-1.61 0-2.32.93-3.81.94-1.6.06-2.7-1.46-3.65-2.79-1.93-2.78-3.4-7.86-1.42-11.29.97-1.69 2.71-2.78 4.61-2.78 1.5 0 2.91 1.01 3.83 1.01.91 0 2.63-1.25 4.43-1.06.71.03 2.71.28 4 2.13-.1.07-2.38 1.39-2.35 4.15.03 3.3 2.91 4.39 2.94 4.4z" />
  </svg>
);

/**
 * Global "sign in to continue" modal, opened via store.openSignIn() (e.g. from
 * the generation gate). Mirrors PricingModal. After OAuth the user is redirected
 * back to where they were (next = current path).
 */
export default function SignInModal() {
  const open = useAtelier((s) => s.signInOpen);
  const close = useAtelier((s) => s.closeSignIn);

  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (!open) return null;

  const next =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/";

  async function oauth(provider: "google" | "apple") {
    setErr(null);
    try {
      await signInWithProvider(provider, next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sign-in failed");
    }
  }

  return (
    <div
      className="modal-scrim pricing-scrim"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).classList.contains("pricing-scrim")) close();
      }}
    >
      <div className="pricing-card signin-card">
        <button className="mclose pricing-close" onClick={close} aria-label="Close">
          <X size={16} strokeWidth={1.5} />
        </button>

        <div className="pricing-head">
          <span className="label">Sign in to continue</span>
          <p className="pricing-note">
            Create an account to see yourself in the piece. Your likeness stays
            private to you.
          </p>
        </div>

        <div className="signin-actions">
          <button className="oauth-btn" onClick={() => oauth("google")}>
            <GoogleMark /> Continue with Google
          </button>
          <button className="oauth-btn" onClick={() => oauth("apple")}>
            <AppleMark /> Continue with Apple
          </button>
          {err && <p className="studio-err">{err}</p>}
        </div>
      </div>
    </div>
  );
}
