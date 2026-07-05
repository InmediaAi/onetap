"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";

/** Admin editor for the subscription tiers + top-up config (DB-backed). */

interface PlanDraft {
  id: string;
  name: string;
  tagline: string;
  monthlyPrice: string;
  currency: string;
  videoLimit: string;
  features: string; // one per line in the textarea
  mostPopular: boolean;
  active: boolean;
}

interface ConfigDraft {
  topupUnitPrice: string;
  topupCurrency: string;
  topupEnabled: boolean;
}

interface PlanRow {
  id: string;
  name: string;
  tagline: string | null;
  monthly_price: number | string;
  currency: string;
  video_limit: number;
  features: string[] | null;
  most_popular: boolean;
  active: boolean;
}

function rowToDraft(r: PlanRow): PlanDraft {
  return {
    id: r.id,
    name: r.name,
    tagline: r.tagline ?? "",
    monthlyPrice: String(r.monthly_price ?? 0),
    currency: r.currency || "USD",
    videoLimit: String(r.video_limit ?? 0),
    features: (r.features ?? []).join("\n"),
    mostPopular: Boolean(r.most_popular),
    active: Boolean(r.active),
  };
}

export default function PackagesAdmin({ password }: { password: string }) {
  const toast = useToast();
  const [plans, setPlans] = useState<PlanDraft[]>([]);
  const [config, setConfig] = useState<ConfigDraft | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/plans", {
        headers: { "x-admin-password": password },
      });
      if (!res.ok) return;
      const d = await res.json();
      setPlans((d.plans ?? []).map(rowToDraft));
      if (d.config) {
        setConfig({
          topupUnitPrice: String(d.config.topup_unit_price ?? 2),
          topupCurrency: d.config.topup_currency ?? "USD",
          topupEnabled: Boolean(d.config.topup_enabled),
        });
      }
    } catch {
      /* ignore */
    }
  }, [password]);

  useEffect(() => {
    load();
  }, [load]);

  function setPlan(id: string, patch: Partial<PlanDraft>) {
    setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function savePlan(p: PlanDraft) {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          kind: "plan",
          plan: {
            ...p,
            monthlyPrice: Number(p.monthlyPrice),
            videoLimit: Number(p.videoLimit),
            features: p.features.split("\n").map((f) => f.trim()).filter(Boolean),
          },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus(`Saved “${p.name}”.`);
        toast.success(`Saved “${p.name}”.`);
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

  async function saveConfig() {
    if (!config) return;
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          kind: "config",
          config: { ...config, topupUnitPrice: Number(config.topupUnitPrice) },
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setStatus("Top-up settings saved.");
        toast.success("Top-up settings saved.");
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
        Edit the tiers shown on the pricing page. <strong>Video limits, features,
        the top-up price and the free allowance are enforced by us.</strong> The
        monthly price is display-only - the real charge is set by the matching
        Razorpay plan, so keep them in sync.
      </p>

      {plans.map((p) => (
        <section key={p.id} className="admin-card">
          <h2 className="admin-subtitle" style={{ textTransform: "capitalize" }}>
            {p.id} tier
          </h2>

          <div className="pkg-row">
            <label className="admin-field">
              <span className="admin-label">Name</span>
              <input className="admin-input" value={p.name} onChange={(e) => setPlan(p.id, { name: e.target.value })} />
            </label>
            <label className="admin-field">
              <span className="admin-label">
                {p.id === "free" ? "Free allowance (one-time)" : "Videos / month"}
              </span>
              <input
                className="admin-input"
                type="number"
                value={p.videoLimit}
                onChange={(e) => setPlan(p.id, { videoLimit: e.target.value })}
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">Price / mo (display)</span>
              <input
                className="admin-input"
                type="number"
                value={p.monthlyPrice}
                onChange={(e) => setPlan(p.id, { monthlyPrice: e.target.value })}
              />
            </label>
          </div>

          <label className="admin-field">
            <span className="admin-label">Tagline</span>
            <input className="admin-input" value={p.tagline} onChange={(e) => setPlan(p.id, { tagline: e.target.value })} />
          </label>

          <label className="admin-field">
            <span className="admin-label">Features (one per line)</span>
            <textarea
              className="admin-input"
              rows={3}
              value={p.features}
              onChange={(e) => setPlan(p.id, { features: e.target.value })}
            />
          </label>

          <div className="pkg-toggles">
            <label className="pkg-check">
              <input
                type="checkbox"
                checked={p.mostPopular}
                onChange={(e) => setPlan(p.id, { mostPopular: e.target.checked })}
              />
              Most popular
            </label>
            <label className="pkg-check">
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => setPlan(p.id, { active: e.target.checked })}
              />
              Active (shown on pricing)
            </label>
          </div>

          <button className="btn-line admin-btn" onClick={() => savePlan(p)} disabled={busy}>
            {busy ? "Saving…" : `Save ${p.name}`}
          </button>
        </section>
      ))}

      {config && (
        <section className="admin-card">
          <h2 className="admin-subtitle">Top-ups</h2>
          <div className="pkg-row">
            <label className="admin-field">
              <span className="admin-label">Price per extra video</span>
              <input
                className="admin-input"
                type="number"
                value={config.topupUnitPrice}
                onChange={(e) => setConfig({ ...config, topupUnitPrice: e.target.value })}
              />
            </label>
            <label className="admin-field">
              <span className="admin-label">Currency</span>
              <input
                className="admin-input"
                value={config.topupCurrency}
                onChange={(e) => setConfig({ ...config, topupCurrency: e.target.value })}
              />
            </label>
          </div>
          <label className="pkg-check">
            <input
              type="checkbox"
              checked={config.topupEnabled}
              onChange={(e) => setConfig({ ...config, topupEnabled: e.target.checked })}
            />
            Top-ups enabled
          </label>
          <button className="btn-line admin-btn" onClick={saveConfig} disabled={busy}>
            {busy ? "Saving…" : "Save top-up settings"}
          </button>
        </section>
      )}

      {status && <p className="admin-status">{status}</p>}
    </>
  );
}
