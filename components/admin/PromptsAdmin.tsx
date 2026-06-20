"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";

/**
 * Admin editor for the two core generation prompts (DB-backed, server-cached):
 * the try-on IMAGE base prompt and the VIDEO identity-lock prompt. Edits are
 * picked up by the next generation (the save route busts the cache tag).
 */

interface PromptRow {
  id: string;
  label: string;
  content: string;
  updated_at: string | null;
}

export default function PromptsAdmin({ password }: { password: string }) {
  const toast = useToast();
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/prompts", {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) return;
      const d = await res.json();
      const rows: PromptRow[] = d.prompts ?? [];
      setPrompts(rows);
      setDrafts(Object.fromEntries(rows.map((p) => [p.id, p.content])));
    } catch {
      /* ignore */
    }
  }, [password]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(id: string) {
    setBusyId(id);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id, content: drafts[id] ?? "" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(d?.error || "Could not save the prompt.");
        return;
      }
      toast.success("Prompt saved — live within a minute.");
      load();
    } catch {
      toast.error("Could not save the prompt.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="admin-card">
      <h2 className="admin-subtitle">Generation prompts</h2>
      <p className="admin-hint">
        Tune the core try-on prompts. <code>{"{scene}"}</code> is replaced by the
        per-look scene/garment prompt (the film brief, FIFA moment, or moment image
        prompt). Saving takes effect on the next generation.
      </p>

      {prompts.map((p) => {
        const dirty = (drafts[p.id] ?? "") !== p.content;
        return (
          <div key={p.id} className="prompt-edit">
            <label className="admin-label">{p.label}</label>
            <textarea
              className="admin-input prompt-textarea"
              rows={8}
              value={drafts[p.id] ?? ""}
              onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
            />
            <div className="prompt-edit-foot">
              <button
                className="btn-line admin-btn"
                onClick={() => save(p.id)}
                disabled={busyId === p.id || !dirty}
              >
                {busyId === p.id ? "Saving…" : dirty ? "Save" : "Saved"}
              </button>
              {p.updated_at && (
                <span className="admin-hint" style={{ margin: 0 }}>
                  Updated {new Date(p.updated_at).toLocaleString()}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
