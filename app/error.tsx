"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Route-segment error boundary — catches render/data errors within a page and
 * shows a calm, on-brand fallback instead of a blank screen. `reset()` retries
 * the segment; the home link is an always-available escape hatch.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "70vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "1.25rem",
        padding: "3rem 1.5rem",
      }}
    >
      <h1 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: "clamp(1.6rem, 4vw, 2.4rem)", color: "var(--noir)" }}>
        Something went wrong.
      </h1>
      <p style={{ color: "var(--taupe)", maxWidth: "42ch", lineHeight: 1.6 }}>
        We hit an unexpected error loading this page. Please try again — if it
        keeps happening, come back in a little while.
      </p>
      <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button type="button" className="btn-line" onClick={() => reset()}>
          Try again
        </button>
        <Link href="/" className="btn-line lp-quiet">
          Back to home
        </Link>
      </div>
    </div>
  );
}
