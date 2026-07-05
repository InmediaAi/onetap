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
import { toast } from "@/lib/toast/bus";
import ResultStage from "@/components/ResultStage";
import TryOnIsland from "@/components/TryOnIsland";

/**
 * Global try-on controller - shared by the Curator (360°), the 360 module and
 * the Creator (film). Mounted once in the root layout so the generation + its
 * "Dynamic Island" survive page navigation. One tap (via store.startTryOn(job))
 * auto-composes the on-you image (free) then the video (spin or film, consumes a
 * video). ISLAND_COLLAPSE_MS after opening, the modal collapses into a floating
 * island (the user keeps browsing - even on other pages) and auto-expands back
 * into the result when the clip is ready. Single-session: store.startTryOn
 * refuses a second run while one is active.
 */

/** How long the expanded modal stays before collapsing to the floating island. */
const ISLAND_COLLAPSE_MS = 2000;

interface Asset {
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  lookId: string;
}

export default function TryOnProvider() {
  const job = useAtelier((s) => s.activeTryOn);
  const closeTryOn = useAtelier((s) => s.closeTryOn);
  // Try-on requires the FULL-LENGTH photo as the primary likeness - a face-only
  // selfie produces a broken full-body result, so we gate on `body`, not portrait.
  const body = useAtelier((s) => s.body);
  const addLook = useAtelier((s) => s.addLook);
  const wished = useAtelier((s) =>
    job?.wishable ? s.wishlist.includes(job.productId) : false,
  );
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
  curId.current = job?.id ?? null;

  const onClose = () => closeTryOn();

  // Keep the island anchored just below the header at any breakpoint (the mobile
  // nav wraps taller) - measure the sticky header and expose it as a CSS var.
  useEffect(() => {
    const measure = () => {
      const h = document.querySelector(".topbar")?.getBoundingClientRect().height;
      if (h) document.documentElement.style.setProperty("--otp-header-h", `${Math.round(h)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // re-measure when a session opens (header may differ per page/breakpoint)
  }, [job?.id]);

  // Reset outputs whenever the job changes (and forget the start guard on close).
  useEffect(() => {
    setTryon(null);
    setTurn(null);
    setError(null);
    setTryonLoading(false);
    setTurnLoading(false);
    if (!job) startedFor.current = null;
  }, [job?.id]);

  // Auto-compose: try-on image (free) → video (spin/film, 1 video). Once per job.
  useEffect(() => {
    if (!job || !body) return;
    if (startedFor.current === job.id) return;
    startedFor.current = job.id;

    const jid = job.id;
    const pid = job.productId;
    const kind = job.kind; // "spin" → /api/generate-360, "video" → /api/generate-video
    const videoUrl = kind === "spin" ? "/api/generate-360" : "/api/generate-video";
    const like = body;
    const pImg = job.garmentImage;
    // Send every view of the piece so the provider renders it more faithfully.
    const pImgs = job.garmentImages?.length ? job.garmentImages : [job.garmentImage];
    const prompt = job.prompt;

    (async () => {
      // 1) Try-on image - always free. (Plain still; the prompt applies to the film.)
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
        if (curId.current !== jid) return;
        const lookId: string = data.lookId;
        setTryon({ imageUrl: img, lookId });
        addLook({ id: lookId, productId: pid, kind: "tryon", inputImage: like, assetUrl: img!, createdAt: Date.now() });
        track(EVENTS.GENERATION_COMPLETED, { kind: "tryon", productId: pid, lookId, durationMs: Date.now() - t0 });
      } catch (e) {
        if (curId.current !== jid) return;
        track(EVENTS.GENERATION_FAILED, { kind: "tryon", productId: pid, error: e instanceof Error ? e.message : "unknown" });
        const msg = e instanceof Error && e.message ? e.message : "We couldn't create your try-on. Please try again.";
        setError(msg);
        toast.error(msg);
        setTryonLoading(false);
        return;
      }
      setTryonLoading(false);
      if (curId.current !== jid || !img) return;

      // 2) Video (360° turn or film) - consumes a video.
      setTurnLoading(true);
      const t1 = Date.now();
      track(EVENTS.GENERATION_STARTED, { kind, productId: pid });
      try {
        const res = await fetch(videoUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: img,
            prompt: prompt || undefined,
            productId: pid,
            campaign: getAttribution()?.utm_campaign,
          }),
        });
        if (res.status === 401) {
          if (curId.current !== jid) return;
          track(EVENTS.SIGN_IN_REQUIRED, { kind, productId: pid });
          useAtelier.getState().openSignIn();
          setTurnLoading(false);
          return; // keep showing the try-on image
        }
        if (res.status === 402) {
          if (curId.current !== jid) return;
          track(EVENTS.VIDEO_LIMIT_REACHED, { kind, productId: pid });
          useAtelier.getState().openPricing();
          setError(`Video limit reached - subscribe to see the ${job.turnLabel}.`);
          setTurnLoading(false);
          return; // keep showing the try-on image
        }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");
        if (curId.current !== jid) return;
        const lookId: string = data.lookId;
        setTurn({ videoUrl: data.videoUrl, posterUrl: data.posterUrl, lookId });
        addLook({ id: lookId, productId: pid, kind, inputImage: img, assetUrl: data.videoUrl, posterUrl: data.posterUrl, createdAt: Date.now() });
        track(EVENTS.GENERATION_COMPLETED, { kind, productId: pid, lookId, durationMs: Date.now() - t1 });
      } catch (e) {
        if (curId.current !== jid) return;
        track(EVENTS.GENERATION_FAILED, { kind, productId: pid, error: e instanceof Error ? e.message : "unknown" });
        const msg = e instanceof Error && e.message ? e.message : "We couldn't finish your video. Please try again.";
        setError(msg);
        toast.error(msg);
      } finally {
        if (curId.current === jid) setTurnLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id, body]);

  // A terminal state = there's a result to show (the 360°) or an error/limit.
  const terminal = Boolean(turn) || Boolean(error);
  const terminalRef = useRef(terminal);
  terminalRef.current = terminal;
  // Only collapse while generation is actually running - NOT for the no-photo
  // empty state or an instant error (else the island would show "in progress…"
  // with nothing generating).
  const inFlightRef = useRef(false);
  inFlightRef.current = (tryonLoading || turnLoading) && !terminal;

  // Per opened job: start expanded, then collapse to the island after the delay
  // if it's still generating. Auto-expand the moment it reaches a terminal state.
  useEffect(() => {
    if (!job) return;
    setView("expanded");
    const t = setTimeout(() => {
      if (inFlightRef.current) setView("island");
    }, ISLAND_COLLAPSE_MS);
    return () => clearTimeout(t);
  }, [job?.id]);
  useEffect(() => {
    if (terminal) setView("expanded");
  }, [terminal]);

  // Lock body scroll only while the full modal is up (island lets the page scroll).
  useEffect(() => {
    if (!job) return;
    document.body.style.overflow = view === "expanded" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [job, view]);

  // Escape closes the expanded modal.
  useEffect(() => {
    if (!job || view !== "expanded") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, view]);

  if (!job || !mounted) return null;

  const composingFitting = tryonLoading && !tryon;
  const phase: "tryon" | "spin" | "video" | null = composingFitting
    ? "tryon"
    : turnLoading
      ? job.kind === "video"
        ? "video"
        : "spin"
      : null;
  const hasResult = Boolean(tryon || turn);
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 360, damping: 32 };

  function shop() {
    if (!job?.buyUrl) return;
    track(EVENTS.PURCHASE_CLICKED, { productId: job.productId, lookId: turn?.lookId ?? tryon?.lookId });
    window.open(job.buyUrl, "_blank", "noopener,noreferrer");
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
                <span className="label h">{job.brand}</span>
                {job.name && <span className="n">{job.name}</span>}
              </div>
              <div className="mt-right">
                {job.price && <span className="price">{formatPrice(job.price)}</span>}
                {job.buyUrl && hasResult && (
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
              turnLabel={job.turnLabel}
              turnSub={job.turnSub}
              caption={{ brand: job.brand, name: job.name }}
              buyUrl={job.buyUrl}
              imageLookId={tryon?.lookId}
              videoLookId={turn?.lookId}
              productId={job.productId}
              wished={wished}
              onSave={job.wishable ? () => toggleWish(job.productId) : undefined}
              error={error}
              mono={job.mono}
              emptyState={
                !body ? (
                  <div className="ph">
                    {job.mono && <div className="mono">{job.mono}</div>}
                    <div className="pm">
                      Add a full-length photo to see {job.name ?? "this"} on you.{" "}
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
              image={job.thumbImage}
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
