"use client";

/**
 * The "Dynamic Island" pill shown while a Curator try-on generates in the
 * background. Shows the actual piece being fitted (thumbnail) inside a rotating
 * "processing" ring + phase-aware copy, so it's clear what's happening. Tapping
 * it re-expands the modal; the ✕ dismisses. Floats just below the nav and never
 * blocks the grid behind it (see .tryon-island-wrap CSS).
 */
export default function TryOnIsland({
  phase,
  image,
  onExpand,
  onDismiss,
}: {
  phase: "tryon" | "spin" | "video" | null;
  image?: string | null;
  onExpand: () => void;
  onDismiss: () => void;
}) {
  const label =
    phase === "tryon"
      ? "Fitting the piece…"
      : phase === "spin"
        ? "Filming your 360°…"
        : phase === "video"
          ? "Directing your film…"
          : "Piece fitting in progress…";

  return (
    <div
      className="tryon-island"
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onExpand()}
      aria-label="Try-on in progress — tap to view"
    >
      <span className="ti-ring" aria-hidden="true">
        <span className="ti-thumb">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" />
          )}
        </span>
      </span>
      <span className="ti-copy">
        <span className="ti-text">{label}</span>
        <span className="ti-sub">Tap to watch — keep browsing</span>
      </span>
      <button
        className="ti-x"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
