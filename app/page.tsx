"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import TryOnModal from "@/components/TryOnModal";
import { products, type Product } from "@/lib/data/products";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

export default function HomePage() {
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
      <Hero onTry={() => handleTry(products[0])} />
      <ProductGrid onTry={handleTry} />
      <TryOnModal product={active} onClose={() => setActive(null)} />

      <footer className="border-t border-hairline py-12 text-center">
        <p className="font-display text-lg tracking-[0.2em]">
          ONETAP <span className="italic">Atelier</span>
        </p>
        <p className="mt-2 text-[11px] uppercase tracking-luxe text-muted">
          The right answer. Chosen for you.
        </p>
      </footer>
    </main>
  );
}
