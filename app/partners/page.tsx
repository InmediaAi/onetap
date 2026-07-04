import type { Metadata } from "next";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import PartnerForm from "@/components/PartnerForm";
import { fetchProducts } from "@/lib/data/getProducts";
import { getPartnerShowcase } from "@/lib/data/partnerConfig";

export const metadata: Metadata = {
  title: "Partner with OneTap Atelier — put your pieces on real shoppers",
  description:
    "Reach high-intent shoppers who try your pieces on themselves before they buy. Curated AI discovery, lower returns, campaign deeplinks with first-party attribution, and viral social moments — with zero integration lift.",
};

const PROBLEMS: { title: string; body: string }[] = [
  {
    title: "Discovery is broken",
    body: "Shoppers scroll TikTok and Instagram, but that attention rarely turns into measurable, full-price sales.",
  },
  {
    title: "Returns are expensive",
    body: "Buyers guess at fit and how a piece will actually look on them — and send back what misses.",
  },
  {
    title: "Flat PDPs under-convert",
    body: "A product shot on a stranger isn't “on me.” Shoppers hesitate, and intent leaks away.",
  },
  {
    title: "No first-party intent data",
    body: "Ad clicks are noisy and anonymous. You can't see who's genuinely ready to buy your brand.",
  },
];

const BENEFITS: { title: string; body: string }[] = [
  {
    title: "Try-on that converts",
    body: "Shoppers see your piece on themselves — a photo, a 360° turn, a short film — so intent is real before they reach checkout.",
  },
  {
    title: "Lower returns",
    body: "Previewing fit and look up front means fewer wrong-guess purchases and fewer costly returns.",
  },
  {
    title: "Curated AI discovery",
    body: "Your pieces surface inside styled edits, personalized feeds, and search — where shoppers are ready to buy.",
  },
  {
    title: "Deeplinks + attribution",
    body: "Branded links drop shoppers straight onto your product's try-on. Every signup and look is tagged first-touch to your campaign.",
  },
  {
    title: "Viral social moments",
    body: "Feature in Atelier-owned activations and social channels — the kind that put your pieces in front of a 1M+ audience.",
  },
  {
    title: "Zero integration lift",
    body: "We ingest your catalog through your existing affiliate setup. No engineering, no SDK, no integration fees.",
  },
];

const STEPS: { title: string; body: string }[] = [
  { title: "Share your catalog", body: "Connect via your existing affiliate network — no integration fees." },
  { title: "We ingest & quality-check", body: "Products, imagery, and try-on readiness, typically in 1–2 weeks." },
  { title: "Go live on OneTap", body: "You appear across discovery, search, try-on, and curated edits." },
  { title: "Review & scale", body: "Measure performance, then scale exposure, exclusives, and media." },
];

export default async function PartnersPage() {
  const products = await fetchProducts().catch(() => []);
  const visuals = products
    .map((p) => p.imageUrl)
    .filter((u): u is string => Boolean(u))
    .slice(0, 6);
  const houses = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))).slice(0, 14);

  // Admin-managed showcase clips (set in /admin → Partners).
  const showcase = (await getPartnerShowcase().catch(() => [])).slice(0, 6);

  return (
    <main className="page-shell">
      <Header />

      <div className="partner-page">
        {/* Hero */}
        <section className="sec-hero">
          <p className="eyebrow">Partner with OneTap Atelier</p>
          <h1>
            Join the <em>future</em> of fashion retail.
          </h1>
          <p className="sec-sub">
            Put your pieces in front of high-intent shoppers who try them on — on
            themselves — before they buy. Curated discovery, lower returns, and
            first-party attribution, with zero integration lift.
          </p>
          <div className="partner-hero-cta">
            <a href="#contact" className="btn-line">
              Get in touch
            </a>
          </div>
        </section>

        {/* Problem */}
        <section className="partner-section wrap">
          <h2 className="partner-h2">The problem for fashion brands today</h2>
          <div className="partner-cards">
            {PROBLEMS.map((p) => (
              <div className="lp-modcard" key={p.title}>
                <h3>{p.title}</h3>
                <p className="lp-modcard-blurb">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Why partner */}
        <section className="partner-section wrap">
          <h2 className="partner-h2">Why partner with OneTap Atelier?</h2>
          <p className="partner-lede">
            We turn high-intent discovery into incremental, full-price revenue —
            bringing you new customers and higher-quality orders while protecting
            your brand.
          </p>
          <div className="partner-cards">
            {BENEFITS.map((b) => (
              <div className="lp-modcard" key={b.title}>
                <h3>{b.title}</h3>
                <p className="lp-modcard-blurb">{b.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* See it in action */}
        {(showcase.length > 0 || visuals.length > 0) && (
          <section className="partner-section wrap">
            <h2 className="partner-h2">
              See your pieces in action
              <br />
              <em>by your brand fans</em>
            </h2>
            <p className="partner-lede">
              Every piece becomes a try-on your fans can wear, spin, and share.
            </p>
            {showcase.length > 0 ? (
              <div className="partner-reel">
                {showcase.map((src) => (
                  <video
                    key={src}
                    src={src}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                  />
                ))}
              </div>
            ) : (
              <div className="partner-visuals">
                {visuals.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" loading="lazy" />
                ))}
              </div>
            )}
          </section>
        )}

        {/* How to get started */}
        <section className="partner-section wrap">
          <h2 className="partner-h2">How to get started</h2>
          <div className="partner-steps">
            {STEPS.map((s, i) => (
              <div className="partner-step" key={s.title}>
                <span className="partner-step-no">{String(i + 1).padStart(2, "0")}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Houses shoppers search for */}
        {houses.length > 0 && (
          <section className="partner-section wrap">
            <p className="eyebrow partner-strip-lbl">The houses our shoppers search for</p>
            <div className="partner-brandstrip">
              {houses.map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </section>
        )}

        {/* Contact */}
        <section className="partner-section wrap" id="contact">
          <PartnerForm />
        </section>
      </div>

      <SiteFooter />
    </main>
  );
}
