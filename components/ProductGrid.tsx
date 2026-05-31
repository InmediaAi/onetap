"use client";

import { useMemo, useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { products, priceValue, type Product } from "@/lib/data/products";
import ProductCard from "./ProductCard";

const HOUSES = ["All", ...Array.from(new Set(products.map((p) => p.brand)))];

const SORTS: Record<string, (a: Product[]) => Product[]> = {
  Recommended: (a) => a,
  "Price · Low to High": (a) => [...a].sort((x, y) => priceValue(x.price) - priceValue(y.price)),
  "Price · High to Low": (a) => [...a].sort((x, y) => priceValue(y.price) - priceValue(x.price)),
  Newest: (a) => [...a].reverse(),
};

export default function ProductGrid({
  onTry,
}: {
  onTry: (product: Product) => void;
}) {
  const [sort, setSort] = useState("Recommended");
  const [house, setHouse] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);

  const visible = useMemo(
    () => SORTS[sort](products.filter((p) => house === "All" || p.brand === house)),
    [sort, house],
  );

  return (
    <div className="wrap">
      <div className="filterbar">
        <button className="fb-btn" onClick={() => setFilterOpen((v) => !v)}>
          <SlidersHorizontal size={15} strokeWidth={1.4} /> Filter{" "}
          <span className="res">{visible.length} Results</span>
        </button>
        <div className="sortsel">
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {Object.keys(SORTS).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="scaret">
            <ChevronDown size={11} strokeWidth={1.6} />
          </span>
        </div>
      </div>

      <div
        className="chips"
        style={{ maxHeight: filterOpen ? 120 : 0, opacity: filterOpen ? 1 : 0 }}
      >
        {HOUSES.map((h) => (
          <button
            key={h}
            className={"chip" + (h === house ? " on" : "")}
            onClick={() => setHouse(h)}
          >
            {h}
          </button>
        ))}
      </div>

      <div className="grid-list">
        {visible.map((p, i) => (
          <ProductCard key={p.id} product={p} index={i} onTry={onTry} />
        ))}
      </div>
    </div>
  );
}
