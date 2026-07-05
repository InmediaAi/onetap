"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import ReelsWall from "@/components/onboarding/ReelsWall";
import PoseFigure from "@/components/PoseFigure";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { BRANDS } from "@/lib/data/brands";
import { track } from "@/lib/analytics";
import { EVENTS } from "@/lib/analytics/events";
import { signInWithProvider, uploadIdentity, type IdentityKind } from "@/lib/auth/client";
import { validateImageFile, IMAGE_GUIDELINE } from "@/lib/image/validate";

type Step = "upload" | "brands";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* --- Provider marks (monochrome, currentColor) --- */
const GoogleMark = () => (
  <svg viewBox="0 0 24 24">
    <path d="M12 11v2.4h3.97c-.16 1.03-1.2 3.02-3.97 3.02-2.39 0-4.34-1.98-4.34-4.42S9.61 7.58 12 7.58c1.36 0 2.27.58 2.79 1.08l1.9-1.83C15.47 5.69 13.89 5 12 5c-3.87 0-7 3.13-7 7s3.13 7 7 7c4.04 0 6.72-2.84 6.72-6.84 0-.46-.05-.81-.11-1.16H12z" />
  </svg>
);
const AppleMark = () => (
  <svg viewBox="0 0 24 24">
    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.93 2.71-3.4 2.71-1.6.02-2.12-.94-3.92-.94-1.61 0-2.32.93-3.81.94-1.6.06-2.7-1.46-3.65-2.79-1.93-2.78-3.4-7.86-1.42-11.29.97-1.69 2.71-2.78 4.61-2.78 1.5 0 2.91 1.01 3.83 1.01.91 0 2.63-1.25 4.43-1.06.71.03 2.71.28 4 2.13-.1.07-2.38 1.39-2.35 4.15.03 3.3 2.91 4.39 2.94 4.4z" />
  </svg>
);


