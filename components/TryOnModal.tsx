"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Heart,
  Download,
  Share2,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Plus,
  ArrowUp,
  User,
  Shirt,
  RotateCw,
  Film,
  Check,
  Upload,
} from "lucide-react";
import type { Product } from "@/lib/data/products";
import type { GenerationKind } from "@/lib/ai/types";
import { useAtelier } from "@/lib/store";
import { createId } from "@/lib/utils";
import { CREDIT_COST } from "@/lib/credits";

type Mode = "fitting" | "turn" | "film";

const MODES: {
  mode: Mode;
  kind: GenerationKind;
  label: string;
  Icon: typeof Shirt;
}[] = [
  { mode: "fitting", kind: "tryon", label: "Try-On", Icon: Shirt },
  { mode: "turn", kind: "spin", label: "360°", Icon: RotateCw },
  { mode: "film", kind: "video", label: "Film", Icon: Film },
];

const ENDPOINTS: Record<GenerationKind, string> = {
  tryon: "/api/generate-image",
  spin: "/api/generate-360",
  video: "/api/generate-video",
};

const PROC_STEPS = [
  "Reading the piece",
  "Studying your likeness",
  "Composing the fitting",
  "Resolving",
];

interface Asset {
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  lookId: string;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function TryOnModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const portrait = useAtelier((s) => s.portrait);
  const setPortrait = useAtelier((s) => s.setPortrait);
  const addLook = useAtelier((s) => s.addLook);
  const wished = useAtelier((s) =>
    product ? s.wishlist.includes(product.id) : false,
  );
  const toggleWish = useAtelier((s) => s.toggleWish);
  const closet = useAtelier((s) => s.closet);
  const addCloset = useAtelier((s) => s.addCloset);
  const removeCloset = useAtelier((s) => s.removeCloset);

