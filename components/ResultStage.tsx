"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Heart, Download, Share2, ShoppingBag } from "lucide-react";
import GenerationProgress from "@/components/GenerationProgress";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

/**
 * Shared try-on result stage — the SAME experience across Curator, 360° and
 * Creator. Left rail: the try-on still (the "middleware") + the moving result;
 * centre: the selected media (defaults to the moving result once ready); right:
 * save / download / share / shop. While generating it shows GenerationProgress.
 */

export interface ResultStageProps {
  /** The on-you try-on still. */
  image?: string | null;
  /** The moving result (360° turn or film). */
  video?: string | null;
  poster?: string | null;
  /** Active generation phase (null when idle/done). Drives the progress UX. */
  phase?: "tryon" | "spin" | "video" | null;
  /** Badge + thumb label for the moving result. */
  turnLabel?: string; // "360°" | "Film"
  turnSub?: string; // "The Turn" | "The Reel"
  caption?: { brand: string; name: string } | null;
  buyUrl?: string | null;
  /** Per-asset look ids (share/download target the shown asset). */
  imageLookId?: string | null;
  videoLookId?: string | null;
  productId?: string | null;
  wished?: boolean;
  onSave?: () => void;
  error?: string | null;
  mono?: string;
  /** Shown in the frame when there's nothing yet (e.g. a sign-in invite). */
  emptyState?: ReactNode;
}

export default function ResultStage({
  image,
  video,
  poster,
  phase = null,
  turnLabel = "360°",
  turnSub = "The Turn",
  caption,
  buyUrl,
  imageLookId,
  videoLookId,
  productId,
  wished,
  onSave,
  error,
  mono,
  emptyState,
}: ResultStageProps) {
  const [view, setView] = useState<"tryon" | "turn">("turn");
  useEffect(() => {
    if (video) setView("turn");
  }, [video]);

  const kind = turnLabel === "Film" ? "video" : "spin";
  const showingTurn = view === "turn" && Boolean(video);
  const videoPhase = phase === "spin" || phase === "video";
  const composing = phase === "tryon" && !image; // try-on still being composed
  const hasResult = Boolean(image || video);
  const shownLookId = showingTurn ? videoLookId : imageLookId;

  function download() {
    const url = showingTurn ? video : image;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `onetap-${productId ?? "look"}-${showingTurn ? "result" : "tryon"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    track(EVENTS.RESULT_DOWNLOADED, { kind: showingTurn ? kind : "tryon", productId, lookId: shownLookId });
  }
  async function share() {
    if (!shownLookId) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/look/${shownLookId}`);
    } catch {
      /* clipboard unavailable */
    }
    track(EVENTS.RESULT_SHARED, { kind: showingTurn ? kind : "tryon", productId, lookId: shownLookId });
  }
  function shop() {
    if (!buyUrl) return;
    track(EVENTS.PURCHASE_CLICKED, { productId, lookId: shownLookId, kind: showingTurn ? kind : "tryon" });
    window.open(buyUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="modal-stage">
      {/* left thumbnail rail — try-on still (middleware) + the moving result */}
      {(image || video || videoPhase) && (
        <div className="thumbrail">
          {image && (
            <div
              className={"trthumb" + (!showingTurn ? " on" : "")}
              onClick={() => setView("tryon")}
              role="button"
              aria-label="View try-on image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" />
              <span className="tl">Try-On</span>
            </div>
          )}
          {video ? (
            <div
              className={"trthumb" + (showingTurn ? " on" : "")}
              onClick={() => setView("turn")}
              role="button"
              aria-label={`View ${turnLabel}`}
            >
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt="" />
              ) : (
                <video src={video} muted playsInline />
              )}
              <span className="tl">{turnLabel}</span>
            </div>
          ) : videoPhase ? (
            <div className="trthumb" aria-label={`${turnLabel} generating`}>
              <span className="ph">{turnLabel}…</span>
            </div>
          ) : null}
        </div>
      )}

      <div className="media-col">
        <div className="media">
          <div className="inset" />

          {/* the moving result (final) */}
          {showingTurn && (
            <>
              <video className="base" src={video!} poster={poster ?? undefined} autoPlay loop muted playsInline />
              <div className="turn-ctl">
                <div className="deg">
                  <span className="d">{turnLabel}</span>
                  <span className="label">{turnSub}</span>
                </div>
              </div>
            </>
          )}

          {/* the try-on still — shown while the result composes, or when toggled */}
          {!showingTurn && image && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="base" src={image} alt="" style={{ transform: "scale(1.02)" }} />
              {videoPhase ? (
                <GenerationProgress phase={kind} compact />
              ) : caption ? (
                <div className="media-cap">
                  <div className="label h">{caption.brand}</div>
                  <div className="n">{caption.name}</div>
                </div>
              ) : null}
            </>
          )}

          {/* composing the try-on still (no image yet) */}
          {composing && <GenerationProgress phase="tryon" />}

          {/* generating the moving result with no still to show (Studio/Creator) */}
          {!hasResult && !composing && videoPhase && <GenerationProgress phase={kind} />}

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
      </div>

      {/* action rail */}
      <div className="actrail">
        {onSave && (
          <button className={"act" + (wished ? " on" : "")} onClick={onSave} title="Save">
            <Heart className="fillable" size={18} strokeWidth={1.4} />
          </button>
        )}
        <button className="act" onClick={download} disabled={!hasResult} title="Download">
          <Download size={18} strokeWidth={1.4} />
        </button>
        <button className="act" onClick={share} disabled={!shownLookId} title="Share">
          <Share2 size={18} strokeWidth={1.4} />
        </button>
        {buyUrl && (
          <button className="act" onClick={shop} title="Shop this piece">
            <ShoppingBag size={18} strokeWidth={1.4} />
          </button>
        )}
      </div>
    </div>
  );
}