function UploadCard({
  value,
  onChange,
  label,
  hint,
  figure,
  kind,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label: string;
  hint: string;
  figure: React.ReactNode;
  kind: IdentityKind;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function pick(file?: File) {
    if (!file) return;
    setErr(null);
    setChecking(true);
    const check = await validateImageFile(file, kind);
    setChecking(false);
    if (!check.ok) {
      setErr(check.error ?? "That image can’t be used.");
      return;
    }
    onChange(await readAsDataURL(file));
  }

  return (
    <div
      className={"upload-card" + (value ? " has" : "") + (drag ? " drag" : "")}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void pick(e.dataTransfer.files?.[0]);
      }}
    >
      {value ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="uc-prev" src={value} alt={label} />
          <button
            className="uc-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            aria-label="Remove"
          >
            ✕
          </button>
        </>
      ) : (
        <>
          {figure}
          <span className="uc-label">+ {label}</span>
          <span className={"uc-hint" + (err && !checking ? " err" : "")}>
            {checking ? "Checking photo…" : (err ?? hint)}
          </span>
        </>
      )}
      {value && (checking || err) && (
        <span className={"uc-warn" + (err && !checking ? " bad" : "")}>
          {checking ? "Checking photo…" : err}
        </span>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  // Auth truth comes from the loaded profile (SessionLoader → /api/me).
  const email = useAtelier((s) => s.email);
  const profileLoaded = useAtelier((s) => s.profileLoaded);
  const onboarded = useAtelier((s) => s.onboarded);
  const face = useAtelier((s) => s.face);
  const body = useAtelier((s) => s.body);
  const setIdentity = useAtelier((s) => s.setIdentity);
  const brands = useAtelier((s) => s.brands);
  const setBrands = useAtelier((s) => s.setBrands);
  const refreshProfile = useAtelier((s) => s.refreshProfile);
  const signedIn = Boolean(email);

  const [step, setStep] = useState<Step>("upload");
  const [f, setF] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [customBrands, setCustomBrands] = useState<string[]>([]);
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Where to resume after onboarding (e.g. a campaign deeplink). Read from the
  // URL directly to avoid a useSearchParams Suspense boundary.
  const [nextDest, setNextDest] = useState("/");

  // Onboarding funnel start (once per mount); capture resume target.
  useEffect(() => {
    track(EVENTS.ONBOARDING_STARTED);
    const n = new URLSearchParams(window.location.search).get("next");
    if (n && n.startsWith("/")) setNextDest(n);
  }, []);

  function handleFace(v: string | null) {
    setF(v);
    if (v) track(EVENTS.FACE_UPLOADED);
  }
  function handleBody(v: string | null) {
    setB(v);
    if (v) track(EVENTS.BODY_UPLOADED);
  }

  // Returning (already onboarded) users shouldn't see onboarding again.
  useEffect(() => {
    if (profileLoaded && signedIn && onboarded) router.replace(nextDest);
  }, [profileLoaded, signedIn, onboarded, router, nextDest]);

  // Pre-fill from any previously saved identity/brands once the profile loads.
  // The sign-in vs upload vs brands decision is made in render from auth truth,
  // so an already-authenticated first-time user never flashes the sign-in step.
  useEffect(() => {
    if (!profileLoaded) return;
    setF((v) => v ?? face);
    setB((v) => v ?? body);
    setPicked((v) => (v.length ? v : brands));
  }, [profileLoaded, face, body, brands]);

  async function oauth(provider: "google" | "apple") {
    setAuthErr(null);
    try {
      await signInWithProvider(provider, "/onboarding");
    } catch (e) {
      setAuthErr(e instanceof Error ? e.message : "Sign-in failed");
    }
  }

  async function continueToBrands() {
    if (!f || !b) return;
    setSaving(true);
    setSaveErr(null);
    setIdentity(f, b); // in-memory likeness for immediate generation
    try {
      // Upload both to Supabase Storage (private avatars bucket), then persist
      // the storage paths to the profile. Throws (surfaced below) if either fails.
      const [selfiePath, bodyPath] = await Promise.all([
        uploadIdentity("selfie", f),
        uploadIdentity("body", b),
      ]);
      if (selfiePath || bodyPath) {
        const res = await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selfiePath, bodyPath }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          throw new Error(d?.error || "Could not save your photos.");
        }
      }
      setStep("brands");
    } catch (e) {
      // Stay on the upload step so the user can retry - don't lose their photos.
      setSaveErr(e instanceof Error ? e.message : "Could not save your photos.");
    } finally {
      setSaving(false);
    }
  }

  function toggleBrand(name: string) {
    setPicked((p) =>
      p.includes(name) ? p.filter((x) => x !== name) : [...p, name],
    );
  }

  // The selectable list = the curated houses plus any the user added (or had
  // saved previously). New /api/profile accepts free-form brand strings.
  const allBrands = useMemo(() => {
    const base = new Set(BRANDS.map((b) => b.toLowerCase()));
    const extras: string[] = [];
    const seen = new Set<string>();
    for (const b of [...customBrands, ...picked]) {
      const k = b.toLowerCase();
      if (!base.has(k) && !seen.has(k)) {
        seen.add(k);
        extras.push(b);
      }
    }
    return [...BRANDS, ...extras];
  }, [customBrands, picked]);

  const bq = brandQuery.trim();
  const bqLower = bq.toLowerCase();
  const filteredBrands = bqLower
    ? allBrands.filter((b) => b.toLowerCase().includes(bqLower))
    : allBrands;
  const canAddBrand = bq.length > 0 && !allBrands.some((b) => b.toLowerCase() === bqLower);

  function addCustomBrand() {
    const name = brandQuery.trim();
    if (!name) return;
    const existing = allBrands.find((b) => b.toLowerCase() === name.toLowerCase());
    const finalName = existing ?? name;
    if (!existing) setCustomBrands((c) => [...c, name]);
    setPicked((p) => (p.includes(finalName) ? p : [...p, finalName]));
    setBrandQuery("");
  }

  async function finish() {
    setSaving(true);
    setSaveErr(null);
    setBrands(picked);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brands: picked, onboarded: true }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Could not save your brands.");
      }
      await refreshProfile(); // pick up onboarded=true so /profile reflects it
      track(EVENTS.ONBOARDING_COMPLETED, { brands: picked.length });
      router.push(nextDest); // resume to the campaign deeplink (or home)
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Could not save your brands.");
      setSaving(false);
    }
  }

  return (
    <main className="ob">
      <ReelsWall />

      <section className="ob-panel">
        <div className="ob-panel-inner">
          <div className="wordmark ob-word">OneTap Atelier</div>

          {!hydrated || !profileLoaded || (signedIn && onboarded) ? (
            // Loading / redirecting - never flash the sign-in step for a user
            // who arrived already authenticated from the OAuth callback.
            <div className="ob-step">
              <p className="ob-sub">One moment…</p>
            </div>
          ) : !signedIn ? (
            <div className="ob-step">
              <p className="ob-sub">
                The world’s first video curator. 100+ luxury houses, edited to
                your taste.
              </p>
              <button className="oauth-btn" onClick={() => oauth("google")}>
                <GoogleMark /> Sign in with Google
              </button>
              <button className="oauth-btn" onClick={() => oauth("apple")}>
                <AppleMark /> Sign in with Apple
              </button>
              {authErr && <p className="studio-err">{authErr}</p>}
            </div>
          ) : step === "upload" ? (
            <div className="ob-step">
              <p className="ob-sub">
                Two photos - one to recognise your face, one to read your
                full-body shape.
              </p>
              <p className="ob-guide">{IMAGE_GUIDELINE}</p>
              <div className="ob-uploads">
                <UploadCard
                  value={f}
                  onChange={handleFace}
                  kind="selfie"
                  label="Upload Face selfie"
                  hint="Face recognition"
                  figure={<PoseFigure kind="selfie" />}
                />
                <UploadCard
                  value={b}
                  onChange={handleBody}
                  kind="body"
                  label="Upload Full body image"
                  hint="Shape analysis"
                  figure={<PoseFigure kind="body" />}
                />
              </div>
              <button
                className="getin"
                onClick={continueToBrands}
                disabled={!f || !b || saving}
              >
                {saving ? "Saving…" : "Continue"} <span aria-hidden="true">→</span>
              </button>
              {saveErr && <p className="studio-err">{saveErr}</p>}
            </div>
          ) : (
            <div className="ob-step">
              <p className="ob-sub">
                Choose at least five houses you love - your edit will lead with them.
                <span className="ob-count"> {picked.length}/5 selected</span>
              </p>
              <div className="brand-search ob-brand-search">
                <Search size={14} strokeWidth={1.6} />
                <input
                  value={brandQuery}
                  onChange={(e) => setBrandQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && canAddBrand) {
                      e.preventDefault();
                      addCustomBrand();
                    }
                  }}
                  placeholder="Search houses, or add your own"
                  aria-label="Search or add a brand"
                />
              </div>
              <div className="brand-grid">
                {canAddBrand && (
                  <button type="button" className="brand-tile brand-add" onClick={addCustomBrand}>
                    <span className="brand-name">+ Add “{bq}”</span>
                  </button>
                )}
                {filteredBrands.map((name) => (
                  <button
                    key={name}
                    className={"brand-tile" + (picked.includes(name) ? " on" : "")}
                    onClick={() => toggleBrand(name)}
                  >
                    {picked.includes(name) && (
                      <span className="brand-check" aria-hidden="true">
                        ✓
                      </span>
                    )}
                    <span className="brand-name">{name}</span>
                  </button>
                ))}
                {filteredBrands.length === 0 && !canAddBrand && (
                  <p className="refine-none">No houses match.</p>
                )}
              </div>
              <button
                className="getin"
                onClick={finish}
                disabled={picked.length < 5 || saving}
              >
                {saving ? "Saving…" : "Get In"} <span aria-hidden="true">→</span>
              </button>
              {saveErr && <p className="studio-err">{saveErr}</p>}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
