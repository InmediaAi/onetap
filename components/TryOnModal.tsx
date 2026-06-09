"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice, type Product } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { getAttribution } from "@/lib/analytics/utm";
import ResultModal from "@/components/ResultModal";

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

  const startedFor = useRef<string | null>(null);
  const curId = useRef<string | null>(null);
  curId.current = product?.id ?? null;

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
          body: JSON.stringify({
            userImage: like,
            productImage: pImg,
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
  }, [product?.id, portrait]);

  if (!product) return null;

  const composingFitting = tryonLoading && !tryon;
  const phase: "tryon" | "spin" | null = composingFitting
    ? "tryon"
    : turnLoading
      ? "spin"
      : null;

  return (
    <ResultModal
      open={Boolean(product)}
      onClose={onClose}
      brand={product.brand}
      name={product.name}
      price={formatPrice(product.price)}
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
        !portrait ? (
          <div className="ph">
            <div className="mono">{product.mono}</div>
            <div className="pm">
              Add your likeness to see {product.name} on you.{" "}
              <Link href="/onboarding" className="sl-link">
                Add yours →
              </Link>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
