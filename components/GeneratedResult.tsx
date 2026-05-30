"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import type { GeneratedLook } from "@/lib/store";
import ShareButtons from "./ShareButtons";

const LABELS: Record<GeneratedLook["kind"], string> = {
  tryon: "Photo Try-On",
  spin: "360° Spin",
  video: "Social Video",
};

export function GenerationLoading({ kind }: { kind: GeneratedLook["kind"] }) {
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="shimmer h-72 w-56 rounded-sm" />
      <div>
        <p className="font-display text-lg">Composing your {LABELS[kind]}</p>
        <p className="mt-2 text-xs uppercase tracking-luxe text-muted">
          A considered result takes a moment
        </p>
      </div>
    </div>
  );
}

export default function GeneratedResult({
  look,
  onReset,
}: {
  look: GeneratedLook;
  onReset: () => void;
}) {
  const isVideo = look.kind !== "tryon";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-6"
    >
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden bg-[#f6f6f6]">
        {isVideo ? (
          <video
            src={look.assetUrl}
            poster={look.posterUrl}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <Image
            src={look.assetUrl}
            alt="Your generated look"
            fill
            sizes="384px"
            className="object-cover"
          />
        )}
      </div>

      <ShareButtons lookId={look.id} />

      <button onClick={onReset} className="text-xs uppercase tracking-luxe text-muted transition-colors hover:text-ink">
        ← Create another look
      </button>
    </motion.div>
  );
}
