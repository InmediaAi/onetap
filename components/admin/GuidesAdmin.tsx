"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";

/** Admin editor for the Journal guides (SEO/GEO long-form content). */

interface GuideRow {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published";
  source: string;
  updatedAt: string | null;
}

interface Draft {
  id: string | null;
  slug: string;
  title: string;
  metaDescription: string;
  answer: string;
  bodyMd: string;
  faqText: string; // one "Question | Answer" per line
  heroImage: string;
  relatedBrands: string;
  relatedOccasions: string;
  status: "draft" | "published";
}

const EMPTY: Draft = {
  id: null,
  slug: "",
  title: "",
  metaDescription: "",
  answer: "",
  bodyMd: "",
  faqText: "",
  heroImage: "",
  relatedBrands: "",
  relatedOccasions: "",
  status: "draft",
};

const csv = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const parseFaq = (s: string) =>
  s
    .split("\n")
    .map((line) => {
      const i = line.indexOf("|");
      if (i < 0) return null;
      return { q: line.slice(0, i).trim(), a: line.slice(i + 1).trim() };
    })
    .filter((f): f is { q: string; a: string } => Boolean(f && f.q && f.a));

export default function GuidesAdmin({ password }: { password: string }) {
  const toast = useToast();
  const [list, setList] = useState<GuideRow[]>([]);
  const [d, setD] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [aiTerm, setAiTerm] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  async function aiDraft() {
    if (!aiTerm.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/admin/guides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, term: aiTerm.trim() }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Drafted "${j.title ?? aiTerm}". Review it below.`);
        setAiTerm("");
        load();
      } else {
        toast.error(j?.error || "Draft failed.");
      }
    } finally {
      setAiBusy(false);
    }
  }

  async function seedQueue() {
    setAiBusy(true);
    try {
      const res = await fetch("/api/admin/guides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, seed: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) toast.success(`Seeded ${j.seeded ?? 0} keyword topics.`);
      else toast.error(j?.error || "Seed failed.");
    } finally {
      setAiBusy(false);
    }
  }

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/guides", { headers: { "x-admin-password": password } });
      if (!res.ok) return;
      const j = await res.json();
      setList(j.guides ?? []);
    } catch {
      /* ignore */
    }
  }, [password]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (patch: Partial<Draft>) => setD((p) => ({ ...p, ...patch }));

  async function editRow(id: string) {
    const res = await fetch("/api/admin/guides", { headers: { "x-admin-password": password } });
    const j = await res.json().catch(() => ({ guides: [] }));
    // The admin list endpoint returns full guides; find the one clicked.
    const g = (j.guides ?? []).find((x: { id: string }) => x.id === id);
    if (!g) return;
    setD({
      id: g.id,
      slug: g.slug,
      title: g.title,
      metaDescription: g.metaDescription ?? "",
      answer: g.answer ?? "",
      bodyMd: g.bodyMd ?? "",
      faqText: (g.faq ?? []).map((f: { q: string; a: string }) => `${f.q} | ${f.a}`).join("\n"),
      heroImage: g.heroImage ?? "",
      relatedBrands: (g.relatedBrands ?? []).join(", "),
      relatedOccasions: (g.relatedOccasions ?? []).join(", "),
      status: g.status === "published" ? "published" : "draft",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!d.title.trim()) {
      toast.error("Title is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/guides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          guide: {
            slug: d.slug,
            title: d.title,
            metaDescription: d.metaDescription,
            answer: d.answer,
            bodyMd: d.bodyMd,
            faq: parseFaq(d.faqText),
            heroImage: d.heroImage,
            relatedBrands: csv(d.relatedBrands),
            relatedOccasions: csv(d.relatedOccasions),
            status: d.status,
          },
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Saved "${d.title}".`);
        setD(EMPTY);
        load();
      } else {
        toast.error(j?.error || "Save failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/guides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, id }),
      });
      if (res.ok) {
        toast.success("Guide deleted.");
        setPendingDelete(null);
        if (d.id === id) setD(EMPTY);
        load();
      } else {
        toast.error("Delete failed.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <section className="admin-card">
        <h2 className="admin-subtitle">AI draft (Claude)</h2>
        <p className="admin-hint">
          Enter a target query — the pipeline drafts a full guide grounded on real catalog
          pieces and saves it as a <strong>draft</strong> below for your review. Requires
          ANTHROPIC_API_KEY. “Seed queue” fills the keyword queue from your catalog for the
          scheduled pipeline.
        </p>
        <div className="admin-row">
          <input
            className="admin-input"
            placeholder="e.g. what to wear to a winter wedding"
            value={aiTerm}
            onChange={(e) => setAiTerm(e.target.value)}
          />
          <button className="btn-line admin-btn" onClick={aiDraft} disabled={aiBusy}>
            {aiBusy ? "Drafting…" : "Draft with AI"}
          </button>
          <button className="admin-inline-btn" onClick={seedQueue} disabled={aiBusy}>
            Seed queue
          </button>
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-subtitle">{d.id ? "Edit guide" : "New guide"}</h2>
        <p className="admin-hint">
          Long-form, question-style content for SEO + AI answer engines. Put a direct answer in
          the intro. Markdown supported (## headings, **bold**, - lists, [links](/brands/…)).
        </p>

        <label className="admin-field">
          <span className="admin-label">Title</span>
          <input className="admin-input" value={d.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Slug (blank = from title)</span>
          <input className="admin-input" value={d.slug} placeholder="what-to-wear-to-a-wedding" onChange={(e) => set({ slug: e.target.value })} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Meta description (search snippet, ~155 chars)</span>
          <input className="admin-input" value={d.metaDescription} onChange={(e) => set({ metaDescription: e.target.value })} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Direct-answer intro (the GEO lead paragraph)</span>
          <textarea className="admin-input" rows={3} value={d.answer} onChange={(e) => set({ answer: e.target.value })} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Body (markdown)</span>
          <textarea className="admin-input" rows={12} value={d.bodyMd} onChange={(e) => set({ bodyMd: e.target.value })} />
        </label>
        <label className="admin-field">
          <span className="admin-label">FAQ — one “Question | Answer” per line</span>
          <textarea
            className="admin-input"
            rows={4}
            placeholder="What do you wear to a wedding? | A polished dress or elevated separates…"
            value={d.faqText}
            onChange={(e) => set({ faqText: e.target.value })}
          />
        </label>
        <div className="pkg-row">
          <label className="admin-field">
            <span className="admin-label">Hero image URL</span>
            <input className="admin-input" value={d.heroImage} onChange={(e) => set({ heroImage: e.target.value })} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Related brands (comma-separated)</span>
            <input className="admin-input" value={d.relatedBrands} onChange={(e) => set({ relatedBrands: e.target.value })} />
          </label>
          <label className="admin-field">
            <span className="admin-label">Related occasions (comma-separated)</span>
            <input className="admin-input" value={d.relatedOccasions} onChange={(e) => set({ relatedOccasions: e.target.value })} />
          </label>
        </div>
        <div className="pkg-toggles">
          <label className="pkg-check">
            <input
              type="checkbox"
              checked={d.status === "published"}
              onChange={(e) => set({ status: e.target.checked ? "published" : "draft" })}
            />
            Published (visible on /journal + sitemap)
          </label>
        </div>
        <div className="admin-row">
          <button className="btn-line admin-btn" onClick={save} disabled={busy}>
            {busy ? "Saving…" : d.id ? "Update guide" : "Create guide"}
          </button>
          {d.id && (
            <button className="admin-inline-btn" onClick={() => setD(EMPTY)} disabled={busy}>
              Cancel edit
            </button>
          )}
        </div>
      </section>

      <section className="admin-card">
        <h2 className="admin-subtitle">Guides ({list.length})</h2>
        {list.length === 0 ? (
          <p className="admin-hint">No guides yet.</p>
        ) : (
          <ul className="admin-list">
            {list.map((g) => (
              <li key={g.id} className="admin-list-row">
                <div>
                  <strong>{g.title}</strong>{" "}
                  <span className="admin-hint">
                    /{g.slug} · {g.status}
                    {g.source !== "manual" ? ` · ${g.source}` : ""}
                  </span>
                </div>
                <div className="admin-row">
                  <button className="admin-inline-btn" onClick={() => editRow(g.id)}>
                    Edit
                  </button>
                  {pendingDelete === g.id ? (
                    <>
                      <button className="admin-inline-btn" onClick={() => del(g.id)} disabled={busy}>
                        Confirm delete
                      </button>
                      <button className="admin-inline-btn" onClick={() => setPendingDelete(null)}>
                        No
                      </button>
                    </>
                  ) : (
                    <button className="admin-inline-btn" onClick={() => setPendingDelete(g.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
