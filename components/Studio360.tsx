"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, ImageIcon, RotateCw } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { CREDIT_COST } from "@/lib/credits";
import { composeReel, InsufficientCreditsError } from "@/lib/generate";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

const STEPS = [
  { n: "01", title: "Upload the piece", body: "A product image, or a screenshot of it." },
  { n: "02", title: "OneTap TryOn", body: "One tap. Nothing to choose." },
  { n: "03", title: "Your video", body: "A turn of you, from every angle." },
];

export default function Studio360() {
  const hydrated = useHydrated();
  const portrait = useAtelier((s) => s.portrait);
  const looks = useAtelier((s) => s.looks);

  const [piece, setPiece] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<{ videoUrl: string; posterUrl?: string } | null>(null);
  const [tab, setTab] = useState<"how" | "history">("how");
  const fileRef = useRef<HTMLInputElement>(null);

  const spins = looks.filter((l) => l.kind === "spin");

  async function pick(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setPiece(await readAsDataURL(file));
    setVideo(null);
    setError(null);
  }

  async function run() {
    if (!piece || !portrait || loading) return;
    setLoading(true);
    setError(null);
    setVideo(null);
    try {
      const res = await composeReel({
        kind: "spin",
        likeness: portrait,
        pieceImage: piece,
        productId: "tryon-360",
      });
      setVideo({ videoUrl: res.videoUrl, posterUrl: res.posterUrl });
    } catch (e) {
      if (!(e instanceof InsufficientCreditsError)) {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="studio">
      {/* ——— left rail ——— */}
      <aside className="studio-rail">
        <p className="label">360° Try-On</p>

        <div className="studio-frame">
          {loading ? (
            <div className="mproc">
              <div className="dotfield" />
              <div className="pl">Composing your turn…</div>
            </div>
          ) : video ? (
            <video className="base" src={video.videoUrl} poster={video.posterUrl} autoPlay loop muted playsInline />
          ) : piece ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="base" src={piece} alt="Your piece" />
          ) : (
            <div className="ph">
              <Plus size={26} strokeWidth={1.2} />
              <div className="pm">No piece yet</div>
            </div>
          )}
        </div>

        <div
          className={"studio-drop" + (drag ? " drag" : "")}
          onClick={() => fileRef.current?.click()}
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
          <ImageIcon size={20} strokeWidth={1.3} />
          <span className="sd-title">{piece ? "Replace the piece" : "Upload the piece"}</span>
          <span className="sd-sub">Drop an image, or choose a file. A product photo or a screenshot.</span>
        </div>

        <div className="studio-likeness">
          <p className="label">Your Likeness</p>
          {hydrated && !portrait ? (
            <p className="sl-note">
              No likeness yet.{" "}
              <Link href="/onboarding" className="sl-link">
                Add yours →
              </Link>
            </p>
          ) : (
            <p className="sl-note">
              Yours. Used only with your consent, never to train without your
              opt-in, removed when you ask.
            </p>
          )}
        </div>

        <button
          className="studio-go"
          onClick={run}
          disabled={!piece || !portrait || loading}
          title={`One tap · ${CREDIT_COST.spin} credits`}
        >
          <RotateCw size={15} strokeWidth={1.5} /> OneTap TryOn
          <span className="go-cr">{CREDIT_COST.spin} cr</span>
        </button>
        {error && <p className="studio-err">{error}</p>}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            void pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </aside>

      {/* ——— right content ——— */}
      <section className="studio-main">
        <div className="studio-tabs">
          <button className={tab === "how" ? "on" : ""} onClick={() => setTab("how")}>
            How it works
          </button>
          <button className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>
            History
          </button>
        </div>

        {tab === "how" ? (
          <>
            <h1 className="studio-h1">Your turn, in one tap.</h1>
            <p className="sec-sub">
              One upload. One tap. A turn of you wearing the piece, seen from
              every angle. Nothing to set.
            </p>
            <div className="studio-steps">
              {STEPS.map((s) => (
                <div className="studio-step" key={s.n}>
                  <span className="ss-n">{s.n}</span>
                  <span className="ss-title">{s.title}</span>
                  <span className="ss-body">{s.body}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="studio-h1">Your turns</h1>
            {hydrated && spins.length === 0 ? (
              <p className="sec-sub">No turns yet — compose your first on the left.</p>
            ) : (
              <div className="studio-history">
                {spins.map((l) => (
                  <Link key={l.id} href={`/look/${l.id}`} className="sh-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {l.posterUrl ? (
                      <img src={l.posterUrl} alt="" />
                    ) : (
                      <video src={l.assetUrl} muted playsInline />
                    )}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
