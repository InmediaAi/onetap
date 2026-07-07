import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact Us - OneTap Atelier",
  description:
    "How to reach OneTap Atelier, a product of Inmedia AI Inc — support, billing, and legal contacts.",
};

/* Contact details shown on the page. Emails are kept separate by function.
   ▸ FILL BEFORE RAZORPAY SUBMISSION: `phone` and `address` must hold the real
   business values — an empty value renders a visible placeholder that will fail
   review. Example phone: "+1 (555) 123-4567". */
const CONTACT = {
  entity: "Inmedia AI Inc",
  product: "OneTap Atelier",
  general: "info@onetapatelier.com",
  billing: "mitul@onetapatelier.com",
  legal: "mitul@inmediaai.com",
  phone: "+91 88497 54969",
  address: "1201, Tower X, Eden, Godrej Garden City, Ahmedabad – 382470, Gujarat, India",
  responseTime: "We reply within 2 business days.",
};

/** Real value, or a flagged placeholder so the gap is obvious in review. */
function orPlaceholder(value: string, label: string) {
  return value ? value : <span className="ph">[{label}]</span>;
}

export default function ContactPage() {
  const telHref = CONTACT.phone ? `tel:${CONTACT.phone.replace(/[^\d+]/g, "")}` : undefined;

  return (
    <div className="wrap">
      <Link href="/" className="mark">OneTap Atelier</Link>

      <span className="eyebrow">Contact Us</span>
      <h1>Contact Us</h1>
      <p className="meta">OneTap Atelier is a product of Inmedia AI Inc.</p>
      <span className="accent" />

      <p>We&rsquo;d love to hear from you. Reach the right team below — {CONTACT.responseTime}</p>

      <h2>Business</h2>
      <p>
        <strong>{CONTACT.entity}</strong> ({CONTACT.product})
        <br />
        {orPlaceholder(CONTACT.address, "Registered business address")}
      </p>
      <p>
        Phone:{" "}
        {telHref ? <a href={telHref}>{CONTACT.phone}</a> : orPlaceholder(CONTACT.phone, "Phone number")}
      </p>

      <h2>Email us</h2>
      <ul>
        <li>
          <strong>General &amp; support</strong> —{" "}
          <a href={`mailto:${CONTACT.general}`}>{CONTACT.general}</a>
        </li>
        <li>
          <strong>Billing, cancellations &amp; refunds</strong> —{" "}
          <a href={`mailto:${CONTACT.billing}`}>{CONTACT.billing}</a>
        </li>
        <li>
          <strong>Privacy &amp; legal</strong> —{" "}
          <a href={`mailto:${CONTACT.legal}`}>{CONTACT.legal}</a>
        </li>
      </ul>

      <h2>Response time</h2>
      <p>{CONTACT.responseTime} For billing questions about a specific charge, please write from the email address on your account and include the charge details so we can help faster.</p>

      <h2>Other links</h2>
      <p>See our <Link href="/pricing">Pricing</Link>, <Link href="/refunds">Cancellation &amp; Refund Policy</Link>, and <Link href="/terms">Terms of Service</Link>. Brands and retailers can reach us via <Link href="/partners">Partner With Us</Link>.</p>

      <footer className="legal-foot">
        <div className="legal-nav">
          <Link href="/about">About Us</Link>
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
