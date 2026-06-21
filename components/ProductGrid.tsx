"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { isNewIn, priceBracketId, type Product } from "@/lib/data/products";
import {
  PRODUCT_STYLES,
  OCCASIONS,
  COLOURS,
  PRICE_BRACKETS,
} from "@/lib/data/vocab";
import ProductCard from "./ProductCard";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

/** Facet keys (the quick "New in" toggle is applied separately, always). */
type Facet = "brand" | "category" | "style" | "occasion" | "colour" | "price";

export default function ProductGrid({
  products,
  onTry,
}: {
  products: Product[];
  onTry: (product: Product) => void;
}) {
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [colours, setColours] = useState<string[]>([]);
  const [brackets, setBrackets] = useState<string[]>([]);
  const [newIn, setNewIn] = useState(false);
  const [brandQuery, setBrandQuery] = useState("");
  const [refineOpen, setRefineOpen] = useState(false);

  // Scroll-lock + escape while the Refine drawer is open.
  useEffect(() => {
    if (!refineOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setRefineOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [refineOpen]);

  // A product passes every selected facet EXCEPT `exclude` (+ the New-in toggle,
  // always applied). Used both for the visible list (exclude=null) and for
  // computing each facet's still-available options (cross-filtered / faceted).
  const passes = useMemo(() => {
    return (p: Product, exclude: Facet | null) => {
      if (exclude !== "brand" && brands.length && !brands.includes(p.brand)) return false;
      if (
        exclude !== "category" &&
        categories.length &&
        !(p.category && categories.includes(p.category))
      )
        return false;
      if (exclude !== "style" && styles.length && !styles.some((s) => p.style?.includes(s)))
        return false;
      if (
        exclude !== "occasion" &&
        occasions.length &&
        !occasions.some((o) => p.occasions?.includes(o))
      )
        return false;
      if (exclude !== "colour" && colours.length && !colours.some((c) => p.colours?.includes(c)))
        return false;
      if (
        exclude !== "price" &&
        brackets.length &&
        !brackets.includes(priceBracketId(p.price.amount) ?? "")
      )
        return false;
      if (newIn && !isNewIn(p.droppedAt)) return false;
      return true;
    };
  }, [brands, categories, styles, occasions, colours, brackets, newIn]);

  const visible = useMemo(() => {
    const list = products.filter((p) => passes(p, null));
    return [...list].sort((a, b) => (b.oneTapScore ?? 0) - (a.oneTapScore ?? 0));
  }, [products, passes]);

  // Available option sets per facet (values present once the OTHER facets apply).
  const opts = useMemo(() => {
    const present = (exclude: Facet, get: (p: Product) => string | string[] | null | undefined) => {
      const set = new Set<string>();
      for (const p of products) {
        if (!passes(p, exclude)) continue;
        const v = get(p);
        if (Array.isArray(v)) v.forEach((x) => x && set.add(x));
        else if (v) set.add(v);
      }
      return set;
    };
    // Keep already-selected values visible (so they stay deselectable).
    const withSel = (set: Set<string>, sel: string[]) => {
      sel.forEach((s) => set.add(s));
      return set;
    };
    const brandSet = withSel(present("brand", (p) => p.brand), brands);
    // Categories are free-form (admin can add new ones), so build the facet from
    // every present value — same as brands — not a fixed whitelist.
    const categorySet = withSel(present("category", (p) => p.category), categories);
    return {
      brands: [...brandSet].sort((a, b) => a.localeCompare(b)),
      categories: [...categorySet].sort((a, b) => a.localeCompare(b)),
      styles: PRODUCT_STYLES.filter((s) =>
        withSel(present("style", (p) => p.style), styles).has(s),
      ),
      occasions: OCCASIONS.filter((o) =>
        withSel(present("occasion", (p) => p.occasions), occasions).has(o),
      ),
      colours: COLOURS.filter((c) =>
        withSel(present("colour", (p) => p.colours), colours).has(c.name),
      ),
      brackets: PRICE_BRACKETS.filter((b) =>
        withSel(present("price", (p) => priceBracketId(p.price.amount)), brackets).has(b.id),
      ),
    };
  }, [products, passes, brands, categories, styles, occasions, colours, brackets]);

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>, key: string) => (v: string) => {
      setter((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
      track(EVENTS.CATALOG_FILTERED, { [key]: v });
    };
  const toggleBrand = toggle(setBrands, "brand");
  const toggleCategory = toggle(setCategories, "category");
  const toggleStyle = toggle(setStyles, "style");
  const toggleOccasion = toggle(setOccasions, "occasion");
  const toggleColour = toggle(setColours, "colour");
  const toggleBracket = toggle(setBrackets, "price");

  // Active filters → removable tiles (price shows its label, not its id).
  const bracketLabel = (id: string) => PRICE_BRACKETS.find((b) => b.id === id)?.label ?? id;
  const active: { key: string; label: string; clear: () => void }[] = [
    ...(newIn ? [{ key: "newin", label: "New in", clear: () => setNewIn(false) }] : []),
    ...brands.map((v) => ({ key: `b-${v}`, label: v, clear: () => toggleBrand(v) })),
    ...categories.map((v) => ({ key: `c-${v}`, label: v, clear: () => toggleCategory(v) })),
    ...styles.map((v) => ({ key: `s-${v}`, label: v, clear: () => toggleStyle(v) })),
    ...occasions.map((v) => ({ key: `o-${v}`, label: v, clear: () => toggleOccasion(v) })),
    ...brackets.map((v) => ({ key: `p-${v}`, label: bracketLabel(v), clear: () => toggleBracket(v) })),
    ...colours.map((v) => ({ key: `col-${v}`, label: v, clear: () => toggleColour(v) })),
  ];
  const clearAll = () => {
    setBrands([]);
    setCategories([]);
    setStyles([]);
    setOccasions([]);
    setColours([]);
    setBrackets([]);
    setNewIn(false);
  };

  const visibleBrands = opts.brands.filter((b) =>
    b.toLowerCase().includes(brandQuery.trim().toLowerCase()),
  );

  return (
    <div className="wrap">
      {/* quick filters + refine */}
      <div className="curator-filterbar">
        <div className="quickbar">
          <button
            className={"f-chip" + (newIn ? " on" : "")}
            onClick={() => setNewIn((v) => !v)}
          >
            New in
          </button>
        </div>
        <button className="refine-btn" onClick={() => setRefineOpen(true)}>
          <SlidersHorizontal size={15} strokeWidth={1.4} /> Refine
        </button>
      </div>

      {/* active filters as a sequence of tiles */}
      {active.length > 0 && (
        <div className="active-filters">
          {active.map((a) => (
            <button key={a.key} className="afilter" onClick={a.clear}>
              {a.label} <X size={11} strokeWidth={2} />
            </button>
          ))}
          <button className="afilter-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      <p className="eyebrow pieces-lbl">The Pieces</p>

      {visible.length > 0 ? (
        <div className="grid-list">
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} onTry={onTry} />
          ))}
        </div>
      ) : (
        <p className="empty-state">
          Few pieces answer this. Loosen a thread, and the pieces fill again.
        </p>
      )}

      {/* ——— Refine drawer (right navigation) ——— */}
      {refineOpen && (
        <div
          className="refine-scrim"
          onMouseDown={(e) => {
            if ((e.target as HTMLElement).classList.contains("refine-scrim")) setRefineOpen(false);
          }}
        >
          <aside className="refine-drawer">
            <div className="refine-head">
              <h2>Refine</h2>
              <button className="mclose" onClick={() => setRefineOpen(false)} aria-label="Close">
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div className="refine-body">
              {/* Brand — searchable */}
              {opts.brands.length > 0 && (
                <section className="refine-sec">
                  <div className="refine-sec-head">
                    <span className="rsh-lbl">Brand</span>
                    {brands.length > 0 && <span className="rsh-sum">{brands.join(", ")}</span>}
                  </div>
                  <div className="brand-search">
                    <Search size={13} strokeWidth={1.6} />
                    <input
                      value={brandQuery}
                      onChange={(e) => setBrandQuery(e.target.value)}
                      placeholder="Search brands"
                    />
                  </div>
                  <div className="type-list brand-list">
                    {visibleBrands.map((b) => (
                      <button
                        key={b}
                        className={"type-row" + (brands.includes(b) ? " on" : "")}
                        onClick={() => toggleBrand(b)}
                      >
                        {b}
                      </button>
                    ))}
                    {visibleBrands.length === 0 && (
                      <p className="refine-none">No brands match.</p>
                    )}
                  </div>
                </section>
              )}

              {/* Occasion */}
              {opts.occasions.length > 0 && (
                <Facets
                  label="Occasion"
                  options={opts.occasions as readonly string[]}
                  selected={occasions}
                  onToggle={toggleOccasion}
                />
              )}

              {/* Category */}
              {opts.categories.length > 0 && (
                <Facets
                  label="Category"
                  options={opts.categories as readonly string[]}
                  selected={categories}
                  onToggle={toggleCategory}
                />
              )}

              {/* Style */}
              {opts.styles.length > 0 && (
                <Facets
                  label="Style"
                  options={opts.styles as readonly string[]}
                  selected={styles}
                  onToggle={toggleStyle}
                />
              )}

              {/* Price */}
              {opts.brackets.length > 0 && (
                <section className="refine-sec">
                  <div className="refine-sec-head">
                    <span className="rsh-lbl">Price</span>
                    {brackets.length > 0 && (
                      <span className="rsh-sum">{brackets.map(bracketLabel).join(", ")}</span>
                    )}
                  </div>
                  <div className="chips-inline">
                    {opts.brackets.map((b) => (
                      <button
                        key={b.id}
                        className={"f-chip" + (brackets.includes(b.id) ? " on" : "")}
                        onClick={() => toggleBracket(b.id)}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Colour */}
              {opts.colours.length > 0 && (
                <section className="refine-sec">
                  <div className="refine-sec-head">
                    <span className="rsh-lbl">Colour</span>
                    {colours.length > 0 && <span className="rsh-sum">{colours.join(", ")}</span>}
                  </div>
                  <div className="rswatch-grid">
                    {opts.colours.map((c) => (
                      <button
                        key={c.name}
                        className={"rswatch" + (colours.includes(c.name) ? " on" : "")}
                        onClick={() => toggleColour(c.name)}
                      >
                        <span
                          className="rswatch-dot"
                          data-print={c.hex === null ? "" : undefined}
                          style={c.hex ? { background: c.hex } : undefined}
                        />
                        <span className="rswatch-name">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="refine-foot">
              <button className="refine-clear" onClick={clearAll}>
                Clear
              </button>
              <button className="refine-apply" onClick={() => setRefineOpen(false)}>
                Show the Edit
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/** A chip-based multi-select facet section. */
function Facets({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <section className="refine-sec">
      <div className="refine-sec-head">
        <span className="rsh-lbl">{label}</span>
        {selected.length > 0 && <span className="rsh-sum">{selected.join(", ")}</span>}
      </div>
      <div className="chips-inline">
        {options.map((o) => (
          <button
            key={o}
            className={"f-chip" + (selected.includes(o) ? " on" : "")}
            onClick={() => onToggle(o)}
          >
            {o}
          </button>
        ))}
      </div>
    </section>
  );
}
