"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/data/products";

interface Draft {
  brand: string;
  name: string;
  price: string;
  imageUrl: string;
  sourceUrl: string;
}

const EMPTY: Draft = { brand: "", name: "", price: "", imageUrl: "", sourceUrl: "" };

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");

  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hasDraft, setHasDraft] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<Product[]>([]);

  const loadRecent = useCallback(async (pw: string) => {
    try {
      const res = await fetch("/api/admin/products", { headers: { "x-admin-password": pw } });
      if (res.ok) setRecent((await res.json()).products ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (authed) loadRecent(password);
  }, [authed, password, loadRecent]);

  async function authenticate(e: React.FormEvent) {
    e.preventDefault();
    setAuthErr("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) setAuthed(true);
    else setAuthErr((await res.json().catch(() => ({})))?.error || "Incorrect password");
  }

  async function fetchFromUrl(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setStatus("Reading the page…");
    try {
      const res = await fetch("/api/admin/scrape-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data?.error || "Could not read that URL.");
        return;
      }
      setDraft({ ...EMPTY, ...data.product });
      setHasDraft(true);
      if (data.blocked) setStatus("That site blocked automated reading — fill the fields in manually.");
      else if (data.partial) setStatus("Some fields couldn’t be detected — review and complete them.");
      else setStatus("Details extracted — review, then save.");
    } catch {
      setStatus("Something went wrong reading that URL.");
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus("Saving…");
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, ...draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data?.error || "Save failed.");
        return;
      }
      setStatus(`Added “${data.product.brand} — ${data.product.name}”.`);
      setDraft(EMPTY);
      setHasDraft(false);
      setUrl("");
      loadRecent(password);
    } catch {
      setStatus("Save failed.");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  if (!authed) {
    return (
      <main className="admin-wrap">
        <p className="eyebrow">OneTap Atelier — Atelier Desk</p>
        <h1 className="admin-title">Admin</h1>
        <form className="admin-card admin-gate" onSubmit={authenticate}>
          <label className="admin-label">Password</label>
          <input
            type="password"
            className="admin-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {authErr && <p className="admin-err">{authErr}</p>}
          <button type="submit" className="btn-line admin-btn">Enter</button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-wrap">
      <div className="admin-head">
        <div>
          <p className="eyebrow">OneTap Atelier — Atelier Desk</p>
          <h1 className="admin-title">Add a Product</h1>
        </div>
        <Link href="/" className="admin-link">View catalogue →</Link>
      </div>

      <form className="admin-card" onSubmit={fetchFromUrl}>
        <label className="admin-label">Product URL</label>
        <p className="admin-hint">
          Paste a link from Zara, H&amp;M, Gucci, Prada… We’ll pull the brand,
          name, price and image. You can edit anything before saving.
        </p>
        <div className="admin-row">
          <input
            type="url"
            className="admin-input"
            placeholder="https://www.zara.com/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button type="submit" className="btn-line admin-btn" disabled={busy}>
            {busy ? "Reading…" : "Fetch"}
          </button>
        </div>
      </form>

      {status && <p className="admin-status">{status}</p>}

      {hasDraft && (
        <form className="admin-card admin-form" onSubmit={save}>
          <div className="admin-fields">
            <Field label="Brand" value={draft.brand} onChange={set("brand")} />
            <Field label="Name" value={draft.name} onChange={set("name")} />
            <Field label="Price" value={draft.price} onChange={set("price")} placeholder="$0,000" />
            <Field label="Image URL" value={draft.imageUrl} onChange={set("imageUrl")} />
          </div>
          <div className="admin-preview">
            {draft.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.imageUrl} alt="Preview" />
            ) : (
              <div className="admin-preview-empty">No image</div>
            )}
          </div>
          <button type="submit" className="btn-line admin-btn admin-save" disabled={busy}>
            {busy ? "Saving…" : "Save to catalogue"}
          </button>
        </form>
      )}

      {recent.length > 0 && (
        <section className="admin-recent">
          <h2 className="admin-subtitle">Recently added</h2>
          <ul>
            {recent.map((p) => (
              <li key={p.id}>
                <span className="admin-recent-brand">{p.brand}</span>
                <span className="admin-recent-name">{p.name}</span>
                <span className="admin-recent-price">{p.price}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  return (
    <label className="admin-field">
      <span className="admin-label">{label}</span>
      <input className="admin-input" value={value} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}
