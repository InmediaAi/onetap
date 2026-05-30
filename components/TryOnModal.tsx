"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { Product } from "@/lib/data/products";
import type { GenerationKind } from "@/lib/ai/types";
import { useAtelier, type GeneratedLook } from "@/lib/store";
import { createId } from "@/lib/utils";
import GenerationOptions from "./GenerationOptions";
import GeneratedResult, { GenerationLoading } from "./GeneratedResult";

type Phase =
  | { step: "options" }
  | { step: "loading"; kind: GenerationKind }
  | { step: "result"; look: GeneratedLook }
  | { step: "error"; message: string };

const ENDPOINTS: Record<GenerationKind, string> = {
  tryon: "/api/generate-image",
  spin: "/api/generate-360",
  video: "/api/generate-video",
};

export default function TryOnModal({
  product,
  onClose,
}: {
  product: Product | null;
  onClose: () => void;
}) {
  const portrait = useAtelier((s) => s.portrait);
  const addLook = useAtelier((s) => s.addLook);
  const [phase, setPhase] = useState<Phase>({ step: "options" });
  // Most recent try-on image for this session — fed into spin/video.
  const [tryOnImage, setTryOnImage] = useState<string | null>(null);

  const open = Boolean(product);

  // Reset state whenever a new product opens the modal.
  useEffect(() => {
    if (product) {
      setPhase({ step: "options" });
      setTryOnImage(null);
    }
  }, [product]);

  // Lock scroll + escape-to-close.
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

  async function generate(kind: GenerationKind) {
    if (!product || !portrait) return;
    setPhase({ step: "loading", kind });

    try {
      const body =
        kind === "tryon"
          ? { userImage: portrait, productImage: product.imageUrl }
          : { image: tryOnImage ?? portrait };

      const res = await fetch(ENDPOINTS[kind], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      const assetUrl: string = kind === "tryon" ? data.imageUrl : data.videoUrl;
      if (kind === "tryon") setTryOnImage(assetUrl);

      const look: GeneratedLook = {
        id: createId(),
        productId: product.id,
        kind,
        inputImage: portrait,
        assetUrl,
        posterUrl: data.posterUrl,
        createdAt: Date.now(),
      };
      addLook(look);
      setPhase({ step: "result", look });
    } catch (err) {
      setPhase({
        step: "error",
        message: err instanceof Error ? err.message : "Generation failed",
      });
    }
  }

  return (
    <AnimatePresence>
      {open && product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="relative grid max-h-[92vh] w-full max-w-4xl grid-cols-1 overflow-y-auto bg-canvas md:grid-cols-2"
          >
            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 text-ink transition-opacity hover:opacity-60"
            >
              <X size={20} strokeWidth={1.5} />
            </button>

            {/* LEFT — product */}
            <div className="relative hidden aspect-[3/4] bg-[#f6f6f6] md:block">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="50vw"
                className="object-cover"
              />
            </div>

            {/* RIGHT — flow */}
            <div className="flex flex-col gap-6 p-8 md:p-10">
              <div>
                <p className="eyebrow">{product.brand}</p>
                <h3 className="mt-1 font-display text-2xl">{product.name}</h3>
                <p className="mt-1 text-sm text-muted">{product.price}</p>
              </div>

              {!portrait ? (
                <div className="flex flex-col gap-4 border border-hairline p-6 text-center">
                  <p className="font-display text-lg">Add your portrait first</p>
                  <p className="text-xs text-muted">
                    OneTap uses the photo from your onboarding to visualize looks.
                  </p>
                  <Link href="/onboarding" className="btn-line">
                    Upload a portrait
                  </Link>
                </div>
              ) : phase.step === "options" ? (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-12 overflow-hidden bg-[#f6f6f6]">
                      <Image
                        src={portrait}
                        alt="Your portrait"
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <p className="text-xs text-muted">
                      Using your saved portrait. One tap to see it on you.
                    </p>
                  </div>
                  <GenerationOptions onSelect={generate} />
                </div>
              ) : phase.step === "loading" ? (
                <GenerationLoading kind={phase.kind} />
              ) : phase.step === "result" ? (
                <GeneratedResult
                  look={phase.look}
                  onReset={() => setPhase({ step: "options" })}
                />
              ) : (
                <div className="flex flex-col gap-4 border border-hairline p-6 text-center">
                  <p className="font-display text-lg">Something interrupted us</p>
                  <p className="text-xs text-muted">{phase.message}</p>
                  <button
                    onClick={() => setPhase({ step: "options" })}
                    className="btn-line"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
