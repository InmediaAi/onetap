"use client";

import { useEffect } from "react";

/**
 * Root error boundary — only fires when the root layout itself throws, so it
 * must render its own <html>/<body> and cannot rely on globals.css. Kept fully
 * self-contained with inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: "1.25rem",
          padding: "3rem 1.5rem",
          background: "#ffffff",
          color: "#111111",
          fontFamily: "Helvetica Neue, Helvetica, Arial, sans-serif",
        }}
      >
        <h1 style={{ fontWeight: 400, fontSize: "clamp(1.6rem, 4vw, 2.4rem)", margin: 0 }}>
          Something went wrong.
        </h1>
        <p style={{ color: "#6b6b6b", maxWidth: "42ch", lineHeight: 1.6, margin: 0 }}>
          We hit an unexpected error. Please try again — if it keeps happening,
          come back in a little while.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            border: "1px solid #111111",
            background: "transparent",
            color: "#111111",
            padding: "0.7rem 1.5rem",
            fontSize: "0.85rem",
            letterSpacing: "0.02em",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
