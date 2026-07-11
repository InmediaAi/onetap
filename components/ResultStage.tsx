"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Heart, Download, Share2, ShoppingBag } from "lucide-react";
import ResultMedia from "@/components/result/ResultMedia";
import { useToast } from "@/components/Toast";
import { downloadAsset } from "@/lib/download";
import { lookUrl } from "@/lib/data/links";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

/**
 * Shared try-on result stage - the SAME experience across Curator, 360° and
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
  caption?: { brand: string; name?: string } | null;
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
  /** Replaces the default turn label over the video (e.g. campaign watermark). */
  videoOverlay?: ReactNode;
  /** When explicitly false, Download/Share are blocked and call onLocked
      instead (e.g. behind a campaign membership). Defaults to allowed. */
  canKeep?: boolean;
  onLocked?: () => void;
  /** Action buttons rendered BELOW the media (e.g. FIFA's Download + Explore).
      When set, the right-side icon rail is hidden - the footer owns the actions. */
  footer?: ReactNode;
}

export default function ResultStage({
  image,
  video,
  poster,
  phase = null,
  turnLabel = "360°",
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
  videoOverlay,
  canKeep,
  onLocked,
  footer,
}: ResultStageProps) {
  const toast = useToast();
  const [view, setView] = useState<"tryon" | "turn">("turn");
  useEffect(() => {
    if (video) setView("turn");
  }, [video]);

  const kind = turnLabel === "Film" ? "video" : "spin";
  const showingTurn = view === "turn" && Boolean(video);
  const videoPhase = phase === "spin" || phase === "video";
  const shownLookId = showingTurn ? videoLookId : imageLookId;

  // Download/Share are only offered once the video clip exists and target THAT
  // clip — the still-image had no shareable purpose and could fail to download.
  async function download() {
    if (canKeep === false) { onLocked?.(); return; }
    if (!video) return;
    const filename = `onetap-${productId ?? "look"}-result`;
    const viewUrl = await downloadAsset(video, filename);
    toast.success("Download complete", {
      action: { label: "View", onClick: () => window.open(viewUrl, "_blank", "noopener") },
    });
    track(EVENTS.RESULT_DOWNLOADED, { kind, productId, lookId: videoLookId });
  }
  async function share() {
    if (canKeep === false) { onLocked?.(); return; }
    if (!videoLookId) return;
    const url = lookUrl(videoLookId, window.location.origin);
    const title = caption?.name
      ? `${caption.brand} — ${caption.name} · OneTap Atelier`
      : "My OneTap Atelier try-on";
    track(EVENTS.RESULT_SHARED, { kind, productId, lookId: videoLookId });

    // Native share sheet where available (mostly mobile) — the expected "share".
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch (e) {
        // User dismissed the sheet → nothing more to do; any other error falls
        // through to the copy-link fallback below.
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }

    // Fallback: copy the shareable link and confirm it (matches Download's toast).
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — share it anywhere");
    } catch {
      toast.error("Couldn’t open share. Copy the link from your browser.");
    }
  }
  function shop() {
    if (!buyUrl) return;
    track(EVENTS.PURCHASE_CLICKED, { productId, lookId: shownLookId, kind: showingTurn ? kind : "tryon" });
    window.open(buyUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="modal-stage">
      {/* left thumbnail rail — status-labelled reference frames: the try-on still
          (image) + the moving result (video). Each frame reports its own state so
          the wait is informative. */}
      {(image || video || videoPhase || phase === "tryon") && (
        <div className="thumbrail">
          {/* Image try-on */}
          {image ? (
            <div
              className={"trthumb" + (!showingTurn ? " on" : "")}
              onClick={() => setView("tryon")}
              role="button"
              aria-label="View image try-on"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" />
              <span className="tl">✓ Image Try-On</span>
            </div>
          ) : phase === "tryon" ? (
            <div className="trthumb" aria-label="Image try-on generating">
              <span className="ph">Creating Image Try-On…</span>
            </div>
          ) : null}

          {/* Video try-on (360° / film) */}
          {video ? (
            <div
              className={"trthumb" + (showingTurn ? " on" : "")}
              onClick={() => setView("turn")}
              role="button"
              aria-label="View video try-on"
            >
              {poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={poster} alt="" />
              ) : (
                <video src={video} muted playsInline />
              )}
              <span className="tl">✓ Video Try-On</span>
            </div>
          ) : videoPhase ? (
            <div className="trthumb" aria-label="Video try-on generating">
              <span className="ph">Creating Video Try-On…</span>
            </div>
          ) : null}
        </div>
      )}

      <div className="media-col">
        <ResultMedia
          className="media"
          video={video}
          poster={poster}
          image={image}
          showVideo={showingTurn}
          phase={phase}
          sound={kind === "video"}
          videoOverlay={videoOverlay}
          caption={
            caption ? (
              <div className="media-cap">
                <div className="label h">{caption.brand}</div>
                {caption.name && <div className="n">{caption.name}</div>}
              </div>
            ) : null
          }
          error={error}
          mono={mono}
          emptyState={emptyState}
        />
        {/* Campaign footer actions - sit directly under the clip (e.g. FIFA's
            Download + Explore). When present, they replace the icon rail below. */}
        {footer && <div className="media-foot">{footer}</div>}
      </div>

      {/* action rail - hidden when a footer owns the actions */}
      {!footer && (
        <div className="actrail">
          {onSave && (
            <button className={"act" + (wished ? " on" : "")} onClick={onSave} title="Save">
              <Heart className="fillable" size={18} strokeWidth={1.4} />
            </button>
          )}
          {/* Download + Share appear only once the video clip is ready. */}
          {video && (
            <>
              <button className="act" onClick={download} title="Download">
                <Download size={18} strokeWidth={1.4} />
              </button>
              <button className="act" onClick={share} disabled={!videoLookId} title="Share">
                <Share2 size={18} strokeWidth={1.4} />
              </button>
            </>
          )}
          {buyUrl && (
            <button className="act" onClick={shop} title="Shop this piece">
              <ShoppingBag size={18} strokeWidth={1.4} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
