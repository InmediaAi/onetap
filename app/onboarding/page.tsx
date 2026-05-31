"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ReelsWall from "@/components/onboarding/ReelsWall";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

type Step = "signin" | "upload";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/* ——— Provider marks (monochrome, currentColor) ——— */
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

/* ——— Vector placeholders that show what to upload ——— */
const FaceFigure = () => (
  <svg className="uc-fig" viewBox="0 0 64 72" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="32" cy="26" r="13" />
    <path d="M12 66c0-11 9-18 20-18s20 7 20 18" strokeLinecap="round" />
  </svg>
);
const BodyFigure = () => (
  <svg className="uc-fig" viewBox="0 0 64 80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="32" cy="12" r="7" />
    <path d="M32 19v26" />
    <path d="M32 25 19 37M32 25l13 12" />
    <path d="M32 45 23 74M32 45l9 29" />
  </svg>
);

function UploadCard({
  value,
  onChange,
  label,
  hint,
  figure,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label: string;
  hint: string;
  figure: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  async function pick(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
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
          <span className="uc-hint">{hint}</span>
        </>
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
  const signedIn = useAtelier((s) => s.signedIn);
  const signIn = useAtelier((s) => s.signIn);
  const face = useAtelier((s) => s.face);
  const body = useAtelier((s) => s.body);
  const setIdentity = useAtelier((s) => s.setIdentity);

  const [step, setStep] = useState<Step>("signin");
  const [f, setF] = useState<string | null>(null);
  const [b, setB] = useState<string | null>(null);

  // Resume where the user left off once the persisted store has hydrated.
  useEffect(() => {
    if (!hydrated) return;
    if (signedIn) setStep("upload");
    setF((v) => v ?? face);
    setB((v) => v ?? body);
  }, [hydrated, signedIn, face, body]);

  function doSignIn() {
    signIn();
    setStep("upload");
  }

  function getIn() {
    if (!f || !b) return;
    setIdentity(f, b);
    router.push("/");
  }

  return (
    <main className="ob">
      <ReelsWall />

      <section className="ob-panel">
        <div className="ob-panel-inner">
          <div className="wordmark ob-word">OneTap Atelier</div>

          {step === "signin" ? (
            <div className="ob-step">
              <p className="ob-sub">
                Sign in to begin. Your likeness stays private to you.
              </p>
              <button className="oauth-btn" onClick={doSignIn}>
                <GoogleMark /> Sign in with Google
              </button>
              <button className="oauth-btn" onClick={doSignIn}>
                <AppleMark /> Sign in with Apple
              </button>
              <Link href="/" className="ob-skip">
                Explore first →
              </Link>
            </div>
          ) : (
            <div className="ob-step">
              <p className="ob-sub">
                Two photos — one to recognise your face, one to read your
                full-body shape.
              </p>
              <div className="ob-uploads">
                <UploadCard
                  value={f}
                  onChange={setF}
                  label="Upload Face selfie"
                  hint="Face recognition"
                  figure={<FaceFigure />}
                />
                <UploadCard
                  value={b}
                  onChange={setB}
                  label="Upload Full body image"
                  hint="Shape analysis"
                  figure={<BodyFigure />}
                />
              </div>
              <button className="getin" onClick={getIn} disabled={!f || !b}>
                Get In <span aria-hidden="true">→</span>
              </button>
              <Link href="/" className="ob-skip">
                Skip for now →
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
