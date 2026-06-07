"use client";

import { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { isNewIn, type Product } from "@/lib/data/products";
import { CLOTHING_TYPES, ALL_CLOTHING, COLOURS, OCCASIONS } from "@/lib/data/vocab";
import ProductCard from "./ProductCard";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

type Quick = "newin" | "vacation" | "work";
const QUICK: { id: Quick; label: string }[] = [
  { id: "newin", label: "New in" },
  { id: "vacation", label: "Vacation wear" },
  { id: "work", label: "Work wear" },
];

export default function ProductGrid({
  products,
  onTry,
}: {
  products: Product[];
  onTry: (product: Product) => void;
}) {
  const [quick, setQuick] = useState<Quick[]>([]);
  const [type, setType] = useState<string>(ALL_CLOTHING);
  const [colours, setColours] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
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

  const visible = useMemo(() => {
    const list = products.filter((p) => {
      if (type !== ALL_CLOTHING && p.type !== type) return false;
      if (colours.length && !colours.some((c) => p.colours?.includes(c))) return false;
      if (occasions.length && !occasions.some((o) => p.occasions?.includes(o))) return false;
      if (quick.includes("newin") && !isNewIn(p.droppedAt)) return false;
      if (quick.includes("vacation") && !p.occasions?.includes("Vacation")) return false;
      if (quick.includes("work") && !p.occasions?.includes("Work")) return false;
      return true;
    });
    // Recommended order — internal OneTap score (never shown).
    return [...list].sort((a, b) => (b.oneTapScore ?? 0) - (a.oneTapScore ?? 0));
  }, [products, type, colours, occasions, quick]);

  const toggleQuick = (id: Quick) => {
    setQuick((q) => (q.includes(id) ? q.filter((x) => x !== id) : [...q, id]));
    track(EVENTS.CATALOG_FILTERED, { quick: id });
  };
  const pickType = (t: string) => {
    setType(t);
    track(EVENTS.CATALOG_FILTERED, { type: t });
  };
  const toggleColour = (c: string) => {
    setColours((arr) => (arr.includes(c) ? arr.filter((x) => x !== c) : [...arr, c]));
    track(EVENTS.CATALOG_FILTERED, { colour: c });
  };
  const toggleOccasion = (o: string) => {
    setOccasions((arr) => (arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]));
    track(EVENTS.CATALOG_FILTERED, { occasion: o });
  };

  // Active filters → a sequence of removable tiles.
  const active: { label: string; clear: () => void }[] = [
    ...QUICK.filter((q) => quick.includes(q.id)).map((q) => ({
      label: q.label,
      clear: () => setQuick((s) => s.filter((x) => x !== q.id)),
    })),
    ...(type !== ALL_CLOTHING ? [{ label: type, clear: () => setType(ALL_CLOTHING) }] : []),
    ...colours.map((c) => ({ label: c, clear: () => setColours((s) => s.filter((x) => x !== c)) })),
    ...occasions.map((o) => ({ label: o, clear: () => setOccasions((s) => s.filter((x) => x !== o)) })),
  ];
  const clearAll = () => {
    setQuick([]);
    setType(ALL_CLOTHING);
    setColours([]);
    setOccasions([]);
  };
  const clearRefine = () => {
    setType(ALL_CLOTHING);
    setColours([]);
    setOccasions([]);
  };

  return (
    <div className="wrap">
      {/* quick filters + refine */}
      <div className="curator-filterbar">
        <div className="quickbar">
          {QUICK.map((q) => (
            <button
              key={q.id}
              className={"f-chip" + (quick.includes(q.id) ? " on" : "")}
              onClick={() => toggleQuick(q.id)}
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
            <button key={a.label} className="afilter" onClick={a.clear}>
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
              <section className="refine-sec">
                <div className="refine-sec-head">
                  <span className="rsh-lbl">Clothing</span>
                  {type !== ALL_CLOTHING && <span className="rsh-sum">{type}</span>}
                </div>
                <div className="type-list">
                  {CLOTHING_TYPES.map((t) => (
                    <button
                      key={t}
                      className={"type-row" + (type === t ? " on" : "")}
                      onClick={() => pickType(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </section>

              <section className="refine-sec">
                <div className="refine-sec-head">
                  <span className="rsh-lbl">Colour</span>
                  {colours.length > 0 && <span className="rsh-sum">{colours.join(", ")}</span>}
                </div>
                <div className="rswatch-grid">
                  {COLOURS.map((c) => (
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

              <section className="refine-sec">
                <div className="refine-sec-head">
                  <span className="rsh-lbl">Occasion</span>
                  {occasions.length > 0 && <span className="rsh-sum">{occasions.join(", ")}</span>}
                </div>
                <div className="chips-inline">
                  {OCCASIONS.map((o) => (
                    <button
                      key={o}
                      className={"f-chip" + (occasions.includes(o) ? " on" : "")}
                      onClick={() => toggleOccasion(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="refine-foot">
              <button className="refine-clear" onClick={clearRefine}>
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
