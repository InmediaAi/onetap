"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

interface Item {
  id: string;
  brand: string;
  name: string;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Campaign deeplink builder. Pick products + campaign/source/medium → generates
 * ready-to-paste /try/<id>?utm_* URLs (one per product). Pure client; no DB.
 */
export default function CampaignLinks({ password }: { password: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [campaign, setCampaign] = useState("");
  const [source, setSource] = useState("email");
  const [medium, setMedium] = useState("carousel");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products", {
        headers: { "x-admin-password": password },
      });
      if (res.ok) {
        const d = await res.json();
        setItems((d.products ?? []).map((p: Item) => ({ id: p.id, brand: p.brand, name: p.name })));
      }
    } catch {
      /* ignore */
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  function linkFor(id: string): string {
    const qs = new URLSearchParams();
    if (campaign.trim()) qs.set("utm_campaign", slug(campaign));
    if (source.trim()) qs.set("utm_source", slug(source));
    if (medium.trim()) qs.set("utm_medium", slug(medium));
    const q = qs.toString();
    return `${base}/try/${id}${q ? `?${q}` : ""}`;
  }

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      /* clipboard unavailable */
    }
  }

  const chosen = items.filter((i) => selected.has(i.id));

  return (
    <div className="admin-card">
      <h2 className="admin-subtitle">Campaign deeplinks</h2>
      <p className="admin-hint">
        Pick the products in your carousel, name the campaign, and copy the links
        into your email / Instagram ad. Each link lands the user on that
        product&rsquo;s try-on (signing up + onboarding first if needed) and tags
        the signup &amp; looks with this campaign.
      </p>

      <div className="admin-fields">
        <label className="admin-field">
          <span className="admin-label">Campaign name</span>
          <input
            className="admin-input"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="Gucci women SS26"
          />
        </label>
        <label className="admin-field">
          <span className="admin-label">Source (utm_source)</span>
          <input className="admin-input" value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label className="admin-field">
          <span className="admin-label">Medium (utm_medium)</span>
          <input className="admin-input" value={medium} onChange={(e) => setMedium(e.target.value)} />
        </label>
      </div>

      <p className="admin-label" style={{ marginTop: "1.25rem" }}>
        Products ({selected.size} selected)
      </p>
      <div className="brand-grid">
        {items.map((p) => (
          <button
            key={p.id}
            className={"brand-tile" + (selected.has(p.id) ? " on" : "")}
            onClick={() => toggle(p.id)}
            type="button"
          >
            {selected.has(p.id) && <span className="brand-check">✓</span>}
            <span className="brand-name">
              {p.brand} — {p.name}
            </span>
          </button>
        ))}
        {items.length === 0 && <p className="admin-hint">No products yet. Add pieces first.</p>}
      </div>

      {chosen.length > 0 && (
        <div className="campaign-links">
          {chosen.map((p) => {
            const link = linkFor(p.id);
            return (
              <div key={p.id} className="campaign-link-row">
                <div className="campaign-link-meta">
                  <span className="admin-recent-brand">{p.brand}</span>
                  <code className="campaign-link-url">{link}</code>
                </div>
                <button className="btn-line admin-btn" type="button" onClick={() => copy(link)}>
                  {copied === link ? (
                    <>
                      <Check size={13} strokeWidth={2} /> Copied
                    </>
                  ) : (
                    <>
                      <Copy size={13} strokeWidth={1.6} /> Copy
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
