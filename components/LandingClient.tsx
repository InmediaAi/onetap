"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { HomeModule } from "@/lib/data/getHomeModules";

/* ───────────────────────────────────────────────────────────────────
   The three modules - big 9:16 cards with an (admin-managed) background
   clip under a dark overlay. The title/tag/blurb/clip come from the DB
   (getHomeModules); the route + CTA label stay code-defined here.
   ─────────────────────────────────────────────────────────────────── */
const MODULE_STRUCTURE: Record<string, { href: string; cta: string }> = {
  curator: { href: "/curator", cta: "Open the edit" },
  tryon: { href: "/tryon", cta: "Try it on" },
  creator: { href: "/creator", cta: "Compose a scene" },
};

/** A single 9:16 module card - ambient background clip + dark scrim + text. */
function ModuleCard({ module, idx }: { module: HomeModule; idx: number }) {
  const struct = MODULE_STRUCTURE[module.id] ?? { href: "/curator", cta: "Explore" };
  return (
    <Link href={struct.href} className="lp-mod9 reveal" aria-label={module.title}>
      {module.videoUrl ? (
        <video
          className="lp-mod9-bg"
          src={module.videoUrl}
          poster={module.posterUrl || undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      ) : (
        module.posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="lp-mod9-bg" src={module.posterUrl} alt="" loading="lazy" />
        )
      )}
      <span className="lp-mod9-scrim" aria-hidden="true" />
      <span className="lp-mod9-body">
        <span className="lp-idx">{String(idx + 1).padStart(2, "0")}</span>
        <span className="lp-tag">{module.tag}</span>
        <h3>{module.title}</h3>
        <p className="lp-mod9-blurb">{module.blurb}</p>
        <span className="lp-mod9-cta">{struct.cta} →</span>
      </span>
    </Link>
  );
}

export default function LandingClient({
  modules,
  children,
}: {
  modules: HomeModule[];
  children?: React.ReactNode;
}) {
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
            A curated luxury membership that lets you try on fashion from 100+
            designer brands in under 2 minutes.
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
          <h2 className="reveal">The piece, on you - not on a model.</h2>
          <div className="lp-body reveal">
            <p>
              A jacket photographed on a model is a guess. The same jacket on
              you is a decision. OneTap Atelier removes the guess.
            </p>
            <p>
              Curated pieces from more than one hundred houses - Saint Laurent,
              Bottega Veneta, The Row, Loewe, Khaite, Toteme, Alaïa and beyond -
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
            <p className="lp-modules-intro">
              Every module serves one decision - to own the piece, or not.
            </p>
          </div>

          <div className="lp-modrow">
            {modules.map((m, i) => (
              <ModuleCard key={m.id} module={m} idx={i} />
            ))}
          </div>
        </div>
      </section>

      {/* EDITOR'S PICKS (server-rendered sections passed as children) */}
      {children}

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
