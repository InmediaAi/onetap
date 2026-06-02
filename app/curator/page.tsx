"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import TryOnModal from "@/components/TryOnModal";
import { type Product } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

export default function CuratorPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const portrait = useAtelier((s) => s.portrait);
  const [active, setActive] = useState<Product | null>(null);

  // Onboarding-first: send to portrait capture before the first try-on.
  function handleTry(product: Product) {
    if (hydrated && !portrait) {
      router.push("/onboarding");
      return;
    }
    setActive(product);
  }

  return (
    <main>
      <Header />

      <section className="mx-auto max-w-editorial px-6 pb-12 pt-20 text-center md:px-10 md:pt-28">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="eyebrow"
        >
          OneTap Curator
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mx-auto mt-6 max-w-3xl font-display text-5xl leading-[1.05] tracking-tight md:text-7xl"
        >
          Curated, not crowded.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg"
        >
          A standing edit of the most considered pieces in luxury fashion —
          hand-selected, then visualized on you in seconds.
        </motion.p>
      </section>

      <ProductGrid onTry={handleTry} />
      <TryOnModal product={active} onClose={() => setActive(null)} />
    </main>
  );
}
