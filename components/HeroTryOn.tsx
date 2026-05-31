"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { type Product } from "@/lib/data/products";
import { createId } from "@/lib/utils";

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/**
 * Hero entry point — try on ANY piece, not just the catalogue. The user uploads
 * a product image / screenshot; we open the try-on modal with it as an ad-hoc
 * product (so it flows through the same Try-On / 360° / Film generation).
 */
export default function HeroTryOn({ onTry }: { onTry: (p: Product) => void }) {
  const [piece, setPiece] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pick(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;
    setPiece(await readAsDataURL(file));
  }

  function tryItOn() {
    if (!piece) return;
    onTry({
      id: `upload-${createId()}`,
      brand: "Your Piece",
      mono: "·",
      name: "Uploaded piece",
      price: "",
      imageUrl: piece,
    });
  }

  return (
    <section className="hero">
      <div className="hero-inner">
        <div
          className={
            "hero-drop" + (dragging ? " drag" : "") + (piece ? " has" : "")
          }
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void pick(e.dataTransfer.files?.[0]);
          }}
        >
          {piece ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-prev" src={piece} alt="Your piece" />
              <button
                className="hero-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  setPiece(null);
                }}
                aria-label="Remove"
              >
                <X size={14} strokeWidth={1.6} />
              </button>
            </>
          ) : (
            <>
              <Upload size={22} strokeWidth={1.3} />
              <span className="hd-title">Upload the piece</span>
              <span className="hd-sub">
                A product image or a screenshot. One garment at a time.
              </span>
            </>
          )}
        </div>

        <button className="hero-btn" onClick={tryItOn} disabled={!piece}>
          <span className="mk" /> OneTap Try-On
        </button>

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
    </section>
  );
}
