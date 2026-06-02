"use client";

import { useRef, useState } from "react";
import Header from "@/components/Header";

type Phase = "empty" | "ready" | "working" | "done";
type Tab = "hiw" | "history";

const ORANGE = "#F37021";

export default function TryOn360Page() {
  const [phase, setPhase] = useState<Phase>("empty");
  const [tab, setTab] = useState<Tab>("hiw");
  const [preview, setPreview] = useState<string | null>(null);
  const [stamp, setStamp] = useState("");
  const [playing, setPlaying] = useState(true);
  const [dragover, setDragover] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function loadFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = (e) => {
      setPreview(e.target?.result as string);
      setPhase("ready");
    };
    r.readAsDataURL(file);
  }

  function onAction() {
    if (phase === "done") {
      // Begin again — keep the piece, return to How it works.
      setTab("hiw");
      setPhase("ready");
      return;
    }
    if (phase !== "ready") return;
    setPhase("working");
    setTab("history");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setPhase("done");
      setStamp(
        new Date().toLocaleDateString(undefined, { day: "numeric", month: "long" })
      );
    }, 3200);
  }

  const hint =
    phase === "empty"
      ? "Add a piece to begin."
      : phase === "ready"
      ? "Ready when you are."
      : phase === "working"
      ? ""
      : "Your turn is ready.";

  const actionLabel =
    phase === "working" ? "Preparing" : phase === "done" ? "Begin again" : "OneTap TryOn";

  return (
    <main>
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
        {/* ---------------- Controls ---------------- */}
        <aside className="flex flex-col border-b border-hairline px-9 py-10 lg:min-h-[calc(100vh-160px)] lg:border-b-0 lg:border-r">
          <p className="text-[11px] uppercase tracking-luxe text-muted">360° Try-On</p>

          {/* Cover */}
          <div className="relative mt-5 flex aspect-[4/3] items-center justify-center overflow-hidden border border-hairline">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-muted">
                <svg viewBox="0 0 34 34" className="mb-3 h-8 w-8 stroke-current">
                  <line x1="17" y1="7" x2="17" y2="27" strokeWidth="1" />
                  <line x1="7" y1="17" x2="27" y2="17" strokeWidth="1" />
                </svg>
                <span className="text-[13px]">No piece yet</span>
              </div>
            )}
            {preview && (
              <>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute right-3 top-3 border border-hairline bg-canvas px-3 py-1.5 text-[10px] uppercase tracking-luxe text-ink"
                >
                  Change
                </button>
                <span className="absolute bottom-3 left-3.5 text-[10px] uppercase tracking-luxe text-muted">
                  The piece
                </span>
              </>
            )}
          </div>

          {/* Upload / dropzone */}
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragover(true); }}
            onDragOver={(e) => { e.preventDefault(); setDragover(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragover(false); }}
            onDrop={(e) => { e.preventDefault(); setDragover(false); loadFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            className={`mt-4 cursor-pointer border p-6 text-center transition-colors ${
              dragover ? "border-ink" : "border-hairline"
            }`}
          >
            <div className="mb-4 flex justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline">
                <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-none stroke-muted" strokeWidth="1">
                  <rect x="3" y="5" width="18" height="14" />
                  <circle cx="8.5" cy="10" r="1.5" />
                  <path d="M4 18l5-5 4 4 3-3 4 4" />
                </svg>
              </span>
            </div>
            <div className="text-[15px] text-ink">Upload the piece</div>
            <div className="mt-1 text-[13px] text-muted">
              Drop an image, or choose a file. A product photo or a screenshot.
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => loadFile(e.target.files?.[0])}
          />

          {/* Likeness note */}
          <div className="mt-4 border border-hairline px-6 py-5">
            <p className="mb-2.5 text-[11px] uppercase tracking-luxe text-muted">Your likeness</p>
            <p className="text-[13px] leading-relaxed text-muted">
              Yours. Used only with your consent, never to train without your opt-in,
              removed when you ask.
            </p>
          </div>

          <div className="min-h-6 flex-1" />

          {/* Action */}
          <button
            onClick={onAction}
            disabled={phase === "empty"}
            style={
              phase === "ready" || phase === "working"
                ? { backgroundColor: ORANGE, borderColor: ORANGE, color: "#fff" }
                : undefined
            }
            className={`w-full border px-6 py-5 text-[12px] uppercase tracking-luxe transition ${
              phase === "empty"
                ? "cursor-not-allowed border-hairline text-muted"
                : phase === "done"
                ? "cursor-pointer border-ink text-ink"
                : phase === "working"
                ? "cursor-default"
                : "cursor-pointer hover:opacity-90"
            }`}
          >
            {actionLabel}
          </button>
          <p className="mt-3 min-h-5 text-center text-[13px] text-muted">{hint}</p>
        </aside>

        {/* ---------------- Main ---------------- */}
        <section className="px-6 py-9 md:px-14 md:pb-16">
          {/* Toggle */}
          <div className="mb-11 flex justify-end">
            <div className="inline-flex border border-hairline">
              {(["hiw", "history"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-2.5 text-[11px] uppercase tracking-luxe transition-colors ${
                    tab === t ? "text-ink shadow-[inset_0_-1px_0_var(--ink,#111)]" : "text-muted"
                  }`}
                >
                  {t === "hiw" ? "How it works" : "History"}
                </button>
              ))}
            </div>
          </div>

          {/* How it works */}
          {tab === "hiw" && (
            <div className="max-w-5xl">
              <h1 className="font-display text-5xl font-light leading-[1.08] tracking-tight md:text-[54px]">
                Your turn, in one tap.
              </h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
                One upload. One tap. A turn of you wearing the piece, seen from every
                angle. Nothing to set.
              </p>

              <div className="mt-14 grid grid-cols-1 gap-7 md:grid-cols-3">
                {[
                  {
                    idx: "01", title: "Upload the piece", body: "A product image, or a screenshot of it.",
                    svg: (<><rect x="12" y="16" width="40" height="30" /><circle cx="24" cy="28" r="4" /><path d="M14 44l12-12 9 9 7-7 10 10" /></>),
                  },
                  {
                    idx: "02", title: "OneTap TryOn", body: "One tap. Nothing to choose.",
                    svg: (<><circle cx="32" cy="32" r="16" /><circle cx="32" cy="32" r="4" /></>),
                  },
                  {
                    idx: "03", title: "Your video", body: "A turn of you, from every angle.",
                    svg: (<><path d="M20 24a16 16 0 1 1-3 9" /><path d="M17 23l0 8 8 0" /></>),
                  },
                ].map((s) => (
                  <div key={s.idx} className="flex flex-col border border-hairline">
                    <div className="flex aspect-[16/11] items-center justify-center border-b border-hairline">
                      <svg viewBox="0 0 64 64" className="h-16 w-16 fill-none stroke-muted" strokeWidth="1.1">
                        {s.svg}
                      </svg>
                    </div>
                    <div className="px-6 pb-7 pt-6">
                      <div className="mb-2.5 font-display text-sm text-muted">{s.idx}</div>
                      <h3 className="text-base font-medium tracking-wide text-ink">{s.title}</h3>
                      <p className="mt-1.5 text-sm leading-snug text-muted">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {tab === "history" && (
            <div className="max-w-5xl">
              <h2 className="mb-7 font-display text-3xl font-light tracking-tight md:text-4xl">
                History
              </h2>
              <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden border border-hairline">
                {phase !== "working" && phase !== "done" && (
                  <p className="px-5 text-center text-[15px] text-muted">
                    Nothing here yet. Your turns are kept here.
                  </p>
                )}

                {phase === "working" && (
                  <div className="flex flex-col items-center">
                    <div className="h-[46px] w-[46px] animate-spin rounded-full border border-hairline border-t-ink" />
                    <div className="mt-5 text-[13px] tracking-wide text-muted">
                      Preparing your turn
                    </div>
                    <div className="relative mt-5 h-px w-40 overflow-hidden bg-hairline">
                      <span
                        className="absolute left-[-40%] top-0 h-full w-[40%] bg-ink"
                        style={{ animation: "barslide 1.4s ease-in-out infinite" }}
                      />
                    </div>
                  </div>
                )}

                {phase === "done" && (
                  <div className="flex h-full w-full flex-col items-center justify-center">
                    {preview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt=""
                        className="absolute right-[18px] top-[18px] h-[74px] w-14 border border-hairline object-cover"
                      />
                    )}
                    <div className="flex items-center justify-center [perspective:1100px]">
                      <svg
                        viewBox="0 0 120 170"
                        width="210"
                        height="300"
                        className="fill-none stroke-muted [transform-style:preserve-3d]"
                        strokeWidth="1.25"
                        style={{
                          animation: "rotateY360 12s linear infinite",
                          animationPlayState: playing ? "running" : "paused",
                        }}
                      >
                        <path d="M44 18 C44 8, 76 8, 76 18 L92 34 L82 52 L82 150 L38 150 L38 52 L28 34 Z" />
                        <line x1="60" y1="20" x2="60" y2="150" />
                        <path d="M44 18 L38 52" />
                        <path d="M76 18 L82 52" />
                        <line x1="38" y1="92" x2="82" y2="92" />
                      </svg>
                    </div>
                    <div className="absolute bottom-0 left-0 flex w-full items-center justify-between border-t border-hairline px-6 py-4">
                      <span className="text-xs tracking-wide text-muted">
                        360° turn · 12 second loop · <em className="font-display italic">{stamp}</em>
                      </span>
                      <button
                        onClick={() => setPlaying((p) => !p)}
                        className="flex items-center gap-2 text-[11px] uppercase tracking-luxe text-ink"
                      >
                        <svg viewBox="0 0 12 12" className="h-3 w-3 fill-ink">
                          {playing ? (
                            <>
                              <rect x="2" y="2" width="3" height="8" />
                              <rect x="7" y="2" width="3" height="8" />
                            </>
                          ) : (
                            <polygon points="3,2 10,6 3,10" />
                          )}
                        </svg>
                        {playing ? "Pause" : "Play"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="border-t border-hairline">
        <div className="mx-auto flex h-20 max-w-editorial items-center justify-between px-6 text-xs tracking-wide text-muted md:px-10">
          <span className="font-display text-base tracking-[0.2em]">
            ONETAP <span className="italic">Atelier</span>
          </span>
          <span>Membership, $100 a month. Your likeness is protected, always.</span>
        </div>
      </footer>
    </main>
  );
}
