"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Upload, LayoutGrid, Check, Wand2 } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { composeReel, VideoLimitError, SignInRequiredError } from "@/lib/generate";
import { ensureCanGenerateVideo } from "@/lib/billing/gate";
import {
  FILM_FORMATS,
  getFilmFormat,
  buildFilmPrompt,
  type FilmOpts,
} from "@/lib/film/formats";
import { type Product } from "@/lib/data/products";
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

type Tab = "upload" | "curated";

export default function CreatorBuilder({ products }: { products: Product[] }) {
  const hydrated = useHydrated();
  const portrait = useAtelier((s) => s.portrait);

  const [format, setFormat] = useState<string | null>(null);
  const [opts, setOpts] = useState<FilmOpts>({});
  const [tab, setTab] = useState<Tab>("upload");
  const [upload, setUpload] = useState<string | null>(null);
  const [curated, setCurated] = useState<Product | null>(null);
  const [free, setFree] = useState("");
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [film, setFilm] = useState<{
    image?: string;
    videoUrl: string;
    posterUrl?: string;
    lookId: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Both tabs give a real garment image → compose the on-you try-on first.
  const hasGarment = tab === "upload" ? Boolean(upload) : Boolean(curated);
  const pieceImage = tab === "upload" ? upload ?? undefined : curated?.imageUrl;
  const garmentDesc =
    tab === "upload"
      ? "the uploaded garment (reference image provided)"
      : curated
        ? `${curated.brand} ${curated.name}`
        : "the selected garment";
  const ready = Boolean(format) && hasGarment && Boolean(portrait) && !loading;

  function toggleOpt(fieldId: string, val: string, multi: boolean) {
    setOpts((cur) => {
      const v = cur[fieldId];
      let next: string | string[] | null;
      if (multi) {
        const arr = Array.isArray(v) ? v : [];
        next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
      } else {
        next = v === val ? null : val;
      }
      return { ...cur, [fieldId]: next };
    });
  }
  const isOn = (fieldId: string, val: string) => {
    const v = opts[fieldId];
    return Array.isArray(v) ? v.includes(val) : v === val;
  };

  async function pick(file?: File) {
    if (!file) return;
    const check = await validateImageFile(file);
    if (!check.ok) {
      setError(check.error ?? "That image can’t be used.");
      return;
    }
    setError(null);
    setUpload(await readAsDataURL(file));
    setFilm(null);
  }

  async function create() {
    if (!ready || !portrait) return;
    if (!(await ensureCanGenerateVideo())) return; // sign-in / quota gate
    setLoading(true);
    setError(null);
    setFilm(null);
    setModalOpen(true);
    try {
      const res = await composeReel({
        kind: "video",
        likeness: portrait,
        pieceImage,
        prompt: buildFilmPrompt(format, opts, garmentDesc, free),
        productId: curated?.id ?? "creator-upload",
      });
      setFilm({
        image: res.imageUrl,
        videoUrl: res.videoUrl,
        posterUrl: res.posterUrl,
        lookId: res.lookId,
      });
    } catch (e) {
      if (!(e instanceof VideoLimitError) && !(e instanceof SignInRequiredError)) {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    } finally {
      setLoading(false);
    }
  }

  const fmt = getFilmFormat(format);

  return (
    <div className="creator">
      <section className="sec-hero sec-hero--left">
        <p className="eyebrow">OneTap Creator · Reel</p>
        <h1>
          The <em>reel</em> builder for creators
        </h1>
        <p className="sec-sub">
          Turn a single garment into a directed, cinema-grade reel for AI video
          tools. Choose a format, bring your piece, set the mood — then create
          your reel.
        </p>
      </section>

      <div className="creator-body">
        {/* Step 1 — format */}
        <p className="step-lbl">Step 1 — choose reel format</p>
        <p className="step-note">
          Each format is built for AI video tools (Runway, Kling) from a single
          garment image + prompt.
        </p>
        <div className="film-formats">
          {FILM_FORMATS.map(({ id, label, sub, Icon, trending }) => (
            <button
              key={id}
              className={"film-fmt" + (format === id ? " on" : "")}
              onClick={() => {
                setFormat(id);
                setOpts({});
                setFilm(null);
              }}
            >
              {trending && <span className="hot">Trending</span>}
              <Icon size={18} strokeWidth={1.4} />
              <span className="ff-name">{label}</span>
              <span className="ff-sub">{sub}</span>
            </button>
          ))}
        </div>

        {/* Step 2 — garment */}
        <p className="step-lbl">Step 2 — garment</p>
        <div className="garment-tabs">
          <button className={"gt" + (tab === "upload" ? " on" : "")} onClick={() => setTab("upload")}>
            <Upload size={13} strokeWidth={1.5} /> Upload your piece
          </button>
          <button className={"gt" + (tab === "curated" ? " on" : "")} onClick={() => setTab("curated")}>
            <LayoutGrid size={13} strokeWidth={1.5} /> Curated collection
          </button>
        </div>

        {tab === "upload" ? (
          <div
            className={"creator-drop" + (drag ? " drag" : "") + (upload ? " has" : "")}
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
            {upload ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="creator-prev" src={upload} alt="Your piece" />
            ) : (
              <>
                <Upload size={22} strokeWidth={1.3} />
                <span className="sd-title">Upload the piece</span>
                <span className="sd-sub">A product image or a screenshot.</span>
                <span className="sd-guide">{IMAGE_GUIDELINE}</span>
              </>
            )}
          </div>
        ) : (
          <div className="cprod-grid">
            {products.map((p) => (
              <button
                key={p.id}
                className={"cprod" + (curated?.id === p.id ? " on" : "")}
                onClick={() => {
                  setCurated(p);
                  setFilm(null);
                }}
              >
                <span className="cprod-img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.imageUrl} alt={p.name} loading="lazy" />
                  {curated?.id === p.id && (
                    <span className="cgar-check">
                      <Check size={12} strokeWidth={2.4} />
                    </span>
                  )}
                </span>
                <span className="cprod-brand">{p.brand}</span>
                <span className="cprod-name">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 3 — options */}
        {fmt && (
          <>
            <p className="step-lbl">Step 3 — options</p>
            <div className="opts-panel">
              {fmt.fields.map((f) => (
                <div className="film-field" key={f.id}>
                  <div className="ff-lbl">{f.label}</div>
                  <div className="chips">
                    {f.opts.map((o) => (
                      <span
                        key={o}
                        className={"chip" + (isOn(f.id, o) ? " on" : "")}
                        onClick={() => toggleOpt(f.id, o, f.multi)}
                      >
                        {o}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <input
                className="creator-free"
                type="text"
                placeholder="Optional — add any extra direction"
                value={free}
                onChange={(e) => setFree(e.target.value)}
              />
            </div>
          </>
        )}

        {hydrated && !portrait && (
          <p className="step-note">
            You'll need a likeness to appear in the reel.{" "}
            <Link href="/onboarding" className="sl-link">
              Add yours →
            </Link>
          </p>
        )}

        <button className="creator-go" onClick={create} disabled={!ready}>
          <Wand2 size={15} strokeWidth={1.5} /> Try-On
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

      <ResultModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setFilm(null);
        }}
        brand={tab === "curated" && curated ? curated.brand : "Your Film"}
        name={tab === "curated" && curated ? curated.name : undefined}
        image={film?.image}
        video={film?.videoUrl}
        poster={film?.posterUrl}
        phase={loading ? "video" : null}
        turnLabel="Film"
        turnSub="The Reel"
        caption={tab === "curated" && curated ? { brand: curated.brand, name: curated.name } : null}
        buyUrl={tab === "curated" ? curated?.buyUrl : undefined}
        videoLookId={film?.lookId}
        productId={curated?.id ?? "creator-upload"}
      />
    </div>
  );
}
