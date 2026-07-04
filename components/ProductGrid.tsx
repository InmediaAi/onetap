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
import { useAtelier } from "@/lib/store";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

const PAGE_SIZE = 20;

/** Normalize a brand for matching (lowercase + strip accents + trim). Brand
 *  strings are free-form on both the product and the user-preference side. */
const normBrand = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .trim();

/** Single-select quick-filter "themes" (incl. New In). Each maps to one facet;
 *  `values` may list several (e.g. "Party & Cocktail" = Party Wear OR Cocktail). */
type ThemeDef = { id: string; label: string; facet?: "occasion" | "category"; values?: string[] };
const THEMES: ThemeDef[] = [
  { id: "newin", label: "New In" },
  { id: "dresses", label: "Dresses", facet: "category", values: ["Dresses"] },
  { id: "date-night", label: "Date Night", facet: "occasion", values: ["Date Night"] },
  { id: "vacation", label: "Vacation", facet: "occasion", values: ["Vacation"] },
  { id: "party-cocktail", label: "Party & Cocktail", facet: "occasion", values: ["Party Wear", "Cocktail"] },
  { id: "wedding-guest", label: "Wedding Guest", facet: "occasion", values: ["Wedding Guest"] },
];

/** The occasion THEME whose values set-equal `occ` (so a deep-link lights its chip). */
function themeForOccasions(occ?: string[]): string | null {
  if (!occ || occ.length === 0) return null;
  const want = new Set(occ);
  const t = THEMES.find(
    (x) =>
      x.facet === "occasion" &&
      x.values &&
      x.values.length === want.size &&
      x.values.every((v) => want.has(v)),
  );
  return t?.id ?? null;
}

export default function ProductGrid({
  initialProducts,
  initialTotal,
  initialFacets,
  initialBrand,
  initialOccasions,
  onTry,
}: {
  initialProducts: Product[];
  initialTotal: number;
  initialFacets: FacetOptions;
  /** Brand pre-selected from the URL (?brands=) — seeds the quick-brand chip. */
  initialBrand?: string | null;
  /** Occasions pre-selected from the URL (?occasions=) — seeds the quick-theme chip. */
  initialOccasions?: string[];
  onTry: (product: Product) => void;
}) {
  // An occasion deep-link that matches a quick-filter theme lights that chip;
  // otherwise the occasions seed the Refine multi-select (shown as selected there).
  const seededTheme = themeForOccasions(initialOccasions);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [styles, setStyles] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>(
    seededTheme ? [] : (initialOccasions ?? []),
  );
  const [colours, setColours] = useState<string[]>([]);
  const [brackets, setBrackets] = useState<string[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [refineOpen, setRefineOpen] = useState(false);

  // Single-select quick filters — one theme + one brand at a time, kept separate
  // from the Refine multi-select arrays and merged into the query (effFilters).
  const [quickTheme, setQuickTheme] = useState<string | null>(seededTheme);
  // Seeded from ?brands= (a /brands landing CTA) so the deep-link lands filtered.
  const [quickBrand, setQuickBrand] = useState<string | null>(initialBrand ?? null);
  // The user's onboarding brand preferences → the brand quick-filter row.
  const preferredBrands = useAtelier((s) => s.brands);

  // Server-driven page + facets (seeded from SSR so first paint is populated).
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [facets, setFacets] = useState<FacetOptions>(initialFacets);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Refine multi-select arrays + the single-select quick selections, merged into
  // the effective filter set sent to the server.
  const effFilters = useMemo<FilterState>(() => {
    const t = THEMES.find((x) => x.id === quickTheme);
    const occ =
      t?.facet === "occasion" && t.values
        ? [...new Set([...occasions, ...t.values])]
        : occasions;
    const cat =
      t?.facet === "category" && t.values
        ? [...new Set([...categories, ...t.values])]
        : categories;
    const brandsEff =
      quickBrand && !brands.includes(quickBrand) ? [...brands, quickBrand] : brands;
    return {
      brands: brandsEff,
      categories: cat,
      styles,
      occasions: occ,
      colours,
      brackets,
      newIn: quickTheme === "newin",
    };
  }, [brands, categories, styles, occasions, colours, brackets, quickTheme, quickBrand]);
  const filterKey = useMemo(() => filtersToParams(effFilters).toString(), [effFilters]);

  const didMount = useRef(false);

  // The user's preferred brands that exist in the catalog — matched case/accent-
  // insensitively (brand strings are free-form on both sides) and displayed in the
  // catalog's exact spelling so selecting one filters correctly. Uses the
  // unfiltered SSR brand set so the row is stable, not narrowed by other filters.
  const brandQuickList = useMemo(() => {
    const canon = new Map<string, string>(); // normalized key → catalog spelling
    for (const b of initialFacets.brands) {
      const k = normBrand(b);
      if (k && !canon.has(k)) canon.set(k, b);
    }
    const out: string[] = [];
    const seen = new Set<string>();
    for (const pref of preferredBrands) {
      const c = canon.get(normBrand(pref));
      if (c && !seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }, [preferredBrands, initialFacets.brands]);

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
      const sp = filtersToParams(effFilters);
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
  }, [filterKey, page, effFilters]);

  // Facets: refetch only when the filters change (not on page change).
  const facetCtl = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!didMount.current) return;
    const t = setTimeout(() => {
      facetCtl.current?.abort();
      const ctl = new AbortController();
      facetCtl.current = ctl;
      fetch(`/api/products/facets?${filtersToParams(effFilters)}`, {
        signal: ctl.signal,
        cache: "no-store",
      })
        .then((r) => r.json())
        .then((d) => d.facets && setFacets(d.facets))
        .catch(() => {});
    }, 180);
    return () => clearTimeout(t);
  }, [filterKey, effFilters]);

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

  // One global single-select across BOTH quick rows — selecting a theme clears
  // any brand and vice versa; re-tapping the active chip clears it.
  const selectTheme = (id: string) => {
    setQuickBrand(null);
    setQuickTheme((cur) => (cur === id ? null : id));
    setPage(1);
    track(EVENTS.CATALOG_FILTERED, { quickTheme: id });
  };
  const selectBrand = (b: string) => {
    setQuickTheme(null);
    setQuickBrand((cur) => (cur === b ? null : b));
    setPage(1);
    track(EVENTS.CATALOG_FILTERED, { quickBrand: b });
  };

  // Active filters → removable tiles (price shows its label, not its id).
  const bracketLabel = (id: string) => PRICE_BRACKETS.find((b) => b.id === id)?.label ?? id;
  const active: { key: string; label: string; clear: () => void }[] = [
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
    setQuickTheme(null);
    setQuickBrand(null);
    setPage(1);
  };

  const visibleBrands = facets.brands.filter((b) =>
    b.toLowerCase().includes(brandQuery.trim().toLowerCase()),
  );

  return (
    <div className="wrap">
      {/* quick filters (single-select, horizontally scrollable) + refine */}
      <div className="curator-filterbar">
        <div className="quickbar">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={"f-chip" + (quickTheme === t.id ? " on" : "")}
              onClick={() => selectTheme(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="refine-btn" onClick={() => setRefineOpen(true)}>
          <SlidersHorizontal size={15} strokeWidth={1.4} /> Refine
        </button>
      </div>

      {/* preferred-brands quick row (single-select) */}
      {brandQuickList.length > 0 && (
        <div className="quickbar-brands">
          {brandQuickList.map((b) => (
            <button
              key={b}
              className={"f-chip" + (quickBrand === b ? " on" : "")}
              onClick={() => selectBrand(b)}
            >
              {b}
            </button>
          ))}
        </div>
      )}

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
