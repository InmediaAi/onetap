import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy - OneTap Atelier",
  description:
    "How OneTap Atelier delivers its digital memberships and Try-On Films. A product of Inmedia AI Inc.",
};

export default function ShippingPage() {
  return (
    <div className="wrap">
      <Link href="/" className="mark">OneTap Atelier</Link>

      <span className="eyebrow">Shipping &amp; Delivery Policy</span>
      <h1>Shipping &amp; Delivery Policy</h1>
      <p className="meta">Effective date: July 8, 2026 &nbsp;·&nbsp; OneTap Atelier is a product of Inmedia AI Inc.</p>
      <span className="accent" />

      <p>OneTap Atelier, operated by <strong>Inmedia AI Inc</strong>, provides a <strong>digital subscription service</strong>. We do not sell or ship any physical goods, so no physical shipment, shipping fee, or delivery timeline applies to your membership.</p>

      <h2>1. Digital delivery of the Service</h2>
      <p>What you pay for is access to the Service and your monthly allowance of Try-On Films. Access is granted <strong>immediately</strong> upon a successful payment, and each Try-On Film is delivered electronically inside your account, in your <Link href="/closet">closet</Link>, as soon as it finishes generating (typically within minutes). There is nothing to ship and no address is required for delivery.</p>

      <h2>2. We do not ship merchandise</h2>
      <p>Inmedia AI Inc does not design, manufacture, own, stock, sell, or ship any clothing, footwear, accessories, or other merchandise. If you decide to purchase a physical product after seeing it on yourself, that purchase is made <strong>directly with the third-party brand or retailer</strong>. All shipping, delivery, timelines, duties, returns, and related charges for that product are governed by <strong>that brand&rsquo;s or retailer&rsquo;s own policies</strong>, and we are not a party to that transaction.</p>

      <h2>3. Delivery issues with a Try-On Film</h2>
      <p>If a Try-On Film fails to generate or is not delivered to your account, this is handled as a service matter, not a shipping matter. Please see our <Link href="/refunds">Cancellation &amp; Refund Policy</Link> — we will re-run the generation or restore the credit to your allowance.</p>

      <h2>4. Contact</h2>
      <p>Questions about delivery of the Service can be sent to <a href="mailto:info@onetapatelier.com">info@onetapatelier.com</a>. See our <Link href="/contact">Contact</Link> page for all the ways to reach us.</p>

      <footer className="legal-foot">
        <div className="legal-nav">
          <Link href="/refunds">Cancellation &amp; Refunds</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/">Return to OneTap Atelier</Link>
        </div>
        © 2026 Inmedia AI Inc. All rights reserved. OneTap Atelier is a product of Inmedia AI Inc. All trademarks and product imagery referenced on the Service are the property of their respective owners; reference to them does not imply affiliation or endorsement.
      </footer>
    </div>
  );
}
