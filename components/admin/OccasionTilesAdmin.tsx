"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";

/**
 * Edit the "By trending occasions" tiles on the home page (section 3).
 * Empty = the site falls back to auto-derived occasion imagery from the catalog.
 * `occasions` is the Curator filter (comma-separated facet values).
 */

interface Tile {
  title: string;
  description: string;
  occasions: string;
  image: string;
}

const BLANK: Tile[] = [
  { title: "Date Night", description: "", occasions: "Date Night", image: "" },
  { title: "Vacation", description: "", occasions: "Vacation", image: "" },
  { title: "Party & Cocktail", description: "", occasions: "Party Wear,Cocktail", image: "" },
];

export default function OccasionTilesAdmin({ password }: { password: string }) {
  const toast = useToast();
  const [tiles, setTiles] = useState<Tile[]>(BLANK);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/home-config", {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) return;
      const d = await res.json();
      const raw = (d.occasionTiles ?? []) as Record<string, unknown>[];
      if (raw.length) {
        setTiles(
          raw.slice(0, 6).map((t) => ({
            title: String(t.title ?? ""),
            description: String(t.description ?? ""),
            occasions: Array.isArray(t.occasions)
              ? (t.occasions as string[]).join(",")
              : String(t.occasions ?? ""),
            image: String(t.image ?? ""),
          })),
        );
      }
    } catch {
      /* ignore */
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(i: number, p: Partial<Tile>) {
    setTiles((ts) => ts.map((t, idx) => (idx === i ? { ...t, ...p } : t)));
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/home-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, kind: "occasions", tiles }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      toast.success("Occasion tiles saved.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card">
      <h2 className="admin-subtitle">Home — trending occasions</h2>
      <p className="admin-hint">
        The three tiles in “By trending occasions” on the home page. Each links to
        the Curator filtered by its occasions (comma-separated facet values, e.g.{" "}
        <code>Party Wear,Cocktail</code>). Image = any hosted URL. Leave all blank
        to use auto imagery from the catalog.
      </p>

      {tiles.map((t, i) => (
        <div key={i} className="admin-card" style={{ marginTop: "1.25rem" }}>
          <label className="admin-label">Title</label>
          <input
            className="admin-input"
            value={t.title}
            onChange={(e) => patch(i, { title: e.target.value })}
          />
          <label className="admin-label">Description</label>
          <input
            className="admin-input"
            value={t.description}
            onChange={(e) => patch(i, { description: e.target.value })}
          />
          <label className="admin-label">Occasions (Curator filter, comma-separated)</label>
          <input
            className="admin-input"
            value={t.occasions}
            onChange={(e) => patch(i, { occasions: e.target.value })}
            placeholder="Date Night"
          />
          <label className="admin-label">Image URL</label>
          <input
            className="admin-input"
            type="url"
            value={t.image}
            onChange={(e) => patch(i, { image: e.target.value })}
            placeholder="https://…/image.jpg"
          />
        </div>
      ))}

      <button className="btn-line admin-btn" type="button" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save occasion tiles"}
      </button>
    </div>
  );
}
