"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Share2, Check } from "lucide-react";
import Header from "@/components/Header";
import { useToast } from "@/components/Toast";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { hasVideoQuota } from "@/lib/billing/gate";
import { downloadAsset } from "@/lib/download";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { type Product } from "@/lib/data/products";

interface ResolvedLook {
  kind: string;
  assetUrl: string;
  posterUrl?: string;
  productId?: string;
  campaign?: string;
}

export default function LookPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const hydrated = useHydrated();
  const storeLook = useAtelier((s) => s.looks.find((l) => l.id === params.id));
  const usage = useAtelier((s) => s.usage);
  const profileLoaded = useAtelier((s) => s.profileLoaded);
  const openPricing = useAtelier((s) => s.openPricing);

  const [look, setLook] = useState<ResolvedLook | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState<Product | undefined>();
  const [copied, setCopied] = useState(false);

  const isMember = profileLoaded && usage.status === "active" && Boolean(usage.planId);

  // Back to where they came from (their closet); fall back to /closet on a
  // direct/shared open with no in-app history.
  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/closet");
  }

  // Play clips WITH sound by default. If the browser blocks unmuted autoplay
  // (no carried-over gesture), fall back to muted + a one-tap "Tap for sound".
  const videoRef = useRef<HTMLVideoElement>(null);
  const [needsUnmute, setNeedsUnmute] = useState(false);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !look || look.kind === "tryon") return;
    setNeedsUnmute(false);
    v.muted = false;
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(() => {
        v.muted = true;
        v.play().catch(() => {});
        setNeedsUnmute(true);
      });
    }
  }, [look]);

  function enableSound() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    void v.play().catch(() => {});
    setNeedsUnmute(false);
  }

  // Download the asset. Campaign clips (e.g. FIFA) keep the hard paywall:
  // active subscription + remaining quota, else the pricing prompt.
  async function downloadLook() {
    if (!look) return;
    if (look.campaign && !(isMember && hasVideoQuota(usage))) {
      openPricing();
      return;
    }
    const viewUrl = await downloadAsset(look.assetUrl, `onetap-${look.kind}-${params.id}`);
    toast.success("Download complete", {
      action: { label: "View", onClick: () => window.open(viewUrl, "_blank", "noopener") },
    });
    track(EVENTS.RESULT_DOWNLOADED, { kind: look.kind, lookId: params.id, productId: look.productId });
  }

  // Share is open — it shares this public preview link, not the file.
  async function shareLook() {
    if (!look) return;
    const url = window.location.href;
    track(EVENTS.RESULT_SHARED, { kind: look.kind, lookId: params.id, productId: look.productId });
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        /* dismissed — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  // Resolve the look: local store first, else the public API (cross-device).
  useEffect(() => {
    if (!hydrated) return;
    if (storeLook) {
      setLook({
        kind: storeLook.kind,
        assetUrl: storeLook.assetUrl,
        posterUrl: storeLook.posterUrl,
        productId: storeLook.productId,
      });
      return;
    }
    let active = true;
    fetch(`/api/looks/${encodeURIComponent(params.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return;
        if (d?.look) setLook(d.look);
        else setNotFound(true);
      })
      .catch(() => active && setNotFound(true));
    return () => {
      active = false;
    };
  }, [hydrated, storeLook, params.id]);

  // Resolve product label, if any.
  useEffect(() => {
    const pid = look?.productId;
    if (!pid) return;
    let active = true;
    fetch(`/api/products/${encodeURIComponent(pid)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d?.product && setProduct(d.product))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [look?.productId]);

  return (
    <main>
      <Header />

      <section className="mx-auto flex max-w-editorial flex-col items-center overflow-x-hidden px-6 py-6 text-center md:py-14">
        <button
          onClick={goBack}
          className="mb-6 inline-flex items-center gap-2 self-start text-sm text-muted transition-colors hover:text-ink"
          aria-label="Back to closet"
        >
          <ArrowLeft size={16} strokeWidth={1.6} /> Closet
        </button>

        {!hydrated || (!look && !notFound) ? (
          <div className="shimmer mt-4 aspect-[9/16] h-[56svh] max-h-[600px] w-auto md:h-[64svh]" />
        ) : !look ? (
          <div className="flex flex-col items-center gap-6 py-20">
            <p className="font-display text-3xl">This look isn’t here</p>
            <p className="max-w-full text-muted md:max-w-md">
              The link may have expired or been removed. Create your own to see it
              visualized on you.
            </p>
            <Link href="/" className="btn-line">
              Create Your Own Look
            </Link>
          </div>
        ) : (
          <>
            <p className="eyebrow">OneTap Atelier</p>
            {product && (
              <h1 className="mt-3 max-w-full font-display text-2xl leading-tight md:max-w-2xl md:text-4xl">
                {product.brand} — {product.name}
              </h1>
            )}

            {/* Height-driven so the full clip/image fits the viewport (no scroll);
                width follows the 9:16 ratio. svh excludes mobile browser chrome. */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative mt-4 aspect-[9/16] h-[56svh] max-h-[600px] w-auto max-w-full overflow-hidden bg-ivoryPanel md:mt-6 md:h-[64svh]"
            >
              {look.kind === "tryon" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={look.assetUrl}
                  alt="Generated look"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    src={look.assetUrl}
                    poster={look.posterUrl}
                    controls
                    controlsList="nodownload noplaybackrate noremoteplayback"
                    disablePictureInPicture
                    onContextMenu={(e) => e.preventDefault()}
                    loop
                    playsInline
                    preload="metadata"
                    className="absolute inset-0 h-full w-full object-contain"
                  />
                  {needsUnmute && (
                    <button type="button" className="unmute" onClick={enableSound}>
                      🔊 Tap for sound
                    </button>
                  )}
                </>
              )}
            </motion.div>

            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={downloadLook}
                className="btn-line inline-flex items-center gap-2"
              >
                <Download size={15} strokeWidth={1.5} /> Download
              </button>
              <button
                onClick={shareLook}
                className="btn-line inline-flex items-center gap-2"
              >
                {copied ? <Check size={15} strokeWidth={1.7} /> : <Share2 size={15} strokeWidth={1.5} />}
                {copied ? "Copied" : "Share"}
              </button>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              {look.campaign === "fifa-worldcup" ? (
                <>
                  <p className="text-sm text-muted">Made with Viral Fan · by OneTap.</p>
                  <Link
                    href="/fifa?utm_campaign=fifa-worldcup&utm_source=share&utm_medium=look"
                    className="btn-line"
                  >
                    Try your team’s jersey →
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted">Visualized with OneTap Atelier.</p>
                  <Link href="/" className="btn-line">
                    Create Your Own Look
                  </Link>
                </>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