  const [mode, setMode] = useState<Mode>("fitting");
  const [results, setResults] = useState<Partial<Record<GenerationKind, Asset>>>({});
  const [loadingKind, setLoadingKind] = useState<GenerationKind | null>(null);
  const [procStep, setProcStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Closet items the user has selected to try on (subset of `closet`).
  const [garments, setGarments] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [closetOpen, setClosetOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  // film playback (bound to the real <video> element)
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [filmT, setFilmT] = useState(0);
  const [duration, setDuration] = useState(10);

  const likenessRef = useRef<HTMLInputElement>(null);
  const closetInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Latest selection, read synchronously inside generate().
  const garmentsRef = useRef<string[]>([]);
  const inflight = useRef<Set<GenerationKind>>(new Set());

  const open = Boolean(product);
  const current = MODES.find((m) => m.mode === mode)!;
  const asset = results[current.kind];
  const loading = loadingKind === current.kind;
  const done = Boolean(asset) && !loading;

  // ——— Generation ———
  const generate = useCallback(
    async (kind: GenerationKind) => {
      if (!product || !portrait) return;
      if (inflight.current.has(kind)) return;

      // Gate on credits BEFORE any paid API call (read live balance).
      const cost = CREDIT_COST[kind];
      if (useAtelier.getState().credits < cost) {
        useAtelier.getState().openPricing();
        setError(`Need ${cost} credits — top up to compose.`);
        return;
      }

      inflight.current.add(kind);
      setError(null);
      setLoadingKind(kind);
      try {
        const garment = garmentsRef.current[0];
        const body =
          kind === "tryon"
            ? {
                userImage: portrait,
                productImage: garment ?? product.imageUrl,
                references: garmentsRef.current,
                prompt: prompt || undefined,
              }
            : { image: results.tryon?.imageUrl ?? portrait, prompt: prompt || undefined };

        const res = await fetch(ENDPOINTS[kind], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Generation failed");

        const lookId = createId();
        const assetUrl: string = kind === "tryon" ? data.imageUrl : data.videoUrl;
        const next: Asset =
          kind === "tryon"
            ? { imageUrl: data.imageUrl, lookId }
            : { videoUrl: data.videoUrl, posterUrl: data.posterUrl, lookId };

        setResults((r) => ({ ...r, [kind]: next }));
        addLook({
          id: lookId,
          productId: product.id,
          kind,
          inputImage: portrait,
          assetUrl,
          posterUrl: data.posterUrl,
          createdAt: Date.now(),
        });
        // Charge only on success (never for a failed generation).
        useAtelier.getState().spendCredits(cost);
        setLoadingKind((cur) => (cur === kind ? null : cur));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Generation failed");
        setLoadingKind((cur) => (cur === kind ? null : cur));
      } finally {
        inflight.current.delete(kind);
      }
    },
    [product, portrait, results.tryon, prompt, addLook],
  );

  // Open / product change → reset only. Generation never starts automatically;
  // the user must tap the compose (↑) arrow (image/video APIs are paid).
  useEffect(() => {
    if (!product) return;
    setMode("fitting");
    setResults({});
    setError(null);
    setPlaying(false);
    setFilmT(0);
    setGarments([]);
    garmentsRef.current = [];
    setPrompt("");
    setClosetOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Cycle the processing label while a generation is in flight.
  useEffect(() => {
    if (!loadingKind) return;
    setProcStep(0);
    const t = setInterval(
      () => setProcStep((s) => Math.min(s + 1, PROC_STEPS.length - 1)),
      900,
    );
    return () => clearInterval(t);
  }, [loadingKind]);

  // Scroll lock + escape-to-close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (closetOpen) setClosetOpen(false);
      else onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, closetOpen]);

  // Stop film playback when leaving film mode.
  useEffect(() => {
    if (mode !== "film") {
      setPlaying(false);
      videoRef.current?.pause();
    }
  }, [mode]);

  if (!product) return null;

  // Clear now-stale outputs when the base (likeness or selection) changes.
  // Does NOT regenerate — the user re-composes manually with the ↑ arrow.
  function resetOutputs() {
    setResults({});
    setError(null);
  }

  function syncGarments(next: string[]) {
    garmentsRef.current = next;
    setGarments(next);
  }

  async function readLikeness(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setPortrait(await readAsDataURL(file));
    resetOutputs();
  }

  // Selection (closet item → try on)
  function toggleSelect(url: string) {
    const next = garmentsRef.current.includes(url)
      ? garmentsRef.current.filter((u) => u !== url)
      : [...garmentsRef.current, url];
    syncGarments(next);
    resetOutputs();
  }

  async function uploadToCloset(files?: FileList | null) {
    if (!files) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    const urls = await Promise.all(imgs.map(readAsDataURL));
    urls.forEach(addCloset);
    syncGarments([
      ...garmentsRef.current,
      ...urls.filter((u) => !garmentsRef.current.includes(u)),
    ]);
    resetOutputs();
  }

  function deleteFromCloset(url: string) {
    removeCloset(url);
    if (garmentsRef.current.includes(url)) {
      syncGarments(garmentsRef.current.filter((u) => u !== url));
      resetOutputs();
    }
  }

  function composeCurrent() {
    setClosetOpen(false); // closet auto-hides once a generation starts
    setResults((r) => ({ ...r, [current.kind]: undefined }));
    generate(current.kind);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  }

  function download() {
    const url = asset?.imageUrl ?? asset?.videoUrl;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `onetap-${product!.id}-${current.mode}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function share() {
    if (!asset) return;
    const url = `${window.location.origin}/look/${asset.lookId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard unavailable */
    }
  }

  const fmt = (t: number) =>
    `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

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
          <span className="price">{product.price}</span>
          <button className="mclose" onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* stage */}
      <div className="modal-stage">
        {/* media */}
        <div className="media-col">
          <div className="media">
            <div className="inset" />

            {/* resolved outputs */}
            {done && mode === "fitting" && asset?.imageUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="base"
                  src={asset.imageUrl}
                  alt=""
                  style={{ transform: "scale(1.02)" }}
                />
                <div className="media-cap">
                  <div className="label h">{product.brand}</div>
                  <div className="n">{product.name}</div>
                </div>
              </>
            )}

            {done && mode === "turn" && asset?.videoUrl && (
              <>
                <video
                  className="base"
                  src={asset.videoUrl}
                  poster={asset.posterUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="turn-ctl">
                  <div className="deg">
                    <span className="d">360°</span>
                    <span className="label">The Turn</span>
                  </div>
                </div>
              </>
            )}

            {done && mode === "film" && asset?.videoUrl && (
              <>
                <video
                  ref={videoRef}
                  className="base"
                  src={asset.videoUrl}
                  poster={asset.posterUrl}
                  muted={muted}
                  playsInline
                  onLoadedMetadata={(e) =>
                    setDuration(e.currentTarget.duration || 10)
                  }
                  onTimeUpdate={(e) => setFilmT(e.currentTarget.currentTime)}
                  onEnded={() => setPlaying(false)}
                />
                <button className="unmute" onClick={() => setMuted((m) => !m)}>
                  {muted ? (
                    <VolumeX size={16} strokeWidth={1.4} />
                  ) : (
                    <Volume2 size={16} strokeWidth={1.4} />
                  )}{" "}
                  {muted ? "Unmute" : "Mute"}
                </button>
                <div className="film-ctl">
                  <button className="play" onClick={togglePlay}>
                    {playing ? (
                      <Pause size={14} strokeWidth={1.6} />
                    ) : (
                      <Play size={14} strokeWidth={1.6} />
                    )}
                  </button>
                  <div className="film-bar">
                    <i style={{ width: `${(filmT / duration) * 100}%` }} />
                    <span
                      className="dot"
                      style={{ left: `${(filmT / duration) * 100}%` }}
                    />
                  </div>
                  <span className="film-time">
                    {fmt(filmT)} / {fmt(duration)}
                  </span>
                </div>
              </>
            )}

            {/* no likeness yet — composed placeholder + invite */}
            {!loading && !portrait && (
              <div className="ph">
                <div className="mono">{product.mono}</div>
                <div className="pm">
                  The fitting is composed. Add your likeness below to see{" "}
                  {product.name} resolved on you.
                </div>
              </div>
            )}

            {/* likeness ready, nothing generated yet — invite to compose */}
            {!loading && portrait && !asset && !error && (
              <div className="ph">
                <div className="mono">{product.mono}</div>
                <div className="pm">
                  Select Try-On, 360° or Film, then tap the arrow to compose
                  your {current.label}.
                </div>
              </div>
            )}

            {/* error */}
            {!loading && portrait && error && !asset && (
              <div className="ph">
                <div className="mono">{product.mono}</div>
                <div className="pm">{error}</div>
              </div>
            )}

            {/* processing — shimmering dot-field */}
            {loading && (
              <div className="mproc">
                <div className="dotfield" />
                <div className="pl">{PROC_STEPS[procStep]}</div>
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
          <button className="act" onClick={download} disabled={!done} title="Download">
            <Download size={18} strokeWidth={1.4} />
          </button>
          <button className="act" onClick={share} disabled={!done} title="Share">
            <Share2 size={18} strokeWidth={1.4} />
          </button>
          <button className="act" title="More">
            <MoreHorizontal size={18} strokeWidth={1.4} />
          </button>
        </div>
      </div>

      {/* ——— bottom: closet gallery + composer ——— */}
      <div className="modal-foot">
        {/* closet gallery panel */}
        {closetOpen && (
          <div className="closet">
            <div className="closet-head">
              <span className="ttl">Your Closet</span>
              <div className="closet-head-right">
                <span className="cnt">
                  {closet.length} {closet.length === 1 ? "item" : "items"}
                  {garments.length > 0 && ` · ${garments.length} selected`}
                </span>
                <button
                  className="closet-close"
                  onClick={() => setClosetOpen(false)}
                  aria-label="Close closet"
                >
                  <X size={14} strokeWidth={1.6} />
                </button>
              </div>
            </div>
            <div className="closet-grid">
              <div
                className={"closet-drop" + (dragging ? " drag" : "")}
                onClick={() => closetInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void uploadToCloset(e.dataTransfer.files);
                }}
              >
                <Upload size={20} strokeWidth={1.4} />
                <span className="dl">Upload or drop images</span>
              </div>

              {closet.map((url) => {
                const on = garments.includes(url);
                return (
                  <div
                    key={url}
                    className={"citem" + (on ? " on" : "")}
                    onClick={() => toggleSelect(url)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" />
                    {on && (
                      <span className="check">
                        <Check size={13} strokeWidth={2.4} />
                      </span>
                    )}
                    <button
                      className="del"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFromCloset(url);
                      }}
                      aria-label="Delete"
                    >
                      <X size={12} strokeWidth={2} />
                    </button>
                  </div>
                );
              })}
            </div>
            {closet.length === 0 && (
              <div className="closet-empty">
                Your closet is empty — upload your clothes to try them on.
              </div>
            )}
          </div>
        )}

        {/* composer */}
        <div className="composer">
          {/* references — likeness + selected items */}
          <div className="composer-refs">
            <div
              className={"cref" + (portrait ? " you" : "")}
              onClick={() => likenessRef.current?.click()}
              title={portrait ? "Replace your likeness" : "Add your likeness"}
            >
              {portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={portrait} alt="" />
              ) : (
                <div className="ph">
                  <User size={18} strokeWidth={1.4} />
                </div>
              )}
              <div className="tag">You</div>
            </div>

            {garments.map((g) => (
              <div className="cref" key={g} title="Selected item">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g} alt="" />
                <button
                  className="rm"
                  onClick={() => toggleSelect(g)}
                  aria-label="Remove"
                >
                  <X size={11} strokeWidth={2} />
                </button>
                <div className="tag">Item</div>
              </div>
            ))}

            <button
              className="cref-add"
              onClick={() => setClosetOpen((v) => !v)}
              title="Your closet — add or pick items"
            >
              <Plus size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* input + modes + submit */}
          <div className="composer-input">
            <input
              className="field"
              type="text"
              placeholder="Describe your edit, @ to reference images"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && portrait && !loading) composeCurrent();
              }}
            />
            <div className="composer-modes">
              {MODES.map(({ mode: m, label, Icon }) => (
                <button
                  key={m}
                  className={"cmode" + (mode === m ? " on" : "")}
                  onClick={() => setMode(m)}
                >
                  <Icon size={13} strokeWidth={1.5} /> {label}
                </button>
              ))}
            </div>
            <span className="cost-hint">{CREDIT_COST[current.kind]} cr</span>
            <button
              className="csubmit"
              onClick={composeCurrent}
              disabled={!portrait || loading}
              title={`Compose · ${CREDIT_COST[current.kind]} credits`}
            >
              <ArrowUp size={18} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* hidden file inputs */}
        <input
          ref={likenessRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => readLikeness(e.target.files?.[0])}
        />
        <input
          ref={closetInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            void uploadToCloset(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
