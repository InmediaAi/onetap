"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { getAttribution } from "@/lib/analytics/utm";
import ResultStage from "@/components/ResultStage";
import TryOnIsland from "@/components/TryOnIsland";

/**
 * Global Curator try-on controller. Mounted once in the root layout so the
 * generation + its "Dynamic Island" survive page navigation. One tap on a card
 * (via store.startTryOn) auto-composes the on-you image (free) then the 360°
 * turn (consumes a video). 5s after opening the modal collapses into a floating
 * island (the user keeps browsing — even on other pages) and auto-expands back
 * into the result when the clip is ready. Single-session: store.startTryOn
 * refuses a second run while one is active.
 */

interface Asset {
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  lookId: string;
}

export default function TryOnProvider() {
  const product = useAtelier((s) => s.activeTryOn);
  const closeTryOn = useAtelier((s) => s.closeTryOn);
  // Try-on requires the FULL-LENGTH photo as the primary likeness — a face-only
  // selfie produces a broken full-body result, so we gate on `body`, not portrait.
  const body = useAtelier((s) => s.body);
  const addLook = useAtelier((s) => s.addLook);
  const wished = useAtelier((s) => (product ? s.wishlist.includes(product.id) : false));
  const toggleWish = useAtelier((s) => s.toggleWish);

  const [tryon, setTryon] = useState<Asset | null>(null);
  const [turn, setTurn] = useState<Asset | null>(null);
  const [tryonLoading, setTryonLoading] = useState(false);
  const [turnLoading, setTurnLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // expanded modal ↔ collapsed island
  const [view, setView] = useState<"expanded" | "island">("expanded");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const reduce = useReducedMotion();

  const startedFor = useRef<string | null>(null);
  const curId = useRef<string | null>(null);
  curId.current = product?.id ?? null;

  const onClose = () => closeTryOn();

  // Keep the island anchored just below the header at any breakpoint (the mobile
  // nav wraps taller) — measure the sticky header and expose it as a CSS var.
  useEffect(() => {
    const measure = () => {
      const h = document.querySelector(".topbar")?.getBoundingClientRect().height;
      if (h) document.documentElement.style.setProperty("--otp-header-h", `${Math.round(h)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // re-measure when a session opens (header may differ per page/breakpoint)
  }, [product?.id]);

  // Reset outputs whenever the product changes (and forget the start guard on close).
  useEffect(() => {
    setTryon(null);
    setTurn(null);
    setError(null);
    setTryonLoading(false);
    setTurnLoading(false);
    if (!product) startedFor.current = null;
  }, [product?.id]);

  // Auto-compose: try-on (free) → 360° (1 video). Runs once per opened product.
  useEffect(() => {
    if (!product || !body) return;
    if (startedFor.current === product.id) return;
    startedFor.current = product.id;

    const pid = product.id;
    const like = body;
    const pImg = product.imageUrl;
    // Send every view of the piece so the provider renders it more faithfully.
    const pImgs = product.images?.length ? product.images : [product.imageUrl];

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
          body: JSON.stringify({
            userImage: like,
            productImage: pImg,
            productImages: pImgs,
            productId: pid,
            campaign: getAttribution()?.utm_campaign,
          }),
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
          body: JSON.stringify({
            image: img,
            productId: pid,
            campaign: getAttribution()?.utm_campaign,
          }),
        });
        if (res.status === 401) {
          if (curId.current !== pid) return;
          track(EVENTS.SIGN_IN_REQUIRED, { kind: "spin", productId: pid });
          useAtelier.getState().openSignIn();
          setTurnLoading(false);
          return; // keep showing the try-on image
        }
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
  }, [product?.id, body]);

  // A terminal state = there's a result to show (the 360°) or an error/limit.
  const terminal = Boolean(turn) || Boolean(error);
  const terminalRef = useRef(terminal);
  terminalRef.current = terminal;
  // Only collapse while generation is actually running — NOT for the no-photo
  // empty state or an instant error (else the island would show "in progress…"
  // with nothing generating).
  const inFlightRef = useRef(false);
  inFlightRef.current = (tryonLoading || turnLoading) && !terminal;

  // Per opened product: start expanded, then collapse to the island after 5s if
  // it's still generating. Auto-expand the moment it reaches a terminal state.
  useEffect(() => {
    if (!product) return;
    setView("expanded");
    const t = setTimeout(() => {
      if (inFlightRef.current) setView("island");
    }, 5000);
    return () => clearTimeout(t);
  }, [product?.id]);
  useEffect(() => {
    if (terminal) setView("expanded");
  }, [terminal]);

  // Lock body scroll only while the full modal is up (island lets the grid scroll).
  useEffect(() => {
    if (!product) return;
    document.body.style.overflow = view === "expanded" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [product, view]);

  // Escape closes the expanded modal.
  useEffect(() => {
    if (!product || view !== "expanded") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, view]);

  if (!product || !mounted) return null;

  const composingFitting = tryonLoading && !tryon;
  const phase: "tryon" | "spin" | null = composingFitting ? "tryon" : turnLoading ? "spin" : null;
  const hasResult = Boolean(tryon || turn);
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 360, damping: 32 };

  function shop() {
    if (!product?.buyUrl) return;
    track(EVENTS.PURCHASE_CLICKED, { productId: product.id, lookId: turn?.lookId ?? tryon?.lookId });
    window.open(product.buyUrl, "_blank", "noopener,noreferrer");
  }

  return createPortal(
    <div className="tryon-portal" data-view={view}>
      <AnimatePresence>
        {view === "expanded" && (
          <motion.div
            key="scrim"
            className="tryon-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.28 }}
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).classList.contains("tryon-scrim")) onClose();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="popLayout">
        {view === "expanded" ? (
          <motion.div
            key="modal"
            className="tryon-modal"
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -8 }}
            transition={spring}
          >
            <div className="modal-top">
              <div className="mt-info">
                <span className="label h">{product.brand}</span>
                <span className="n">{product.name}</span>
              </div>
              <div className="mt-right">
                <span className="price">{formatPrice(product.price)}</span>
                {product.buyUrl && hasResult && (
                  <button className="shop-cta" onClick={shop}>
                    <ShoppingBag size={14} strokeWidth={1.5} /> Shop
                    <span className="sc-rest">&nbsp;this piece</span>
                  </button>
                )}
                <button className="mclose" onClick={onClose} aria-label="Close">
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <ResultStage
              image={tryon?.imageUrl}
              video={turn?.videoUrl}
              poster={turn?.posterUrl}
              phase={phase}
              turnLabel="360°"
              turnSub="The Turn"
              caption={{ brand: product.brand, name: product.name }}
              buyUrl={product.buyUrl}
              imageLookId={tryon?.lookId}
              videoLookId={turn?.lookId}
              productId={product.id}
              wished={wished}
              onSave={() => toggleWish(product.id)}
              error={error}
              mono={product.mono}
              emptyState={
                !body ? (
                  <div className="ph">
                    <div className="mono">{product.mono}</div>
                    <div className="pm">
                      Add a full-length photo to see {product.name} on you.{" "}
                      <Link href="/onboarding" className="sl-link">
                        Add yours →
                      </Link>
                    </div>
                  </div>
                ) : undefined
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="island"
            className="tryon-island-wrap"
            initial={{ opacity: 0, scale: 0.7, y: -18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: -18 }}
            transition={spring}
          >
            <TryOnIsland
              phase={phase}
              image={product.imageUrl}
              onExpand={() => setView("expanded")}
              onDismiss={onClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
