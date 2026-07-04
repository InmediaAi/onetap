"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  message: string | null;
  status: "new" | "contacted" | "closed";
  created_at: string;
}

const STATUSES: Lead["status"][] = ["new", "contacted", "closed"];

/** Admin view of brand partner enquiries (from /partners → partner_leads). */
export default function PartnerLeadsAdmin({ password }: { password: string }) {
  const toast = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partners", { headers: { "x-admin-password": password } });
      if (res.ok) setLeads((await res.json()).leads ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: Lead["status"]) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, status } : l)));
    const res = await fetch("/api/admin/partners", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, id, status }),
    });
    if (!res.ok) toast.error("Couldn’t update status.");
  }

  async function remove(id: string) {
    const res = await fetch("/api/admin/partners", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, id }),
    });
    if (res.ok) {
      setLeads((ls) => ls.filter((l) => l.id !== id));
      toast.success("Lead removed.");
    } else {
      toast.error("Couldn’t remove that lead.");
    }
  }

  return (
    <div className="admin-card">
      <h2 className="admin-subtitle">Partner enquiries ({leads.length})</h2>
      <p className="admin-hint">Brands who submitted the “Partner with us” form.</p>

      {loading ? (
        <p className="admin-hint">Loading…</p>
      ) : leads.length === 0 ? (
        <p className="admin-hint">No enquiries yet.</p>
      ) : (
        <div className="lead-list">
          {leads.map((l) => (
            <div key={l.id} className={"lead-row lead-" + l.status}>
              <div className="lead-main">
                <div className="lead-head">
                  <span className="admin-recent-brand">{l.company}</span>
                  <span className="lead-date">
                    {new Date(l.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="lead-contact">
                  {l.name} ·{" "}
                  <a href={`mailto:${l.email}`} className="partner-mail">
                    {l.email}
                  </a>
                </div>
                {l.message && <p className="lead-msg">{l.message}</p>}
              </div>
              <div className="lead-actions">
                <select
                  className="admin-input lead-status"
                  value={l.status}
                  onChange={(e) => setStatus(l.id, e.target.value as Lead["status"])}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button
                  className="lead-del"
                  type="button"
                  onClick={() => remove(l.id)}
                  aria-label="Delete lead"
                >
                  <Trash2 size={15} strokeWidth={1.6} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
