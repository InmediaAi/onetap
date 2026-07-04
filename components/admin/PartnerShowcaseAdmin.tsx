"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/admin/Toast";

/**
 * Edit the "See your pieces in action" showcase clips shown on /partners.
 * One public video URL per line. Stored in partner_config (singleton).
 */
export default function PartnerShowcaseAdmin({ password }: { password: string }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/partner-showcase", {
        headers: { "x-admin-password": password },
      });
      if (res.ok) setText(((await res.json()).urls ?? []).join("\n"));
    } catch {
      /* ignore */
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    const urls = text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/admin/partner-showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, urls }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not save.");
      setText((data.urls ?? []).join("\n"));
      toast.success("Showcase clips saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-card">
      <h2 className="admin-subtitle">Showcase clips</h2>
      <p className="admin-hint">
        Public video URLs for the “See your pieces in action” section on{" "}
        <a className="admin-inline-btn" href="/partners" target="_blank" rel="noreferrer">
          /partners
        </a>
        . One URL per line. Empty = the section falls back to catalog imagery.
      </p>
      <textarea
        className="admin-input admin-textarea"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"https://…/clip-1.mp4\nhttps://…/clip-2.mp4"}
      />
      <button className="btn-line admin-btn" type="button" onClick={save} disabled={busy}>
        {busy ? "Saving…" : "Save clips"}
      </button>
    </div>
  );
}
