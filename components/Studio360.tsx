"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Plus, RotateCw } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import { useStartReel } from "@/lib/billing/useStartTryOn";
import { validateImageFile, IMAGE_GUIDELINE } from "@/lib/image/validate";

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
  // Full-length photo is the primary try-on likeness (a face-only selfie breaks
  // the full-body result), so gate on `body`, not the face-or-body `portrait`.
  const body = useAtelier((s) => s.body);
  const startReel = useStartReel();

  const [piece, setPiece] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file?: File) {
    if (!file) return;
    const check = await validateImageFile(file);
    if (!check.ok) {
      setError(check.error ?? "That image can’t be used.");
      return;
    }
    setPiece(await readAsDataURL(file));
    setError(null);
  }

  // Hand off to the global try-on island (same experience as the Curator):
  // it gates sign-in/quota + full-length photo, then composes the still → 360°.
  function run() {
    if (!piece) return;
    setError(null);
    void startReel({
      id: `spin-${Date.now()}`,
      kind: "spin",
      garmentImage: piece,
      garmentImages: [piece],
      thumbImage: piece,
      brand: "360° Try-On",
      mono: "360",
      turnLabel: "360°",
      turnSub: "The Turn",
      productId: "tryon-360",
    });
  }

  return (
    <div className="studio-solo">
      <div className="solo-col">
        <h1 className="solo-h">The Only 360° Video Try-On</h1>
        <p className="solo-sub">
          A screenshot from your cart. A photo from the boutique. Any piece, from
          anywhere, turned into a 360° video of you wearing it.
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
            <>Your likeness - private to you, used only with your consent.</>
          )}
        </p>

        {/* action */}
        <button
          className="studio-go"
          onClick={run}
          disabled={!piece}
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
    </div>
  );
}
