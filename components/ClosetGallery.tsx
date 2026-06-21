"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAtelier } from "@/lib/store";

/** One row from GET /api/me/looks. */
interface ClosetLook {
  id: string;
  kind: "tryon" | "spin" | "video";
  assetUrl: string | null;
  posterUrl?: string;
  productId?: string;
  campaign?: string;
  createdAt: string;
}

const KIND_LABEL: Record<ClosetLook["kind"], string> = {
  tryon: "Try-On",
  spin: "360°",
  video: "Film",
};

type State = "loading" | "ready" | "signedout" | "error";
type Tab = "clips" | "images";

/**
 * The signed-in user's generated looks — their closet/history. Server-fetched
 * (authoritative + cross-device) from /api/me/looks. Split into Clips (360°/film)
 * and Images (try-on stills); each card opens /look/[id], where download + share
 * live.
 */
export default function ClosetGallery() {
  const openSignIn = useAtelier((s) => s.openSignIn);
  const [state, setState] = useState<State>("loading");
  const [looks, setLooks] = useState<ClosetLook[]>([]);
  const [tab, setTab] = useState<Tab>("clips"); // clips first, by default

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/me/looks");
        if (res.status === 401) {
          if (active) setState("signedout");
          return;
        }
        const d = res.ok ? await res.json() : null;
        if (!active) return;
        if (!d) {
          setState("error");
          return;
        }
        setLooks((d.looks ?? []).filter((l: ClosetLook) => l.assetUrl));
        setState("ready");
      } catch {
        if (active) setState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const clips = useMemo(() => looks.filter((l) => l.kind !== "tryon"), [looks]);
  const images = useMemo(() => looks.filter((l) => l.kind === "tryon"), [looks]);
  const shown = tab === "clips" ? clips : images;

  if (state === "loading") {
    return (
      <div className="cl-empty">
        <p>Loading your closet…</p>
      </div>
    );
  }

  if (state === "signedout") {
    return (
      <div className="cl-empty">
        <p>Sign in to see the looks and videos you’ve created.</p>
        <button className="btn-line" onClick={() => openSignIn()}>
          Sign in
        </button>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="cl-empty">
        <p>Couldn’t load your closet. Please try again.</p>
      </div>
    );
  }

  if (!looks.length) {
    return (
      <div className="cl-empty">
        <p>Nothing here yet — make your first look.</p>
        <Link className="btn-line" href="/curator">
          Browse the Curator
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="closet-tabs">
        <button
          className={"closet-tab" + (tab === "clips" ? " on" : "")}
          onClick={() => setTab("clips")}
        >
          Clips <span className="ct-count">{clips.length}</span>
        </button>
        <button
          className={"closet-tab" + (tab === "images" ? " on" : "")}
          onClick={() => setTab("images")}
        >
          Images <span className="ct-count">{images.length}</span>
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="cl-empty">
          <p>{tab === "clips" ? "No clips yet — create a 360° or film." : "No try-on images yet."}</p>
        </div>
      ) : (
        <div className="cl-grid">
          {shown.map((l) => {
            const isVideo = l.kind !== "tryon";
            const isFifa = l.campaign === "fifa-worldcup";
            return (
              <Link
                key={l.id}
                href={`/look/${l.id}`}
                className="closet-card"
                aria-label={`View ${KIND_LABEL[l.kind]}`}
              >
                <div className="cc-media">
                  {isVideo && !l.posterUrl ? (
                    <video src={l.assetUrl ?? undefined} muted playsInline preload="metadata" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(isVideo ? l.posterUrl : l.assetUrl) ?? undefined} alt="" loading="lazy" />
                  )}
                  {isVideo && <span className="cc-play" aria-hidden="true">▶</span>}
                </div>
                <div className="cc-meta">
                  <span className="cc-kind">{isFifa ? "FIFA" : KIND_LABEL[l.kind]}</span>
                  <span className="cc-date">
                    {new Date(l.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
