"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";

/**
 * Edit the three home-page module cards (Curator / 360° Try-On / Atelier Scenes):
 * title, tag, blurb, background video clip (mp4 URL) + poster. Stored in
 * home_modules; the home page reads them server-side.
 */

interface ModuleDraft {
  id: string;
  title: string;
  tag: string;
  blurb: string;
  videoUrl: string;
  posterUrl: string;
}

interface Row {
  id: string;
  title: string;
  tag: string;
  blurb: string;
  video_url: string | null;
  poster_url: string | null;
}

export default function HomeModulesAdmin({ password }: { password: string }) {
  const toast = useToast();
  const [modules, setModules] = useState<ModuleDraft[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/home-modules", {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) return;
      const d = await res.json();
      setModules(
        ((d.modules ?? []) as Row[]).map((m) => ({
          id: m.id,
          title: m.title ?? "",
          tag: m.tag ?? "",
          blurb: m.blurb ?? "",
          videoUrl: m.video_url ?? "",
          posterUrl: m.poster_url ?? "",
        })),
      );
    } catch {
      /* ignore */
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  function patch(id: string, p: Partial<ModuleDraft>) {
    setModules((ms) => ms.map((m) => (m.id === id ? { ...m, ...p } : m)));
  }

  async function save(m: ModuleDraft) {
    setBusy(m.id);
    try {
      const res = await fetch("/api/admin/home-modules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, module: m }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      toast.success(`Saved “${m.title}”.`);
      void load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-card">
      <h2 className="admin-subtitle">Home modules</h2>
      <p className="admin-hint">
        The three cards in “Three ways to try on yourself” on the{" "}
        <a className="admin-inline-btn" href="/" target="_blank" rel="noreferrer">
          home page
        </a>
        . Each shows a background clip (a public <code>.mp4</code> URL) under a dark
        overlay with the text below. Poster shows before/without the video. Empty
        video = the poster (or a plain dark card) is used.
      </p>

      {modules.map((m) => (
        <div key={m.id} className="admin-card" style={{ marginTop: "1.25rem" }}>
          <label className="admin-label">Title</label>
          <input
            className="admin-input"
            value={m.title}
            onChange={(e) => patch(m.id, { title: e.target.value })}
          />

          <label className="admin-label">Tag</label>
          <input
            className="admin-input"
            value={m.tag}
            onChange={(e) => patch(m.id, { tag: e.target.value })}
          />

          <label className="admin-label">Blurb</label>
          <textarea
            className="admin-input admin-textarea"
            rows={2}
            value={m.blurb}
            onChange={(e) => patch(m.id, { blurb: e.target.value })}
          />

          <label className="admin-label">Background video URL (mp4)</label>
          <input
            className="admin-input"
            type="url"
            value={m.videoUrl}
            onChange={(e) => patch(m.id, { videoUrl: e.target.value })}
            placeholder="https://…/clip.mp4"
          />

          <label className="admin-label">Poster image URL</label>
          <input
            className="admin-input"
            type="url"
            value={m.posterUrl}
            onChange={(e) => patch(m.id, { posterUrl: e.target.value })}
            placeholder="https://…/poster.jpg"
          />

          <button
            className="btn-line admin-btn"
            type="button"
            onClick={() => save(m)}
            disabled={busy !== null}
          >
            {busy === m.id ? "Saving…" : `Save ${m.title || m.id}`}
          </button>
        </div>
      ))}
    </div>
  );
}
