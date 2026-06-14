"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";

/**
 * Admin manager for the FIFA "Viral Fan" campaign: attach jersey products
 * (per kit) to each nation, and review the film moments. Teams + moments are
 * seeded; jerseys are attached here after adding the jersey products (Pieces
 * tab, with "Campaign only" on).
 */

const KITS = ["Home", "Home (Authentic)", "Away", "Away (Authentic)"];

interface Team { id: string; country: string; accent: string | null; flag: string | null }
interface Jersey { id: string; country: string; kit: string; product_id: string | null }
interface Moment { id: string; label: string; prompt: string; image_prompt: string | null; sort_order: number }
interface JerseyProduct { id: string; brand: string; name: string; image_url: string }

export default function CampaignManager({ password }: { password: string }) {
  const toast = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [jerseys, setJerseys] = useState<Jersey[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [products, setProducts] = useState<JerseyProduct[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  // per-team draft: { [country]: { kit, productId } }
  const [draft, setDraft] = useState<Record<string, { kit: string; productId: string }>>({});
  const [newLabel, setNewLabel] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newImagePrompt, setNewImagePrompt] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/campaigns", { headers: { "x-admin-password": password } });
      if (!res.ok) return;
      const d = await res.json();
      setTeams(d.teams ?? []);
      setJerseys(d.jerseys ?? []);
      setMoments(d.moments ?? []);
      setProducts(d.products ?? []);
    } catch {
      /* ignore */
    }
  }, [password]);

  useEffect(() => {
    load();
  }, [load]);

  async function post(payload: Record<string, unknown>) {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, ...payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("Saved.");
        toast.success("Saved.");
        load();
      } else {
        const msg = d?.error || "Save failed.";
        setStatus(msg);
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="admin-hint">
        Attach jersey products to each nation (add the jerseys first in <strong>Pieces</strong> with
        “Campaign only” on). A nation can hold multiple kits — Home, Away, Authentic. These power the{" "}
        <a className="admin-inline-btn" href="/fifa" target="_blank" rel="noreferrer">/fifa</a> landing.
      </p>

      {products.length === 0 && (
        <p className="admin-status">
          No campaign jerseys yet — add jersey products in Pieces (toggle “Campaign only”), then attach them here.
        </p>
      )}

      {teams.map((t) => {
        const kits = jerseys.filter((j) => j.country === t.country);
        const d = draft[t.country] ?? { kit: "Home", productId: "" };
        return (
          <section key={t.id} className="admin-card">
            <h2 className="admin-subtitle">
              <span style={{ marginRight: 8 }}>{t.flag}</span>
              {t.country}
            </h2>

            {kits.length > 0 ? (
              <ul className="admin-recent" style={{ marginTop: 0 }}>
                {kits.map((j) => {
                  const p = products.find((x) => x.id === j.product_id);
                  return (
                    <li key={j.id} className="admin-recent-row" style={{ cursor: "default" }}>
                      <span className="admin-recent-brand">{j.kit}</span>
                      <span className="admin-recent-name">{p ? p.name : j.product_id ?? "—"}</span>
                      <button
                        className="admin-img-rm"
                        onClick={() => post({ action: "removeJersey", id: j.id })}
                        disabled={busy}
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="admin-hint">No jersey attached yet.</p>
            )}

            <div className="pkg-row" style={{ marginTop: 12 }}>
              <label className="admin-field">
                <span className="admin-label">Kit</span>
                <select
                  className="admin-input"
                  value={d.kit}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, [t.country]: { ...d, kit: e.target.value } }))
                  }
                >
                  {KITS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span className="admin-label">Jersey product</span>
                <select
                  className="admin-input"
                  value={d.productId}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, [t.country]: { ...d, productId: e.target.value } }))
                  }
                >
                  <option value="">Select a jersey…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.brand} — {p.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <button
              className="btn-line admin-btn"
              disabled={busy || !d.productId}
              onClick={() =>
                post({ action: "addJersey", country: t.country, kit: d.kit, productId: d.productId })
              }
            >
              Attach jersey
            </button>
          </section>
        );
      })}

      <section className="admin-card">
        <h2 className="admin-subtitle">Moments</h2>
        <p className="admin-hint">
          Each moment has two prompts — the <strong>video</strong> scene (sent to the
          film model) and the <strong>image</strong> prompt (used to compose the still
          onto the try-on). Use ↑/↓ to set the order shown on{" "}
          <a className="admin-inline-btn" href="/fifa" target="_blank" rel="noreferrer">/fifa</a>.
        </p>

        {moments.map((m, i) => (
          <MomentEditor
            key={m.id}
            moment={m}
            busy={busy}
            canUp={i > 0}
            canDown={i < moments.length - 1}
            onMove={(dir) => {
              const next = [...moments];
              const j = dir === "up" ? i - 1 : i + 1;
              if (j < 0 || j >= next.length) return;
              [next[i], next[j]] = [next[j], next[i]];
              post({ action: "reorderMoments", ids: next.map((x) => x.id) });
            }}
            onSave={(label, prompt, imagePrompt) =>
              post({ action: "updateMoment", id: m.id, label, prompt, imagePrompt })
            }
            onRemove={() => post({ action: "removeMoment", id: m.id })}
          />
        ))}

        {/* add a new moment */}
        <div className="moment-edit">
          <input
            className="admin-input"
            placeholder="New moment label (e.g. Tunnel walk-out)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
          />
          <textarea
            className="admin-input admin-textarea"
            rows={4}
            placeholder="Video scene prompt — describe the shot, motion, stadium, lighting, mood…"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
          />
          <textarea
            className="admin-input admin-textarea"
            rows={4}
            placeholder="Image prompt (optional) — how to compose the still onto the try-on…"
            value={newImagePrompt}
            onChange={(e) => setNewImagePrompt(e.target.value)}
          />
          <button
            className="btn-line admin-btn"
            disabled={busy || !newLabel.trim() || !newPrompt.trim()}
            onClick={async () => {
              await post({ action: "moment", label: newLabel, prompt: newPrompt, imagePrompt: newImagePrompt });
              setNewLabel("");
              setNewPrompt("");
              setNewImagePrompt("");
            }}
          >
            Add moment
          </button>
        </div>
      </section>

      {status && <p className="admin-status">{status}</p>}
    </>
  );
}

