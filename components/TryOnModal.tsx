"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Heart, Download, Share2 } from "lucide-react";
import { formatPrice, type Product } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

/**
 * Curator try-on. One tap on a card auto-composes the on-you image (free), then
 * the 360° turn (consumes a video). The try-on image shows while the 360° is
 * generating; the looping 360° is the final result. No controls/composer.
 */

interface Asset {
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  lookId: string;
}

const PROC_STEPS = [
  "Reading the piece",
  "Studying your likeness",
  "Composing the fitting",
  "Resolving",
];

export default function TryOnModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const portrait = useAtelier((s) => s.portrait);
  const addLook = useAtelier((s) => s.addLook);
  const wished = useAtelier((s) => (product ? s.wishlist.includes(product.id) : false));
  const toggleWish = useAtelier((s) => s.toggleWish);

  const [tryon, setTryon] = useState<Asset | null>(null);
  const [turn, setTurn] = useState<Asset | null>(null);
  const [tryonLoading, setTryonLoading] = useState(false);
  const [turnLoading, setTurnLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"tryon" | "turn">("turn");
  const [procStep, setProcStep] = useState(0);

  const startedFor = useRef<string | null>(null);
  const curId = useRef<string | null>(null);
  curId.current = product?.id ?? null;

  const open = Boolean(product);

  // Reset outputs whenever the product changes (and forget the start guard on close).
  useEffect(() => {
    setTryon(null);
    setTurn(null);
    setError(null);
    setView("turn");
    setTryonLoading(false);
    setTurnLoading(false);
    if (!product) startedFor.current = null;
  }, [product?.id]);

  // Auto-compose: try-on (free) → 360° (1 video). Runs once per opened product.
  useEffect(() => {
    if (!product || !portrait) return;
    if (startedFor.current === product.id) return;
    startedFor.current = product.id;

    const pid = product.id;
    const like = portrait;
    const pImg = product.imageUrl;

    (async () => {
      // 1) Try-on image — always free.
      setTryonLoading(true);
      const t0 = Date.now();
      track(EVENTS.GENERATION_STARTED, { kind: "tryon", productId: pid });
      let img: string | undefined;
      try {
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userImage: like, productImage: pImg, productId: pid }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        img = data.imageUrl; // our durable URL
        if (curId.current !== pid) return;
        const lookId: string = data.lookId;
        setTryon({ imageUrl: img, lookId });
        addLook({ id: lookId, productId: pid, kind: "tryon", inputImage: like, assetUrl: img!, createdAt: Date.now() });
        track(EVENTS.GENERATION_COMPLETED, { kind: "tryon", productId: pid, lookId, durationMs: Date.now() - t0 });
      } catch (e) {
        if (curId.current !== pid) return;
        track(EVENTS.GENERATION_FAILED, { kind: "tryon", productId: pid, error: e instanceof Error ? e.message : "unknown" });
        setError(e instanceof Error ? e.message : "Generation failed");
        setTryonLoading(false);
        return;
      }
      setTryonLoading(false);
      if (curId.current !== pid || !img) return;

      // 2) 360° turn — consumes a video.
      setTurnLoading(true);
      const t1 = Date.now();
      track(EVENTS.GENERATION_STARTED, { kind: "spin", productId: pid });
      try {
        const res = await fetch("/api/generate-360", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: img, productId: pid }),
        });
        if (res.status === 402) {
          if (curId.current !== pid) return;
          track(EVENTS.VIDEO_LIMIT_REACHED, { kind: "spin", productId: pid });
          useAtelier.getState().openPricing();
          setError("Video limit reached — subscribe to see the 360°.");
          setTurnLoading(false);
          return; // keep showing the try-on image
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        if (curId.current !== pid) return;
        const lookId: string = data.lookId;
        setTurn({ videoUrl: data.videoUrl, posterUrl: data.posterUrl, lookId });
        setView("turn");
        addLook({ id: lookId, productId: pid, kind: "spin", inputImage: img, assetUrl: data.videoUrl, posterUrl: data.posterUrl, createdAt: Date.now() });
        track(EVENTS.GENERATION_COMPLETED, { kind: "spin", productId: pid, lookId, durationMs: Date.now() - t1 });
      } catch (e) {
        if (curId.current !== pid) return;
        track(EVENTS.GENERATION_FAILED, { kind: "spin", productId: pid, error: e instanceof Error ? e.message : "unknown" });
        setError(e instanceof Error ? e.message : "Generation failed");
      } finally {
        if (curId.current === pid) setTurnLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, portrait]);

  // Cycle the processing label while the try-on is composing.
  useEffect(() => {
    if (!tryonLoading) return;
    setProcStep(0);
    const t = setInterval(() => setProcStep((s) => Math.min(s + 1, PROC_STEPS.length - 1)), 900);
    return () => clearInterval(t);
  }, [tryonLoading]);

  // Scroll lock + escape-to-close.
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

  if (!product) return null;

  const showingTurn = view === "turn" && Boolean(turn?.videoUrl);
  const shownAsset = showingTurn ? turn : tryon;
  const composingFitting = tryonLoading && !tryon;

  function download() {
    const url = shownAsset?.videoUrl ?? shownAsset?.imageUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `onetap-${product!.id}-${showingTurn ? "360" : "tryon"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    track(EVENTS.RESULT_DOWNLOADED, { kind: showingTurn ? "spin" : "tryon", productId: product!.id, lookId: shownAsset?.lookId });
  }

  async function share() {
    if (!shownAsset) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/look/${shownAsset.lookId}`);
    } catch {
      /* clipboard unavailable */
    }
    track(EVENTS.RESULT_SHARED, { kind: showingTurn ? "spin" : "tryon", productId: product!.id, lookId: shownAsset.lookId });
  }

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).classList.contains("modal-scrim")) onClose();
      }}
    >
      {/* top */}
      <div className="modal-top">
        <div className="mt-info">
          <span className="label h">{product.brand}</span>
          <span className="n">{product.name}</span>
        </div>
        <div className="mt-right">
          <span className="price">{formatPrice(product.price)}</span>
          <button className="mclose" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* stage */}
      <div className="modal-stage">
        {/* left thumbnail rail — try-on image (middleware) + the 360° result */}
        {portrait && (tryon?.imageUrl || turn?.videoUrl || turnLoading) && (
          <div className="thumbrail">
            {tryon?.imageUrl && (
              <div
                className={"trthumb" + (!showingTurn ? " on" : "")}
                onClick={() => setView("tryon")}
                role="button"
                aria-label="View try-on image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tryon.imageUrl} alt="" />
                <span className="tl">Try-On</span>
              </div>
            )}
            {turn?.videoUrl ? (
              <div
                className={"trthumb" + (showingTurn ? " on" : "")}
                onClick={() => setView("turn")}
                role="button"
                aria-label="View 360° video"
              >
                {turn.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={turn.posterUrl} alt="" />
                ) : (
                  <video src={turn.videoUrl} muted playsInline />
                )}
                <span className="tl">360°</span>
              </div>
            ) : turnLoading ? (
              <div className="trthumb" aria-label="360° generating">
                <span className="ph">360°…</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="media-col">
          <div className="media">
            <div className="inset" />

            {/* no likeness — invite to onboard */}
            {!portrait && (
              <div className="ph">
                <div className="mono">{product.mono}</div>
                <div className="pm">
                  Add your likeness to see {product.name} on you.{" "}
                  <Link href="/onboarding" className="sl-link">
                    Add yours →
                  </Link>
                </div>
              </div>
            )}

            {/* the 360° (final result) */}
            {portrait && showingTurn && (
              <>
                <video className="base" src={turn!.videoUrl} poster={turn!.posterUrl} autoPlay loop muted playsInline />
                <div className="turn-ctl">
                  <div className="deg">
                    <span className="d">360°</span>
                    <span className="label">The Turn</span>
                  </div>
                </div>
              </>
            )}

            {/* the try-on image — shown while the 360° composes, or when toggled */}
            {portrait && !showingTurn && tryon?.imageUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="base" src={tryon.imageUrl} alt="" style={{ transform: "scale(1.02)" }} />
                {turnLoading ? (
                  <div className="turn-loading">
                    <span className="tl-dot" /> Composing the 360°…
                  </div>
                ) : (
                  <div className="media-cap">
                    <div className="label h">{product.brand}</div>
                    <div className="n">{product.name}</div>
                  </div>
                )}
              </>
            )}

            {/* composing the fitting (no image yet) */}
            {portrait && composingFitting && (
              <div className="mproc">
                <div className="dotfield" />
                <div className="pl">{PROC_STEPS[procStep]}</div>
              </div>
            )}

            {/* error with nothing to show */}
            {portrait && error && !tryon && !turnLoading && (
              <div className="ph">
                <div className="mono">{product.mono}</div>
                <div className="pm">{error}</div>
              </div>
            )}
          </div>
        </div>

        {/* action rail */}
        <div className="actrail">
          <button
            className={"act" + (wished ? " on" : "")}
            onClick={() => toggleWish(product.id)}
            title="Save"
          >
            <Heart className="fillable" size={18} strokeWidth={1.4} />
          </button>
          <button className="act" onClick={download} disabled={!shownAsset} title="Download">
            <Download size={18} strokeWidth={1.4} />
          </button>
          <button className="act" onClick={share} disabled={!shownAsset} title="Share">
            <Share2 size={18} strokeWidth={1.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
