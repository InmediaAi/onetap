"use client";

import { useEffect, useState } from "react";
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

/**
 * The signed-in user's generated looks — their closet/history. Server-fetched
 * (authoritative + cross-device) from /api/me/looks. Each card opens /look/[id].
 */
export default function ClosetGallery() {
  const openSignIn = useAtelier((s) => s.openSignIn);
  const [state, setState] = useState<State>("loading");
  const [looks, setLooks] = useState<ClosetLook[]>([]);

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

  if (state === "loading") {
    return <p className="admin-status">Loading your closet…</p>;
  }

  if (state === "signedout") {
    return (
      <div className="closet-empty">
        <p>Sign in to see the looks and videos you’ve created.</p>
        <button className="btn-line" onClick={() => openSignIn()}>
          Sign in
        </button>
      </div>
    );
  }

  if (state === "error") {
    return <p className="admin-status">Couldn’t load your closet. Please try again.</p>;
  }

  if (!looks.length) {
    return (
      <div className="closet-empty">
        <p>Nothing here yet — make your first look.</p>
        <Link className="btn-line" href="/curator">
          Browse the Curator
        </Link>
      </div>
    );
  }

  return (
    <div className="closet-grid">
      {looks.map((l) => {
        const isVideo = l.kind !== "tryon";
        const isFifa = l.campaign === "fifa-worldcup";
        return (
          <Link key={l.id} href={`/look/${l.id}`} className="closet-card" aria-label={`View ${KIND_LABEL[l.kind]}`}>
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
                {new Date(l.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
