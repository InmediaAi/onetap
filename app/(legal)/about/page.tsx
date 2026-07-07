import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us - OneTap Atelier",
  description:
    "OneTap Atelier is a curated luxury try-on membership, a product of Inmedia AI Inc.",
};

export default function AboutPage() {
  return (
    <div className="wrap">
      <Link href="/" className="mark">OneTap Atelier</Link>

      <span className="eyebrow">About Us</span>
      <h1>About OneTap Atelier</h1>
      <p className="meta">OneTap Atelier is a product of Inmedia AI Inc.</p>
      <span className="accent" />

      <p><strong>OneTap Atelier</strong> is a curated luxury membership operated by <strong>Inmedia AI Inc</strong>, a technology company based in India. We help shoppers make confident decisions about luxury fashion by letting them see a piece on themselves before they commit to buying it.</p>

      <h2>What we do</h2>
      <p>A curator selects pieces from more than one hundred luxury houses. As a member, you see each piece on yourself — your face, your proportions — as a photo, a 360° turn, or a short film we call a Try-On Film, generated on your likeness in about two minutes. The idea is simple: a garment photographed on a model is a guess; the same garment on you is a decision.</p>
      <p>The Service includes three ways to try a piece: the <Link href="/curator">OneTap Curator</Link> (a personalised edit with one-tap try-on), <Link href="/tryon">360° Try-On</Link>, and <Link href="/creator">Atelier Scenes</Link>. Membership is offered on a subscription basis; plans and their included allowances are shown on our <Link href="/pricing">Pricing</Link> page.</p>

      <h2>A curation platform, not a merchant</h2>
      <p>Inmedia AI Inc does not design, manufacture, own, stock, sell, or ship any clothing, footwear, accessories, or other merchandise. OneTap Atelier is a curation and technology layer only. If you choose to buy a piece after seeing it on yourself, that purchase is made directly with the relevant third-party brand or retailer, under that party's own pricing, terms, and policies. References to any brand, designer, or product are used only to identify items you may wish to view and do not imply any affiliation or endorsement.</p>

      <h2>Your images stay yours</h2>
      <p>The photos and videos you upload are used only to create your Try-On Films. We do not use your content to train AI models without your separate, explicit opt-in, and deletion is honoured in full on request. How we handle your data is described in our <Link href="/privacy">Privacy Policy</Link>.</p>

      <h2>Get in touch</h2>
      <p>Questions about the Service, your membership, or a partnership are always welcome — see our <Link href="/contact">Contact</Link> page. Brands and retailers interested in working with us can visit <Link href="/partners">Partner With Us</Link>.</p>

      <footer className="legal-foot">
        <div className="legal-nav">
          <Link href="/contact">Contact</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/">Return to OneTap Atelier</Link>
        </div>
        © 2026 Inmedia AI Inc. All rights reserved. OneTap Atelier is a product of Inmedia AI Inc. All trademarks and product imagery referenced on the Service are the property of their respective owners; reference to them does not imply affiliation or endorsement.
      </footer>
    </div>
  );
}
