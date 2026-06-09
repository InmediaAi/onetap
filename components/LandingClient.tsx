"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ───────────────────────────────────────────────────────────────────
   Module demo films — CDN-hosted (Supabase Storage).
   Fill videoUrl / posterUrl with the real hosted URLs. While blank the
   panel renders a graceful empty state (poster/typographic still; play
   does nothing). preload="metadata" keeps these off the critical path.
   ─────────────────────────────────────────────────────────────────── */
type Film = {
  key: string;
  idx: string;
  title: string;
  tag: string;
  desc: string;
  steps: { n: string; t: string }[];
  cap: string;
  href: string;
  cta: string;
  videoUrl: string;
  posterUrl: string;
};

const MODULE_FILMS: Film[] = [
  {
    key: "curator",
    idx: "01",
    title: "OneTap Curator",
    tag: "Working name — OneTap Try-On",
    desc: "A personalised listing, built on the houses you already buy. Tap any piece and see yourself wearing it — the decision made on your own body, in your own light.",
    cap: "OneTap Curator — Film",
    href: "/curator",
    cta: "Open the edit",
    steps: [
      { n: "One", t: "Open the edit." },
      { n: "Two", t: "Tap the piece." },
      { n: "Three", t: "Watch it on you." },
    ],
    videoUrl: "", // e.g. https://<project>.supabase.co/storage/v1/object/public/films/onetap-curator.mp4
    posterUrl: "",
  },
  {
    key: "tryon",
    idx: "02",
    title: "360° Try-On",
    tag: "Action — OneTap TryOn",
    desc: "Upload anything you are considering — a product image, a screenshot, a photograph taken in a store — and see yourself wearing it, from every angle. One upload, one action.",
    cap: "360° Try-On — Film",
    href: "/tryon",
    cta: "Try it on",
    steps: [
      { n: "One", t: "Upload the piece." },
      { n: "Two", t: "One tap." },
      { n: "Three", t: "The turn, returned." },
    ],
    videoUrl: "",
    posterUrl: "",
  },
  {
    key: "creator",
    idx: "03",
    title: "Atelier Scenes",
    tag: "Working name — OneTap Creator",
    desc: "Place a piece in the world you would wear it in — a city street at dusk, a coastal evening, quiet luxury, old money. The film situates the object in your life.",
    cap: "Atelier Scenes — Film",
    href: "/creator",
    cta: "Compose a scene",
    steps: [
      { n: "One", t: "Choose the piece." },
      { n: "Two", t: "Choose the world." },
      { n: "Three", t: "The film follows." },
    ],
    videoUrl: "",
    posterUrl: "",
  },
];

/* Per-module framed film with click-to-play overlay (lazy, no autoplay). */
function FilmPanel({ film }: { film: Film }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    const v = videoRef.current;
    if (!v || !film.videoUrl) return; // no source yet → overlay stays
    const p = v.play();
    if (p && typeof p.then === "function") {
      p.then(() => setPlaying(true)).catch(() => {});
    } else {
      setPlaying(true);
    }
  };

  return (
    <figure className="lp-film">
      {film.videoUrl ? (
        <video
          ref={videoRef}
          preload="metadata"
          playsInline
          muted
          loop
          poster={film.posterUrl || undefined}
          onClick={() => {
            videoRef.current?.pause();
            setPlaying(false);
          }}
          onEnded={() => setPlaying(false)}
        >
          <source src={film.videoUrl} type="video/mp4" />
        </video>
      ) : (
        film.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={film.posterUrl} alt="" className="lp-film-poster" />
        )
      )}

      <button
        type="button"
        className={`lp-overlay${playing ? " hidden" : ""}`}
        aria-label={`Play the ${film.title} film`}
        onClick={handlePlay}
      >
        <span className="lp-play" aria-hidden="true">
          <svg width="18" height="20" viewBox="0 0 20 22">
            <path d="M2 2 L18 11 L2 20 Z" fill="var(--stone)" />
          </svg>
        </span>
        <span className="lp-cap">{film.cap}</span>
      </button>
    </figure>
  );
}

export default function LandingClient() {
  /* Gentle reveal-on-scroll (respects reduced motion). */
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="lp">
      {/* HERO */}
      <section className="lp-hero">
        <div className="lp-wrap">
          <span className="lp-accent reveal" />
          <h1 className="reveal">See it on yourself, before you own it.</h1>
          <p className="lp-sub reveal">
            OneTap Atelier is where the luxury buyer tries a piece on herself
            before she buys it. The fit, the fall, the light — seen, before any
            decision.
          </p>
          <div className="lp-actions reveal">
            <Link href="/curator" className="btn-line">
              Enter the atelier
            </Link>
            <a href="#modules" className="lp-quiet">
              The modules
            </a>
          </div>
        </div>
      </section>

      {/* WHAT ONETAP IS */}
      <section className="lp-what">
        <div className="lp-wrap lp-what-grid">
          <h2 className="reveal">The piece, on you — not on a model.</h2>
          <div className="lp-body reveal">
            <p>
              A jacket photographed on a model is a guess. The same jacket on
              you is a decision. OneTap Atelier removes the guess.
            </p>
            <p>
              Curated pieces from more than one hundred houses — Saint Laurent,
              Bottega Veneta, The Row, Loewe, Khaite, Toteme, Alaïa and beyond —
              tried on in a single tap, returned as a short film, before you
              buy.
            </p>
            <span className="lp-definitive">This is where luxury is tried.</span>
          </div>
        </div>
      </section>

      {/* THE THREE MODULES */}
      <section id="modules" className="lp-modules">
        <div className="lp-wrap">
          <div className="lp-modules-head reveal">
            <h2>Three ways to see it on yourself.</h2>
          </div>
          <p className="lp-modules-intro reveal">
            Every module serves one decision — to own the piece, or not. Watch
            how each one works.
          </p>

          {MODULE_FILMS.map((film, i) => (
            <article
              key={film.key}
              className={`lp-module reveal${i % 2 === 1 ? " flip" : ""}`}
            >
              <div className="lp-film-col">
                <FilmPanel film={film} />
              </div>
              <div className="lp-text-col">
                <span className="lp-idx">{film.idx}</span>
                <h3>{film.title}</h3>
                <span className="lp-tag">{film.tag}</span>
                <p className="lp-desc">{film.desc}</p>
                <div className="lp-steps">
                  {film.steps.map((s) => (
                    <span key={s.n} className="lp-step">
                      <span className="lp-n">{s.n}</span>
                      {s.t}
                    </span>
                  ))}
                </div>
                <div className="lp-module-cta">
                  <Link href={film.href} className="btn-line">
                    {film.cta}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* MEMBERSHIP + PRIVACY */}
      <section id="membership" className="lp-strip">
        <div className="lp-wrap lp-strip-grid">
          <div className="reveal">
            <h3>Membership</h3>
            <p className="lp-price">
              Twenty-five dollars a month, ten try-on films included. No
              discounts. Nothing more to manage.
            </p>
            <div className="lp-module-cta">
              <Link href="/pricing" className="btn-ghost">
                See membership
              </Link>
            </div>
          </div>
          <div className="reveal" id="privacy">
            <h3>Your likeness is yours.</h3>
            <p>
              The films we make are seen by you, used only for you, and never
              used to train without your word. Deletion is honoured, in full.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
