"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PackagesAdmin from "@/components/admin/PackagesAdmin";
import { formatPrice, type Product } from "@/lib/data/products";
import {
  CURRENCIES,
  UPLOADABLE_TYPES,
  COLOURS,
  OCCASIONS,
} from "@/lib/data/vocab";

const MAX_IMAGES = 6;

interface Draft {
  brand: string;
  name: string;
  priceAmount: string;
  currency: string;
  images: string[];
  sourceUrl: string;
  description: string;
  stylistNote: string;
  type: string;
  colours: string[];
  occasions: string[];
  dropDate: string;
  oneTapScore: number;
}

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY: Draft = {
  brand: "",
  name: "",
  priceAmount: "",
  currency: "USD",
  images: [],
  sourceUrl: "",
  description: "",
  stylistNote: "",
  type: "",
  colours: [],
  occasions: [],
  dropDate: today(),
  oneTapScore: 70,
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [tab, setTab] = useState<"pieces" | "packages">("pieces");

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

  function startBlank() {
    setDraft({ ...EMPTY, dropDate: today() });
    setHasDraft(true);
    setStatus("");
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
      const p = data.product ?? {};
      setDraft({
        ...EMPTY,
        dropDate: today(),
        brand: p.brand ?? "",
        name: p.name ?? "",
        images: p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [],
        sourceUrl: p.sourceUrl ?? "",
        priceAmount: p.priceAmount != null ? String(p.priceAmount) : "",
        currency: p.currency || "USD",
      });
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
      setDraft({ ...EMPTY, dropDate: today() });
      setHasDraft(false);
      setUrl("");
      loadRecent(password);
    } catch {
      setStatus("Save failed.");
    } finally {
      setBusy(false);
    }
  }

  const set =
    (k: keyof Draft) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setDraft((d) => ({ ...d, [k]: e.target.value }));

  const toggle = (k: "colours" | "occasions", v: string) =>
    setDraft((d) => ({
      ...d,
      [k]: d[k].includes(v) ? d[k].filter((x) => x !== v) : [...d[k], v],
    }));

  const setImage = (i: number, v: string) =>
    setDraft((d) => ({ ...d, images: d.images.map((x, j) => (j === i ? v : x)) }));
  const addImage = () =>
    setDraft((d) => (d.images.length >= MAX_IMAGES ? d : { ...d, images: [...d.images, ""] }));
  const removeImage = (i: number) =>
    setDraft((d) => ({ ...d, images: d.images.filter((_, j) => j !== i) }));

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
          <h1 className="admin-title">{tab === "pieces" ? "Add a Piece" : "Packages"}</h1>
        </div>
        <Link href="/" className="admin-link">View catalogue →</Link>
      </div>

      <div className="admin-tabs">
        <button
          className={"admin-tab" + (tab === "pieces" ? " on" : "")}
          onClick={() => setTab("pieces")}
        >
          Pieces
        </button>
        <button
          className={"admin-tab" + (tab === "packages" ? " on" : "")}
          onClick={() => setTab("packages")}
        >
          Packages
        </button>
      </div>

      {tab === "packages" ? (
        <PackagesAdmin password={password} />
      ) : (
        <>
          <form className="admin-card" onSubmit={fetchFromUrl}>
        <label className="admin-label">Product URL</label>
        <p className="admin-hint">
          Paste a link from Zara, H&amp;M, Gucci, Prada… We’ll pull the brand,
          name, price and image. You can edit anything before saving — or{" "}
          <button type="button" className="admin-inline-btn" onClick={startBlank}>
            add one manually
          </button>
          .
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
            <Field label="Brand / house" value={draft.brand} onChange={set("brand")} />
            <Field label="Piece name" value={draft.name} onChange={set("name")} placeholder="Twisted gathered jersey midi dress" />

            <div className="admin-field-row">
              <label className="admin-field">
                <span className="admin-label">Price</span>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  step="1"
                  value={draft.priceAmount}
                  onChange={set("priceAmount")}
                  placeholder="0"
                />
              </label>
              <label className="admin-field admin-field--narrow">
                <span className="admin-label">Currency</span>
                <select className="admin-input" value={draft.currency} onChange={set("currency")}>
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="admin-field">
              <span className="admin-label">Clothing type</span>
              <select className="admin-input" value={draft.type} onChange={set("type")}>
                <option value="">Select a type…</option>
                {UPLOADABLE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <div className="admin-field">
              <span className="admin-label">Colours</span>
              <div className="swatch-row">
                {COLOURS.map((c) => (
                  <button
                    type="button"
                    key={c.name}
                    className={"swatch" + (draft.colours.includes(c.name) ? " on" : "")}
                    onClick={() => toggle("colours", c.name)}
                    title={c.name}
                  >
                    <span
                      className="swatch-dot"
                      data-print={c.hex === null ? "" : undefined}
                      style={c.hex ? { background: c.hex } : undefined}
                    />
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-field">
              <span className="admin-label">Occasions</span>
              <div className="chips-inline">
                {OCCASIONS.map((o) => (
                  <button
                    type="button"
                    key={o}
                    className={"chip" + (draft.occasions.includes(o) ? " on" : "")}
                    onClick={() => toggle("occasions", o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-field-row">
              <label className="admin-field">
                <span className="admin-label">Drop date</span>
                <input className="admin-input" type="date" value={draft.dropDate} onChange={set("dropDate")} />
              </label>
              <label className="admin-field">
                <span className="admin-label">OneTap score · {draft.oneTapScore}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={draft.oneTapScore}
                  onChange={(e) => setDraft((d) => ({ ...d, oneTapScore: Number(e.target.value) }))}
                />
              </label>
            </div>

            <Field
              label="Stylist note"
              value={draft.stylistNote}
              onChange={set("stylistNote")}
              placeholder="The one italic line on the card"
            />

            <label className="admin-field">
              <span className="admin-label">Description</span>
              <textarea
                className="admin-input admin-textarea"
                rows={3}
                value={draft.description}
                onChange={set("description")}
                placeholder="Fabric, cut, fit, provenance — 2–3 plain sentences."
              />
            </label>

            <div className="admin-field">
              <span className="admin-label">
                Images
                <em className="profile-img-hint"> · first is primary · up to {MAX_IMAGES}</em>
              </span>
              {draft.images.map((img, i) => (
                <div key={i} className="admin-img-row">
                  <input
                    className="admin-input"
                    value={img}
                    placeholder={i === 0 ? "Primary image URL" : `Variant ${i + 1} URL`}
                    onChange={(e) => setImage(i, e.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-img-rm"
                    onClick={() => removeImage(i)}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {draft.images.length < MAX_IMAGES && (
                <button type="button" className="admin-inline-btn" onClick={addImage}>
                  + Add image
                </button>
              )}
            </div>
          </div>

          <div className="admin-preview admin-gallery">
            {draft.images.filter(Boolean).length ? (
              draft.images.filter(Boolean).map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} alt={`Preview ${i + 1}`} />
              ))
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
                    <span className="admin-recent-price">{formatPrice(p.price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
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
