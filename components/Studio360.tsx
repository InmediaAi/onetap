"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, RotateCw } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { composeReel, VideoLimitError, SignInRequiredError } from "@/lib/generate";
import { ensureCanGenerateVideo } from "@/lib/billing/gate";
import { validateImageFile, IMAGE_GUIDELINE } from "@/lib/image/validate";
import ResultModal from "@/components/ResultModal";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

interface Result {
  image?: string;
  videoUrl: string;
  posterUrl?: string;
  lookId: string;
}

export default function Studio360() {
  const hydrated = useHydrated();
  // Full-length photo is the primary try-on likeness (a face-only selfie breaks
  // the full-body result), so gate on `body`, not the face-or-body `portrait`.
  const body = useAtelier((s) => s.body);
  const looks = useAtelier((s) => s.looks);

  const [piece, setPiece] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"create" | "history">("create");
  const fileRef = useRef<HTMLInputElement>(null);

  const spins = looks.filter((l) => l.kind === "spin");

  async function pick(file?: File) {
    if (!file) return;
    const check = await validateImageFile(file);
    if (!check.ok) {
      setError(check.error ?? "That image can’t be used.");
      return;
    }
    setPiece(await readAsDataURL(file));
    setResult(null);
    setError(null);
  }

  async function run() {
    if (!piece || !body || loading) return;
    if (!(await ensureCanGenerateVideo())) return; // sign-in / quota gate
    setLoading(true);
    setError(null);
    setResult(null);
    setModalOpen(true);
    try {
      const res = await composeReel({
        kind: "spin",
        likeness: body,
        pieceImage: piece,
        productId: "tryon-360",
      });
      setResult({ image: res.imageUrl, videoUrl: res.videoUrl, posterUrl: res.posterUrl, lookId: res.lookId });
    } catch (e) {
      if (!(e instanceof VideoLimitError) && !(e instanceof SignInRequiredError)) {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="studio-solo">
      {/* tabs — top right */}
      <div className="studio-tabs">
        <button className={tab === "create" ? "on" : ""} onClick={() => setTab("create")}>
          360° Try-On
        </button>
        <button className={tab === "history" ? "on" : ""} onClick={() => setTab("history")}>
          History
        </button>
      </div>

      {tab === "create" ? (
        <div className="solo-col">
          <p className="solo-sub">
            One upload. One tap. A turn of you wearing the piece, from every angle.
          </p>

          <div
            className={"studio-stage uploadable" + (drag ? " drag" : "") + (piece ? " has" : "")}
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
            {piece ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="base" src={piece} alt="Your piece" />
                <span className="stage-replace">Replace</span>
              </>
            ) : (
              <div className="stage-empty">
                <span className="stage-plus">
                  <Plus size={26} strokeWidth={1.3} />
                </span>
                <span className="stage-title">Upload the piece</span>
                <span className="stage-sub">
                  Drop an image, or choose a file. A product photo or a screenshot.
                </span>
                <span className="stage-guide">{IMAGE_GUIDELINE}</span>
              </div>
            )}
          </div>

          {/* likeness note */}
          <p className="solo-likeness">
            {hydrated && !body ? (
              <>
                No full-length photo yet.{" "}
                <Link href="/onboarding" className="sl-link">
                  Add yours →
                </Link>
              </>
            ) : (
              <>Your likeness — private to you, used only with your consent.</>
            )}
          </p>

          {/* action */}
          <button
            className="studio-go"
            onClick={run}
            disabled={!piece || !body || loading}
            title="One tap · 1 video"
          >
            <RotateCw size={15} strokeWidth={1.5} /> Try-On
            <span className="go-cr">1 video</span>
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
        </div>
      ) : (
        <div className="solo-col">
          {hydrated && spins.length === 0 ? (
            <p className="solo-sub">No turns yet — compose your first under 360° Try-On.</p>
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
        </div>
      )}

      <ResultModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setResult(null);
        }}
        brand="360° Try-On"
        image={result?.image}
        video={result?.videoUrl}
        poster={result?.posterUrl}
        phase={loading ? "spin" : null}
        turnLabel="360°"
        turnSub="The Turn"
        videoLookId={result?.lookId}
        productId="tryon-360"
      />
    </div>
  );
}
