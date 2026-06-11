"use client";

import { type ReactNode } from "react";
import GenerationProgress from "@/components/GenerationProgress";

/**
 * The shared, theme-agnostic result frame — the 9:16 box that shows the moving
 * result (autoplay video), the try-on still, or GenerationProgress while a piece
 * composes. Both the main app's dark ResultStage and the FIFA microsite's light
 * result render through this so the media experience never diverges. Everything
 * around the frame (thumbnail rail, action rail / text buttons, scrim, membership
 * gating) stays consumer-specific. Colours flip via the --rs-* CSS variables.
 */

type Phase = "tryon" | "spin" | "video";

export interface ResultMediaProps {
  /** The moving result (360° turn or film). */
  video?: string | null;
  poster?: string | null;
  /** The on-you try-on still. */
  image?: string | null;
  /** Caller-resolved: show the moving result (true) vs the still (false). */
  showVideo: boolean;
  /** Active generation phase (null when idle/done). Drives the progress UX. */
  phase?: Phase | null;
  /** Override the cycling progress copy per phase (defaults to atelier copy). */
  progressCopy?: Partial<Record<Phase, { sub: string; lines: string[] }>>;
  /** The framed inner border (main app); off for the FIFA film frame. */
  showInset?: boolean;
  /** Layered over the video — main: turn label; FIFA: nation band + watermark. */
  videoOverlay?: ReactNode;
  /** Layered over the still (main: brand/name caption). */
  caption?: ReactNode;
  error?: string | null;
  mono?: string;
  /** Shown when there's nothing yet (e.g. a sign-in invite). */
  emptyState?: ReactNode;
  /** Frame class — "media" (main) keeps the global modal CSS; "ff-panel" for FIFA. */
  className?: string;
}

export default function ResultMedia({
  video,
  poster,
  image,
  showVideo,
  phase = null,
  progressCopy,
  showInset = true,
  videoOverlay,
  caption,
  error,
  mono,
  emptyState,
  className = "media",
}: ResultMediaProps) {
  const videoPhase = phase === "spin" || phase === "video";
  const composing = phase === "tryon" && !image; // try-on still being composed
  const hasResult = Boolean(image || video);

  return (
    <div className={className}>
      {showInset && <div className="inset" />}

      {/* the moving result (final) */}
      {showVideo && video && (
        <>
          <video className="base" src={video} poster={poster ?? undefined} autoPlay loop muted playsInline />
          {videoOverlay}
        </>
      )}

      {/* the try-on still — shown while the result composes, or when toggled */}
      {!showVideo && image && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="base" src={image} alt="" style={{ transform: "scale(1.02)" }} />
          {phase === "spin" || phase === "video" ? (
            <GenerationProgress phase={phase} compact copy={progressCopy} />
          ) : (
            caption ?? null
          )}
        </>
      )}

      {/* composing the try-on still (no image yet) */}
      {composing && <GenerationProgress phase="tryon" copy={progressCopy} />}

      {/* generating the moving result with no still to show (Studio/Creator) */}
      {!hasResult && !composing && (phase === "spin" || phase === "video") && (
        <GenerationProgress phase={phase} copy={progressCopy} />
      )}

      {/* error with nothing to show */}
      {!hasResult && !phase && error && (
        <div className="ph">
          {mono && <div className="mono">{mono}</div>}
          <div className="pm">{error}</div>
        </div>
      )}

      {/* empty / invite state */}
      {!hasResult && !phase && !error && emptyState}
    </div>
  );
}