/** Inline editor for one moment — editable label + video prompt + image prompt,
    plus reorder (↑/↓) controls. */
function MomentEditor({
  moment,
  busy,
  canUp,
  canDown,
  onMove,
  onSave,
  onRemove,
}: {
  moment: Moment;
  busy: boolean;
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: "up" | "down") => void;
  onSave: (label: string, prompt: string, imagePrompt: string) => void;
  onRemove: () => void;
}) {
  const [label, setLabel] = useState(moment.label);
  const [prompt, setPrompt] = useState(moment.prompt);
  const [imagePrompt, setImagePrompt] = useState(moment.image_prompt ?? "");
  // Keep in sync if the parent reloads after a save.
  useEffect(() => {
    setLabel(moment.label);
    setPrompt(moment.prompt);
    setImagePrompt(moment.image_prompt ?? "");
  }, [moment.label, moment.prompt, moment.image_prompt]);

  const dirty =
    label !== moment.label || prompt !== moment.prompt || imagePrompt !== (moment.image_prompt ?? "");

  return (
    <div className="moment-edit">
      <div className="moment-edit-head">
        <input className="admin-input" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="admin-img-rm" onClick={() => onMove("up")} disabled={busy || !canUp} aria-label="Move up">
          ↑
        </button>
        <button className="admin-img-rm" onClick={() => onMove("down")} disabled={busy || !canDown} aria-label="Move down">
          ↓
        </button>
        <button className="admin-img-rm" onClick={onRemove} disabled={busy} aria-label="Remove moment">
          ✕
        </button>
      </div>
      <span className="admin-label">Video prompt</span>
      <textarea
        className="admin-input admin-textarea"
        rows={5}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <span className="admin-label">Image prompt</span>
      <textarea
        className="admin-input admin-textarea"
        rows={5}
        placeholder="How to compose the still onto the try-on image (used later for image gen)…"
        value={imagePrompt}
        onChange={(e) => setImagePrompt(e.target.value)}
      />
      <button
        className="btn-line admin-btn"
        disabled={busy || !dirty || !label.trim() || !prompt.trim()}
        onClick={() => onSave(label, prompt, imagePrompt)}
      >
        {dirty ? "Save changes" : "Saved"}
      </button>
    </div>
  );
}
