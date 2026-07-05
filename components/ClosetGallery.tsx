"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import Pagination from "@/components/Pagination";

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

const PAGE_SIZE = 4; // must match the server route (latest 4 per tab)

type State = "loading" | "ready" | "signedout" | "error";
type Tab = "clips" | "images";

/**
 * The signed-in user's generated looks — their closet/history. Paged
 * server-side per tab from /api/me/looks (authoritative + cross-device). Clips
 * (360°/film) and Images (try-on stills) paginate independently; each card opens
 * /look/[id], where download + share live.
 */
export default function ClosetGallery() {
  const router = useRouter();
  const hydrated = useHydrated();
  const email = useAtelier((s) => s.email);
  const profileLoaded = useAtelier((s) => s.profileLoaded);
  const markClosetSeen = useAtelier((s) => s.markClosetSeen);
  const redirecting = useRef(false);

  // Session resolved but not signed in → send them straight to the onboarding
  // sign-in (step 1), instead of a separate gate/modal (one action, not two) —
  // exactly like the profile screen. `next=/closet` returns them here after auth.
  const needsSignIn = hydrated && profileLoaded && !email;
  useEffect(() => {
    if (needsSignIn && !redirecting.current) {
      redirecting.current = true;
      router.replace("/onboarding?next=/closet");
    }
  }, [needsSignIn, router]);

  const [tab, setTab] = useState<Tab>("clips"); // clips first, by default
  const [page, setPage] = useState(1);
  const [looks, setLooks] = useState<ClosetLook[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ clips: 0, images: 0 });
  const [state, setState] = useState<State>("loading");
  const gridRef = useRef<HTMLDivElement>(null);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Visiting the closet clears the unseen-looks badge in the header.
  useEffect(() => {
    markClosetSeen();
  }, [markClosetSeen]);

  // Fetch the current tab + page server-side.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/me/looks?tab=${tab}&page=${page}`, { cache: "no-store" });
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
        setTotal(d.total ?? 0);
        setCounts(d.counts ?? { clips: 0, images: 0 });
        setState("ready");
      } catch {
        if (active) setState("error");
      }
    })();
    return () => {
      active = false;
    };
  }, [tab, page]);

  const switchTab = (t: Tab) => {
    if (t === tab) return;
    setTab(t);
    setPage(1);
  };

  if (state === "loading") {
    return (
      <div className="cl-empty">
        <p>Loading your closet…</p>
      </div>
    );
  }

  // Not signed in → the effect above redirects to onboarding; render a neutral
  // placeholder in the meantime (never the old two-step "Sign in" gate).
  if (state === "signedout" || needsSignIn) {
    return (
      <div className="cl-empty">
        <p>Loading your closet…</p>
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

  if (counts.clips + counts.images === 0) {
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
          onClick={() => switchTab("clips")}
        >
          Clips <span className="ct-count">{counts.clips}</span>
        </button>
        <button
          className={"closet-tab" + (tab === "images" ? " on" : "")}
          onClick={() => switchTab("images")}
        >
          Images <span className="ct-count">{counts.images}</span>
        </button>
      </div>

      {total === 0 ? (
        <div className="cl-empty">
          <p>{tab === "clips" ? "No clips yet — create a 360° or film." : "No try-on images yet."}</p>
        </div>
      ) : (
        <div className="cl-grid" ref={gridRef}>
          {looks.map((l) => {
            const isVideo = l.kind !== "tryon";
            return (
              <Link
                key={l.id}
                href={`/look/${l.id}`}
                className="closet-card"
                aria-label={`View ${KIND_LABEL[l.kind]}`}
              >
                <div className="cc-media">
                  {isVideo && !l.posterUrl ? (
                    <video src={l.assetUrl ?? undefined} muted playsInline preload="none" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={(isVideo ? l.posterUrl : l.assetUrl) ?? undefined} alt="" loading="lazy" />
                  )}
                  {isVideo && (
                    <span className="cc-play" aria-hidden="true">
                      <Play size={12} fill="currentColor" strokeWidth={0} />
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Pagination page={page} pageCount={pageCount} onPage={setPage} topRef={gridRef} />
    </>
  );
}
