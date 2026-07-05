"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";

/**
 * Edit the "By your favourite top houses" carousel (section 4). One house per
 * line: `Brand Name | https://image-url`. Up to 8. Image can be any hosted URL.
 * Empty = the site falls back to the top houses by catalog depth.
 */

interface HouseTile {
  name: string;
  image?: string | null;
}

function toText(tiles: HouseTile[]): string {
  return tiles.map((t) => `${t.name}${t.image ? ` | ${t.image}` : ""}`).join("\n");
}

function parse(text: string): { name: string; image: string }[] {
  return text
    .split("\n")
    .map((line) => {
      const [name, ...rest] = line.split("|");
      return { name: (name ?? "").trim(), image: rest.join("|").trim() };
    })
    .filter((t) => t.name)
    .slice(0, 8);
}

export default function HouseTilesAdmin({ password }: { password: string }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/home-config", {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) return;
      const d = await res.json();
      setText(toText((d.houseTiles ?? []) as HouseTile[]));
    } catch {
      /* ignore */
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/home-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, kind: "houses", tiles: parse(text) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      toast.success("House carousel saved.");
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card">
      <h2 className="admin-subtitle">Home - favourite houses</h2>
      <p className="admin-hint">
        The auto-swiping house carousel on the home page. One house per line:{" "}
        <code>Brand Name | https://image-url</code>. Up to 8 (shows 4 at a time).
        The name links to that brand’s page; the image can be any hosted URL. Leave
        empty to auto-use the top houses by catalogue depth.
      </p>
      <textarea
        className="admin-input admin-textarea"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Saint Laurent | https://…/ysl.jpg\nBottega Veneta | https://…/bv.jpg"}
      />
      <button className="btn-line admin-btn" type="button" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save house carousel"}
      </button>
    </div>
  );
}
