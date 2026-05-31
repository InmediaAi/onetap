"use client";

import { useState } from "react";
import Header from "@/components/Header";
import ProductGrid from "@/components/ProductGrid";
import TryOnModal from "@/components/TryOnModal";
import { type Product } from "@/lib/data/products";

export default function HomePage() {
  const [active, setActive] = useState<Product | null>(null);

  return (
    <main>
      <Header />

      <div className="pagehead">
        <h1>New In</h1>
        <p>
          The newest arrivals, edited for the season. Each piece may be seen on
          you — a try-on, a turn, a ten-second film — before it is yours. Your
          likeness is kept <u>private to you</u>.
        </p>
      </div>

      <ProductGrid onTry={setActive} />

      <footer className="foot">
        <div className="foot-inner">
          <span className="wordmark">OneTap Atelier</span>
          <div className="fmeta">
            <span className="label">Confidential — By Invitation</span>
            <span className="label">&copy; MMXXVI</span>
          </div>
        </div>
      </footer>

      <TryOnModal product={active} onClose={() => setActive(null)} />
    </main>
  );
}
