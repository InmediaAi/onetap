"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
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
  const hydrated = useHydrated();
  const storeLook = useAtelier((s) => s.looks.find((l) => l.id === params.id));

  const [look, setLook] = useState<ResolvedLook | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [product, setProduct] = useState<Product | undefined>();

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

      <section className="mx-auto flex max-w-editorial flex-col items-center px-6 py-16 text-center md:py-24">
        {!hydrated || (!look && !notFound) ? (
          <div className="shimmer h-[28rem] w-80" />
        ) : !look ? (
          <div className="flex flex-col items-center gap-6 py-20">
            <p className="font-display text-3xl">This look isn’t here</p>
            <p className="max-w-md text-muted">
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
              <h1 className="mt-4 max-w-2xl font-display text-3xl leading-tight md:text-4xl">
                {product.brand} — {product.name}
              </h1>
            )}

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="relative mt-10 aspect-[9/16] w-full max-w-sm overflow-hidden bg-ivoryPanel"
            >
              {look.kind === "tryon" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={look.assetUrl}
                  alt="Generated look"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <video
                  src={look.assetUrl}
                  poster={look.posterUrl}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
            </motion.div>

            <div className="mt-12 flex flex-col items-center gap-4">
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
