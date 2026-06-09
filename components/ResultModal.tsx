"use client";

import { useEffect } from "react";
import { X, ShoppingBag } from "lucide-react";
import ResultStage, { type ResultStageProps } from "@/components/ResultStage";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

/**
 * The shared try-on popup — identical chrome (scrim · top bar · stage) for the
 * Curator, 360° and Creator modules. Wraps ResultStage so the result + progress
 * experience is the same everywhere.
 */

interface ResultModalProps extends ResultStageProps {
  open: boolean;
  onClose: () => void;
  brand?: string; // top-left label
  name?: string; // top-left subtitle
  price?: string; // top-right
}

export default function ResultModal({
  open,
  onClose,
  brand,
  name,
  price,
  ...stage
}: ResultModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const hasResult = Boolean(stage.image || stage.video);

  function shop() {
    if (!stage.buyUrl) return;
    track(EVENTS.PURCHASE_CLICKED, {
      productId: stage.productId,
      lookId: stage.videoLookId ?? stage.imageLookId,
    });
    window.open(stage.buyUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).classList.contains("modal-scrim")) onClose();
      }}
    >
      <div className="modal-top">
        <div className="mt-info">
          {brand && <span className="label h">{brand}</span>}
          {name && <span className="n">{name}</span>}
        </div>
        <div className="mt-right">
          {price && <span className="price">{price}</span>}
          {stage.buyUrl && hasResult && (
            <button className="shop-cta" onClick={shop}>
              <ShoppingBag size={14} strokeWidth={1.5} /> Shop this piece
            </button>
          )}
          <button className="mclose" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <ResultStage {...stage} />
    </div>
  );
}
