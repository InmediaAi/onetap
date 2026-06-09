"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PackagesAdmin from "@/components/admin/PackagesAdmin";
import CampaignLinks from "@/components/admin/CampaignLinks";
import { formatPrice, type Product } from "@/lib/data/products";
import {
  CURRENCIES,
  PRODUCT_CATEGORIES,
  PRODUCT_STYLES,
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
  buyUrl: string;
  description: string;
  stylistNote: string;
  category: string;
  style: string[];
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
  buyUrl: "",
  description: "",
  stylistNote: "",
  category: "",
  style: [],
  colours: [],
  occasions: [],
  dropDate: today(),
  oneTapScore: 70,
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [authErr, setAuthErr] = useState("");
  const [tab, setTab] = useState<"pieces" | "packages" | "campaigns">("pieces");

  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hasDraft, setHasDraft] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

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
    setEditingId(null);
    setStatus("");
  }

  /** Load an existing piece into the form for editing (id stays stable). */
  function loadForEdit(p: Product) {
    setDraft({
      brand: p.brand,
      name: p.name,
      priceAmount: p.price?.amount ? String(p.price.amount) : "",
      currency: p.price?.currency || "USD",
      images: p.images?.length ? p.images : p.imageUrl ? [p.imageUrl] : [],
      sourceUrl: "",
      buyUrl: p.buyUrl ?? "",
      description: p.description ?? "",
      stylistNote: p.stylistNote ?? "",
      category: p.category ?? "",
      style: p.style ?? [],
      colours: p.colours ?? [],
      occasions: p.occasions ?? [],
      dropDate: p.droppedAt ?? today(),
      oneTapScore: p.oneTapScore ?? 70,
    });
    setHasDraft(true);
    setEditingId(p.id);
    setStatus(`Editing “${p.brand} — ${p.name}”.`);
    setUrl("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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
        buyUrl: p.sourceUrl ?? "", // the scraped product page is the purchase link
        priceAmount: p.priceAmount != null ? String(p.priceAmount) : "",
        currency: p.currency || "USD",
        category: p.category ?? "", // best-effort guess; admin confirms
        colours: Array.isArray(p.colours) ? p.colours : [],
      });
      setHasDraft(true);
      setEditingId(null);
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
        body: JSON.stringify({ password, editId: editingId ?? undefined, ...draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data?.error || "Save failed.");
        return;
      }
      setStatus(
        `${editingId ? "Updated" : "Added"} “${data.product.brand} — ${data.product.name}”.`,
      );
      setDraft({ ...EMPTY, dropDate: today() });
      setHasDraft(false);
      setEditingId(null);
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

  const toggle = (k: "colours" | "occasions" | "style", v: string) =>
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
          <h1 className="admin-title">
            {tab === "packages"
              ? "Packages"
              : tab === "campaigns"
                ? "Campaigns"
                : editingId
                  ? "Edit a Piece"
                  : "Add a Piece"}
          </h1>
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
        <button
          className={"admin-tab" + (tab === "campaigns" ? " on" : "")}
          onClick={() => setTab("campaigns")}
        >
          Campaigns
        </button>
      </div>

      {tab === "packages" ? (
        <PackagesAdmin password={password} />
      ) : tab === "campaigns" ? (
        <CampaignLinks password={password} />
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
              <span className="admin-label">Category</span>
              <select className="admin-input" value={draft.category} onChange={set("category")}>
                <option value="">Select a category…</option>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>

            <div className="admin-field">
              <span className="admin-label">Style</span>
              <div className="chips-inline">
                {PRODUCT_STYLES.map((s) => (
                  <button
                    type="button"
                    key={s}
                    className={"chip" + (draft.style.includes(s) ? " on" : "")}
                    onClick={() => toggle("style", s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

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

            <Field
              label="Purchase link"
              value={draft.buyUrl}
              onChange={set("buyUrl")}
              placeholder="Where members buy it — the retailer product page"
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
            {busy ? "Saving…" : editingId ? "Update piece" : "Save to catalogue"}
          </button>
          {editingId && (
            <button
              type="button"
              className="admin-inline-btn admin-cancel-edit"
              onClick={startBlank}
            >
              Cancel edit
            </button>
          )}
        </form>
      )}

          {recent.length > 0 && (
            <section className="admin-recent">
              <h2 className="admin-subtitle">Recently added — tap to edit</h2>
              <ul>
                {recent.map((p) => (
                  <li
                    key={p.id}
                    className={"admin-recent-row" + (editingId === p.id ? " on" : "")}
                    onClick={() => loadForEdit(p)}
                    role="button"
                  >
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
