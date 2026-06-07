"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, RotateCw, Download, ArrowLeft } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { composeReel, VideoLimitError } from "@/lib/generate";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function Studio360() {
  const hydrated = useHydrated();
  const portrait = useAtelier((s) => s.portrait);
  const looks = useAtelier((s) => s.looks);

  const [piece, setPiece] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [video, setVideo] = useState<{ videoUrl: string; posterUrl?: string } | null>(null);
  const [tab, setTab] = useState<"create" | "history">("create");
  const fileRef = useRef<HTMLInputElement>(null);

  const spins = looks.filter((l) => l.kind === "spin");
  const canUpload = !loading && !video; // the frame is the dropzone only before a result

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
      if (!(e instanceof VideoLimitError)) {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    } finally {
      setLoading(false);
    }
  }

  function download() {
    if (!video) return;
    const a = document.createElement("a");
    a.href = video.videoUrl;
    a.download = "onetap-360";
    document.body.appendChild(a);
    a.click();
    a.remove();
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

          {/* the single combined frame: dropzone · piece · composing · result */}
          <div
            className={
              "studio-stage" +
              (canUpload ? " uploadable" : "") +
              (drag ? " drag" : "") +
              (piece && canUpload ? " has" : "")
            }
            onClick={canUpload ? () => fileRef.current?.click() : undefined}
            onDragOver={
              canUpload
                ? (e) => {
                    e.preventDefault();
                    setDrag(true);
                  }
                : undefined
            }
            onDragLeave={canUpload ? () => setDrag(false) : undefined}
            onDrop={
              canUpload
                ? (e) => {
                    e.preventDefault();
                    setDrag(false);
                    void pick(e.dataTransfer.files?.[0]);
                  }
                : undefined
            }
          >
            {loading ? (
              <div className="mproc">
                <div className="dotfield" />
                <div className="pl">Composing your turn…</div>
              </div>
            ) : video ? (
              <video className="base" src={video.videoUrl} poster={video.posterUrl} autoPlay loop muted playsInline />
            ) : piece ? (
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
              </div>
            )}
          </div>

          {/* likeness note */}
          <p className="solo-likeness">
            {hydrated && !portrait ? (
              <>
                No likeness yet.{" "}
                <Link href="/onboarding" className="sl-link">
                  Add yours →
                </Link>
              </>
            ) : (
              <>Your likeness — private to you, used only with your consent.</>
            )}
          </p>

          {/* action */}
          {video ? (
            <div className="studio-result-actions">
              <button className="copy-btn" onClick={() => setVideo(null)}>
                <ArrowLeft size={13} strokeWidth={1.6} /> Compose another
              </button>
              <button className="copy-btn" onClick={download}>
                <Download size={13} strokeWidth={1.5} /> Download
              </button>
            </div>
          ) : (
            <button
              className="studio-go"
              onClick={run}
              disabled={!piece || !portrait || loading}
              title="One tap · 1 video"
            >
              <RotateCw size={15} strokeWidth={1.5} /> OneTap TryOn
              <span className="go-cr">1 video</span>
            </button>
          )}
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
    </div>
  );
}
