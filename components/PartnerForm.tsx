"use client";

import { useState } from "react";
import { apiJson } from "@/lib/api/client";

const CONTACT_EMAIL = "info@onetapatelier.com";

/** Brand partner-enquiry form → POST /api/partners (stored in Supabase). */
export default function PartnerForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await apiJson("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          company,
          message,
          website,
          sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
        errorMessage: "Something went wrong - please try again.",
      });
      setSent(true);
    } catch (e2) {
      // apiJson already showed a toast; keep the inline message for context.
      setErr(e2 instanceof Error ? e2.message : "Something went wrong - please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="partner-form-card">
      <h2 className="partner-h2 partner-form-h2">Get in touch</h2>
      <p className="partner-lede">
        Or email us directly at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="partner-mail">
          {CONTACT_EMAIL}
        </a>
      </p>

      {sent ? (
        <p className="partner-thanks">
          Thank you - we&rsquo;ve received your details and will be in touch shortly.
        </p>
      ) : (
        <form className="partner-form" onSubmit={submit}>
          <div className="partner-form-row">
            <input
              className="partner-input"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="partner-input"
              type="email"
              placeholder="Work email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <input
            className="partner-input"
            placeholder="Company / brand name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />
          <textarea
            className="partner-input partner-textarea"
            placeholder="Tell us about your brand and what you're looking for…"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          {/* Honeypot - hidden from real users; bots that fill it are dropped. */}
          <input
            type="text"
            name="website"
            className="partner-hp"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            aria-hidden="true"
          />
          {err && <p className="studio-err">{err}</p>}
          <button type="submit" className="partner-submit" disabled={busy}>
            {busy ? "Sending…" : "Send message"}
          </button>
        </form>
      )}
    </div>
  );
}
