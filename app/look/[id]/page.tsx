"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { type Product } from "@/lib/data/products";

export default function LookPage() {
  const params = useParams<{ id: string }>();
  const hydrated = useHydrated();
  const look = useAtelier((s) => s.looks.find((l) => l.id === params.id));
  const [product, setProduct] = useState<Product | undefined>();

  useEffect(() => {
    if (!look) return;
    let active = true;
    fetch(`/api/products/${encodeURIComponent(look.productId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => active && d?.product && setProduct(d.product))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [look]);

  return (
    <main>
      <Header />

      <section className="mx-auto flex max-w-editorial flex-col items-center px-6 py-16 text-center md:py-24">
        {!hydrated ? (
          <div className="shimmer h-[28rem] w-80" />
        ) : !look ? (
          <div className="flex flex-col items-center gap-6 py-20">
            <p className="font-display text-3xl">This look isn’t here</p>
            <p className="max-w-md text-muted">
              Looks are saved on the device that created them. Create your own to
              see it visualized on you.
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
              className="relative mt-10 aspect-[3/4] w-full max-w-sm overflow-hidden bg-ivoryPanel"
            >
              {look.kind === "tryon" ? (
                <Image
                  src={look.assetUrl}
                  alt="Generated look"
                  fill
                  sizes="384px"
                  className="object-cover"
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
                  className="h-full w-full object-cover"
                />
              )}
            </motion.div>

            <div className="mt-12 flex flex-col items-center gap-4">
              <p className="text-sm text-muted">
                Visualized with OneTap Atelier.
              </p>
              <Link href="/" className="btn-line">
                Create Your Own Look
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
