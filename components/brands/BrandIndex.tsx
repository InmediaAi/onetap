"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { deriveMono } from "@/lib/supabase/util";
import { brandPath } from "@/lib/data/links";
import type { BrandSummary } from "@/lib/data/getBrands";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** First index letter of a brand ("#" for non-alphabetic starts). */
function letterOf(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return c >= "A" && c <= "Z" ? c : "#";
}

function optimizable(url?: string | null): boolean {
  if (!url) return false;
  try {
    const h = new URL(url).hostname;
    return h.endsWith(".supabase.co") || h.endsWith("unsplash.com");
  } catch {
    return false;
  }
}

const TILE_SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw";

function BrandTile({ brand, priority }: { brand: BrandSummary; priority?: boolean }) {
  const hero = brand.heroImage;
  return (
    <Link href={brandPath(brand.name)} className="bx-tile" aria-label={brand.name}>
      {hero ? (
        optimizable(hero) ? (
          <Image className="bx-tile-img" src={hero} alt="" fill sizes={TILE_SIZES} priority={priority} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="bx-tile-img" src={hero} alt="" loading="lazy" />
        )
      ) : (
        <span className="bx-tile-mono" aria-hidden="true">
          {deriveMono(brand.name)}
        </span>
      )}
      <span className="bx-tile-scrim" aria-hidden="true" />
      <span className="bx-tile-name">{brand.name}</span>
    </Link>
  );
}

/**
 * A–Z brand index (reference "Explore brands" layout): a featured row, an
 * alphabet filter bar, and the grouped brand grid. All client-side (no refetch).
 */
export default function BrandIndex({ brands }: { brands: BrandSummary[] }) {
  const [letter, setLetter] = useState<string | null>(null); // null = show all

  // Which letters actually have brands (others render disabled).
  const activeLetters = useMemo(() => {
    const s = new Set<string>();
    for (const b of brands) s.add(letterOf(b.name));
    return s;
  }, [brands]);

  // Top brands by catalog depth → "Brands you may like" featured row.
  const featured = useMemo(
    () => [...brands].sort((a, b) => b.count - a.count).slice(0, 10),
    [brands],
  );

  // Brands grouped by first letter (respecting the active-letter filter).
  const groups = useMemo(() => {
    const map = new Map<string, BrandSummary[]>();
    for (const b of brands) {
      const l = letterOf(b.name);
      if (letter && l !== letter) continue;
      (map.get(l) ?? map.set(l, []).get(l)!).push(b);
    }
    const order = [...LETTERS, "#"].filter((l) => map.has(l));
    return order.map((l) => ({ letter: l, items: map.get(l)! }));
  }, [brands, letter]);

  return (
    <div className="brand-index">
      {!letter && featured.length > 0 && (
        <section className="brand-sec">
          <h2 className="brand-sec-h">Brands you may like</h2>
          <div className="bx-grid bx-grid--feat">
            {featured.map((b, i) => (
              <BrandTile key={b.slug} brand={b} priority={i < 5} />
            ))}
          </div>
        </section>
      )}

      <nav className="brand-alpha" aria-label="Filter brands by letter">
        <button
          className={"brand-alpha-btn" + (letter === null ? " on" : "")}
          onClick={() => setLetter(null)}
        >
          Show all
        </button>
        {[...LETTERS, "#"].map((l) => {
          const has = activeLetters.has(l);
          return (
            <button
              key={l}
              className={"brand-alpha-btn" + (letter === l ? " on" : "")}
              onClick={() => has && setLetter(l)}
              disabled={!has}
              aria-disabled={!has}
            >
              {l}
            </button>
          );
        })}
      </nav>

      {groups.map((g) => (
        <section key={g.letter} className="brand-sec" id={`brand-${g.letter}`}>
          <h2 className="brand-sec-h">{g.letter}</h2>
          <div className="bx-grid">
            {g.items.map((b) => (
              <BrandTile key={b.slug} brand={b} />
            ))}
          </div>
        </section>
      ))}

      {groups.length === 0 && <p className="brand-empty">No brands found.</p>}
    </div>
  );
}
