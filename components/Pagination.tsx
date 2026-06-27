"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Client-side pagination over an in-memory list. `resetKey` jumps back to page 1
 * when it changes (e.g. filters/tab), and the page is clamped if the list shrinks.
 */
export function usePaged<T>(items: T[], pageSize: number, resetKey?: unknown) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when the upstream selection changes.
  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  // Keep the page valid when the list gets shorter.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const start = (page - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return { page, setPage, pageCount, pageItems };
}

/** Windowed page list with ellipses, e.g. [1, "…", 4, 5, 6, "…", 20]. */
function pageWindow(page: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const lo = Math.max(2, page - 1);
  const hi = Math.min(count - 1, page + 1);
  if (lo > 2) out.push("…");
  for (let i = lo; i <= hi; i++) out.push(i);
  if (hi < count - 1) out.push("…");
  out.push(count);
  return out;
}

export default function Pagination({
  page,
  pageCount,
  onPage,
  topRef,
}: {
  page: number;
  pageCount: number;
  onPage: (p: number) => void;
  topRef?: RefObject<HTMLElement | null>;
}) {
  if (pageCount <= 1) return null;

  const go = (p: number) => {
    const next = Math.min(pageCount, Math.max(1, p));
    if (next === page) return;
    onPage(next);
    topRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="pg-btn"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        ‹ Prev
      </button>

      <span className="pg-nums">
        {pageWindow(page, pageCount).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="pg-ellipsis" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={p}
              className={"pg-num" + (p === page ? " on" : "")}
              onClick={() => go(p)}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </button>
          ),
        )}
      </span>

      {/* Compact indicator for narrow screens (numbered window hidden via CSS) */}
      <span className="pg-compact" aria-hidden="true">
        {page} / {pageCount}
      </span>

      <button
        className="pg-btn"
        onClick={() => go(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        Next ›
      </button>
    </nav>
  );
}
