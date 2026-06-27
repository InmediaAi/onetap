"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { type Product } from "@/lib/data/products";
import { PRICE_BRACKETS } from "@/lib/data/vocab";
import {
  filtersToParams,
  type FilterState,
  type FacetOptions,
} from "@/lib/data/facets";
import ProductCard from "./ProductCard";
import Pagination from "./Pagination";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

const PAGE_SIZE = 16;

export default function ProductGrid({
  initialProducts,
  initialTotal,
  initialFacets,
  onTry,
}: {
  initialProducts: Product[];
  initialTotal: number;
  initialFacets: FacetOptions;
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

  // Server-driven page + facets (seeded from SSR so first paint is populated).
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [facets, setFacets] = useState<FacetOptions>(initialFacets);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filters = useMemo<FilterState>(
    () => ({ brands, categories, styles, occasions, colours, brackets, newIn }),
    [brands, categories, styles, occasions, colours, brackets, newIn],
  );
  const filterKey = useMemo(() => filtersToParams(filters).toString(), [filters]);

  const didMount = useRef(false);

  // Products: fetch the current filters + page (debounced; cancels stale requests).
  // Seeded from SSR, so the first run is skipped.
  const prodCtl = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!didMount.current) return;
    const t = setTimeout(() => {
      prodCtl.current?.abort();
      const ctl = new AbortController();
      prodCtl.current = ctl;
      setLoading(true);
      const sp = filtersToParams(filters);
      sp.set("page", String(page));
      sp.set("pageSize", String(PAGE_SIZE));
      fetch(`/api/products?${sp}`, { signal: ctl.signal, cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          setProducts(d.products ?? []);
          setTotal(d.total ?? 0);
          setLoading(false);
        })
        .catch((e) => {
          if (e?.name !== "AbortError") setLoading(false);
        });
    }, 180);
    return () => clearTimeout(t);
  }, [filterKey, page, filters]);

  // Facets: refetch only when the filters change (not on page change).
  const facetCtl = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!didMount.current) return;
    const t = setTimeout(() => {
      facetCtl.current?.abort();
      const ctl = new AbortController();
      facetCtl.current = ctl;
      fetch(`/api/products/facets?${filtersToParams(filters)}`, {
        signal: ctl.signal,
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((d) => d.facets && setFacets(d.facets))
        .catch(() => {});
    }, 180);
    return () => clearTimeout(t);
  }, [filterKey, filters]);

  useEffect(() => {
    didMount.current = true;
  }, []);

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

  // Any filter change returns to page 1 (synchronously, so the page fetch is correct).
  const toggle =
    (setter: React.Dispatch<React.SetStateAction<string[]>>, key: string) => (v: string) => {
      setter((arr) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]));
      setPage(1);
      track(EVENTS.CATALOG_FILTERED, { [key]: v });
    };
  const toggleBrand = toggle(setBrands, "brand");
  const toggleCategory = toggle(setCategories, "category");
  const toggleStyle = toggle(setStyles, "style");
  const toggleOccasion = toggle(setOccasions, "occasion");
  const toggleColour = toggle(setColours, "colour");
  const toggleBracket = toggle(setBrackets, "price");
  const toggleNewIn = () => {
    setNewIn((v) => !v);
    setPage(1);
  };

  // Quick filters beside "New in" — one tap maps to an existing facet value.
  const quickFilters: { label: string; active: boolean; toggle: () => void }[] = [
    { label: "Party Wear", active: occasions.includes("Party Wear"), toggle: () => toggleOccasion("Party Wear") },
    { label: "Vacation", active: occasions.includes("Vacation"), toggle: () => toggleOccasion("Vacation") },
    { label: "Work", active: occasions.includes("Work"), toggle: () => toggleOccasion("Work") },
    { label: "Dresses", active: categories.includes("Dresses"), toggle: () => toggleCategory("Dresses") },
    { label: "Fashion Week", active: occasions.includes("Fashion Week"), toggle: () => toggleOccasion("Fashion Week") },
  ];

  // Active filters → removable tiles (price shows its label, not its id).
  const bracketLabel = (id: string) => PRICE_BRACKETS.find((b) => b.id === id)?.label ?? id;
  const active: { key: string; label: string; clear: () => void }[] = [
    ...(newIn ? [{ key: "newin", label: "New in", clear: toggleNewIn }] : []),
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
    setPage(1);
  };

  const visibleBrands = facets.brands.filter((b) =>
    b.toLowerCase().includes(brandQuery.trim().toLowerCase()),
  );

  return (
    <div className="wrap">
      {/* quick filters + refine */}
      <div className="curator-filterbar">
        <div className="quickbar">
          <button className={"f-chip" + (newIn ? " on" : "")} onClick={toggleNewIn}>
            New in
          </button>
          {quickFilters.map((q) => (
            <button
              key={q.label}
              className={"f-chip" + (q.active ? " on" : "")}
              onClick={q.toggle}
            >
              {q.label}
            </button>
          ))}
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

      {products.length > 0 ? (
        <>
          <div className={"grid-list" + (loading ? " is-loading" : "")} ref={gridRef}>
            {products.map((p, i) => (
              <ProductCard key={p.id} product={p} index={i} onTry={onTry} />
            ))}
          </div>
          <Pagination page={page} pageCount={pageCount} onPage={setPage} topRef={gridRef} />
        </>
      ) : (
        <p className="empty-state">
          {loading
            ? "Finding the pieces…"
            : "Few pieces answer this. Loosen a thread, and the pieces fill again."}
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
              {facets.brands.length > 0 && (
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
                    {visibleBrands.length === 0 && <p className="refine-none">No brands match.</p>}
                  </div>
                </section>
              )}

              {/* Occasion */}
              {facets.occasions.length > 0 && (
                <Facets
                  label="Occasion"
                  options={facets.occasions}
                  selected={occasions}
                  onToggle={toggleOccasion}
                />
              )}

              {/* Category */}
              {facets.categories.length > 0 && (
                <Facets
                  label="Category"
                  options={facets.categories}
                  selected={categories}
                  onToggle={toggleCategory}
                />
              )}

              {/* Style */}
              {facets.styles.length > 0 && (
                <Facets
                  label="Style"
                  options={facets.styles}
                  selected={styles}
                  onToggle={toggleStyle}
                />
              )}

              {/* Price */}
              {facets.brackets.length > 0 && (
                <section className="refine-sec">
                  <div className="refine-sec-head">
                    <span className="rsh-lbl">Price</span>
                    {brackets.length > 0 && (
                      <span className="rsh-sum">{brackets.map(bracketLabel).join(", ")}</span>
                    )}
                  </div>
                  <div className="chips-inline">
                    {facets.brackets.map((b) => (
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
              {facets.colours.length > 0 && (
                <section className="refine-sec">
                  <div className="refine-sec-head">
                    <span className="rsh-lbl">Colour</span>
                    {colours.length > 0 && <span className="rsh-sum">{colours.join(", ")}</span>}
                  </div>
                  <div className="rswatch-grid">
                    {facets.colours.map((c) => (
                      <button
                        key={c.name}
                        className={"rswatch" + (colours.includes(c.name) ? " on" : "")}
                        onClick={() => toggleColour(c.name)}
                      >
                        <span className="rswatch-dot" style={c.hex ? { background: c.hex } : undefined} />
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
