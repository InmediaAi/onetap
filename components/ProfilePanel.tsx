"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { BRANDS } from "@/lib/data/brands";
import {
  STYLES,
  CATEGORIES,
  GOALS,
  MOODS,
  SETTINGS,
  HEIGHTS,
} from "@/lib/data/vocab";
import { startTopup } from "@/lib/billing/checkout";
import { validateImageFile, IMAGE_GUIDELINE } from "@/lib/image/validate";
import { uploadIdentity, signOut, type IdentityKind } from "@/lib/auth/client";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const PHOTOS: { kind: IdentityKind; label: string; hint?: string }[] = [
  { kind: "body", label: "Full length", hint: "Powers try-on" },
  { kind: "selfie", label: "Face selfie" },
  { kind: "left", label: "Left side", hint: "Left look" },
  { kind: "right", label: "Right side", hint: "Right look" },
  { kind: "back", label: "Back", hint: "Optional" },
];

export default function ProfilePanel() {
  const hydrated = useHydrated();
  const email = useAtelier((s) => s.email);
  const username = useAtelier((s) => s.username);
  const brands = useAtelier((s) => s.brands);
  const usage = useAtelier((s) => s.usage);
  const store = useAtelier();
  const setIdentity = useAtelier((s) => s.setIdentity);
  const setBrands = useAtelier((s) => s.setBrands);
  const applyProfile = useAtelier((s) => s.applyProfile);
  const resetSession = useAtelier((s) => s.resetSession);
  const modelUrl = useAtelier((s) => s.modelUrl);
  const setModelUrl = useAtelier((s) => s.setModelUrl);

  const [name, setName] = useState(username ?? "");
  const [picked, setPicked] = useState<string[]>(brands);
  const [height, setHeight] = useState<number | null>(store.heightInches);
  const [style, setStyle] = useState<string[]>(store.style);
  const [categories, setCategories] = useState<string[]>(store.categories);
  const [goals, setGoals] = useState<string[]>(store.goals);
  const [mood, setMood] = useState<string[]>(store.sceneMood);
  const [setting, setSetting] = useState<string[]>(store.sceneSetting);
  // Local previews for the four photos (initialised from the hydrated store).
  const [imgs, setImgs] = useState<Record<IdentityKind, string | null>>({
    body: store.body,
    selfie: store.face,
    left: store.left,
    right: store.right,
    back: store.back,
  });

  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [modelBusy, setModelBusy] = useState(false);
  const [modelMsg, setModelMsg] = useState<string | null>(null);
  const [topupBusy, setTopupBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // How many angles are on file — gates the composite generation.
  const photoCount = [imgs.body, imgs.selfie, imgs.left, imgs.right, imgs.back].filter(
    Boolean,
  ).length;
  const refs = {
    body: useRef<HTMLInputElement>(null),
    selfie: useRef<HTMLInputElement>(null),
    left: useRef<HTMLInputElement>(null),
    right: useRef<HTMLInputElement>(null),
    back: useRef<HTMLInputElement>(null),
  };

  if (hydrated && !email) {
    return (
      <div className="admin-card admin-gate profile-gate">
        <p className="admin-hint">You’re not signed in.</p>
        <Link href="/onboarding" className="btn-line admin-btn">
          Sign in
        </Link>
      </div>
    );
  }

  async function replaceImage(kind: IdentityKind, file?: File) {
    if (!file) return;
    const check = await validateImageFile(file);
    if (!check.ok) {
      setStatus(check.error ?? "That image can’t be used.");
      return;
    }
    const dataUrl = await readAsDataURL(file);
    setImgs((m) => ({ ...m, [kind]: dataUrl }));
    // Face/body drive the try-on likeness in memory.
    if (kind === "selfie") setIdentity(dataUrl, store.body);
    else if (kind === "body") setIdentity(store.face, dataUrl);
    setStatus(null);
    try {
      const path = await uploadIdentity(kind, dataUrl);
      if (!path) return; // Supabase unconfigured — image kept in memory only
      const key = {
        selfie: "selfiePath",
        body: "bodyPath",
        left: "leftPath",
        right: "rightPath",
        back: "backPath",
      }[kind];
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: path }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Could not save the photo.");
      }
      setStatus("Photo saved.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not save the photo.");
    }
  }

  async function generateModel() {
    setModelBusy(true);
    setModelMsg(null);
    try {
      const res = await fetch("/api/profile/composite", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not generate your model.");
      if (data.modelUrl) setModelUrl(data.modelUrl);
      setModelMsg("Your model is ready.");
    } catch (e) {
      setModelMsg(e instanceof Error ? e.message : "Could not generate your model.");
    } finally {
      setModelBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    setBrands(picked);
    applyProfile({
      username: name || null,
      heightInches: height,
      style,
      categories,
      goals,
      sceneMood: mood,
      sceneSetting: setting,
    });
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brands: picked,
        username: name || undefined,
        heightInches: height,
        style,
        categories,
        goals,
        sceneMood: mood,
        sceneSetting: setting,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setStatus(res.ok ? "Saved." : data?.error || "Could not save.");
  }

  async function cancelSubscription() {
    setBusy(true);
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setConfirmCancel(false);
    if (res.ok) {
      track(EVENTS.SUBSCRIPTION_CANCELLED, { plan: usage.planId });
      await store.refreshProfile(); // reflect the scheduled-cancel state immediately
      setStatus("Your membership will end at the period close — you keep access until then.");
    } else {
      setStatus(data?.error || "Could not cancel.");
    }
    setBusy(false);
  }

  async function doSignOut() {
    await signOut();
    resetSession();
    window.location.href = "/";
  }

  const active = usage.status === "active" && usage.planId;
  const monthlyLeft = Math.max(0, usage.videoLimit - usage.videosUsed);
  const remaining = active ? monthlyLeft + usage.topupBalance : usage.freeTrialRemaining;

  // "Your model" widget hidden for now — the feature/handlers stay intact, just
  // not surfaced. Flip to true to bring it back.
  const SHOW_MODEL = false;

  async function buyTopups() {
    setTopupBusy(true);
    try {
      await startTopup(5);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setTopupBusy(false);
    }
  }

  return (
    <div className="profile-grid">
      {/* Identity */}
      <section className="admin-card">
        <h2 className="admin-subtitle">About you</h2>
        <label className="admin-label">Name</label>
        <input
          className="admin-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="As you’d like to be addressed"
        />
        <label className="admin-label" style={{ marginTop: "1rem" }}>
          Email
        </label>
        <input className="admin-input" value={email ?? ""} disabled />

        <label className="admin-label" style={{ marginTop: "1rem" }}>
          Height
        </label>
        <select
          className="admin-input"
          value={height ?? ""}
          onChange={(e) => setHeight(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Prefer not to say</option>
          {HEIGHTS.map((h) => (
            <option key={h.inches} value={h.inches}>{h.label}</option>
          ))}
        </select>
      </section>

      {/* Photographs */}
      <section className="admin-card">
        <h2 className="admin-subtitle">Photographs</h2>
        <p className="admin-hint">
          Standing, front-facing, good light, fitted pieces. These power try-on
          quality and 360° realism.
        </p>
        <p className="admin-hint">{IMAGE_GUIDELINE}</p>
        <div className="profile-imgs">
          {PHOTOS.map(({ kind, label, hint }) => (
            <div key={kind} className="profile-img">
              <span className="admin-label">
                {label}
                {hint && <em className="profile-img-hint"> · {hint}</em>}
              </span>
              <div className="profile-img-box" onClick={() => refs[kind].current?.click()}>
                {imgs[kind] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imgs[kind] as string} alt={label} />
                ) : (
                  <span className="admin-preview-empty">+ Add</span>
                )}
              </div>
              <input
                ref={refs[kind]}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  void replaceImage(kind, e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* System-derived model sheet (read-only) — hidden for now (SHOW_MODEL). */}
      {SHOW_MODEL && (
        <section className="admin-card">
          <h2 className="admin-subtitle">Your model</h2>
          <p className="admin-hint">
            One multi-angle likeness composed by OneTap from your photos. We create
            this for you — it can’t be uploaded or replaced.
          </p>
          <div className="model-sheet">
            <div className="model-frame">
              {modelUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={modelUrl} alt="Your composed model" />
              ) : modelBusy ? (
                <span className="admin-preview-empty">Composing…</span>
              ) : (
                <span className="admin-preview-empty">Not yet generated</span>
              )}
            </div>
            <div className="model-side">
              <button
                className="btn-line admin-btn"
                onClick={generateModel}
                disabled={modelBusy || photoCount < 2}
              >
                {modelBusy ? "Composing…" : modelUrl ? "Regenerate" : "Generate my model"}
              </button>
              {photoCount < 2 && (
                <p className="admin-hint">Add at least two photos above first.</p>
              )}
              {modelMsg && <p className="admin-status">{modelMsg}</p>}
            </div>
          </div>
        </section>
      )}

      {/* Taste */}
      <section className="admin-card">
        <h2 className="admin-subtitle">Your taste</h2>
        <Multi label="Brands she buys" options={BRANDS} value={picked} onChange={setPicked} />
        <Multi label="Style" options={STYLES} value={style} onChange={setStyle} />
        <Multi label="Categories you reach for" options={CATEGORIES} value={categories} onChange={setCategories} />
        <Multi label="What brings you here" options={GOALS} value={goals} onChange={setGoals} />
      </section>

      {/* Atelier Scenes preferences */}
      <section className="admin-card">
        <h2 className="admin-subtitle">Atelier Scenes</h2>
        <Multi label="Mood" options={MOODS} value={mood} onChange={setMood} />
        <Multi label="Setting" options={SETTINGS} value={setting} onChange={setSetting} />
        <button className="btn-line admin-btn" onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </button>
        {status && <p className="admin-status">{status}</p>}
      </section>

      {/* Subscription */}
      <section className="admin-card">
        <h2 className="admin-subtitle">Subscription</h2>
        {active ? (
          <>
            <p className="admin-hint">
              <strong>{usage.planName ?? "Active"}</strong> · {monthlyLeft} of{" "}
              {usage.videoLimit} try-ons left this month
              {usage.topupBalance > 0 ? ` · +${usage.topupBalance} top-up in reserve` : ""}
              {usage.currentPeriodEnd
                ? usage.cancelAtPeriodEnd
                  ? ` · ends ${new Date(usage.currentPeriodEnd).toLocaleDateString()}`
                  : ` · renews ${new Date(usage.currentPeriodEnd).toLocaleDateString()}`
                : ""}
              .
            </p>
            {usage.cancelAtPeriodEnd ? (
              <p className="admin-hint">
                Your membership won’t renew — you keep access until it ends.
              </p>
            ) : (
              <>
                {usage.topupEnabled && (
                  <button className="btn-line admin-btn" onClick={buyTopups} disabled={topupBusy}>
                    {topupBusy
                      ? "Opening…"
                      : `Buy 5 top-ups · $${(usage.topupUnitPrice * 5).toFixed(2)}`}
                  </button>
                )}
                {confirmCancel ? (
                  <div className="admin-confirm">
                    <p className="admin-hint">
                      Cancel at the period close
                      {usage.currentPeriodEnd
                        ? ` (${new Date(usage.currentPeriodEnd).toLocaleDateString()})`
                        : ""}
                      ? You keep access until then.
                    </p>
                    <div className="admin-confirm-row">
                      <button
                        className="btn-line admin-btn"
                        onClick={() => setConfirmCancel(false)}
                        disabled={busy}
                      >
                        Keep plan
                      </button>
                      <button
                        className="btn-line admin-btn"
                        onClick={cancelSubscription}
                        disabled={busy}
                      >
                        {busy ? "Cancelling…" : "Confirm cancel"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn-line admin-btn"
                    onClick={() => setConfirmCancel(true)}
                    disabled={busy}
                  >
                    Cancel subscription
                  </button>
                )}
              </>
            )}
          </>
        ) : (
          <>
            <p className="admin-hint">
              No active plan · {remaining} free try-on{remaining === 1 ? "" : "s"} left.
              A try-on is a 360° spin or a film.
            </p>
            <Link href="/pricing" className="btn-line admin-btn">
              View plans
            </Link>
          </>
        )}
      </section>

      <button className="profile-signout" onClick={doSignOut}>
        Sign out
      </button>
    </div>
  );
}

function Multi({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="profile-multi">
      <span className="admin-label">{label}</span>
      <div className="chips-inline">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            className={"chip" + (value.includes(o) ? " on" : "")}
            onClick={() =>
              onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])
            }
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
