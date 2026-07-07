import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cancellation & Refund Policy - OneTap Atelier",
  description:
    "How cancellation and refunds work for your OneTap Atelier membership, a product of Inmedia AI Inc.",
};

export default function RefundsPage() {
  return (
    <div className="wrap">
      <Link href="/" className="mark">OneTap Atelier</Link>

      <span className="eyebrow">Cancellation &amp; Refund Policy</span>
      <h1>Cancellation &amp; Refund Policy</h1>
      <p className="meta">
        Effective date: July 7, 2026 &nbsp;·&nbsp; OneTap Atelier is a product of
        Inmedia AI Inc. This Policy forms part of, and should be read with, our{" "}
        <Link href="/terms">Terms of Service</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <span className="accent" />

      <p>This Policy explains how cancellation and refunds work for your OneTap Atelier membership, operated by <strong>Inmedia AI Inc</strong> (“we,” “us,” “our”). By subscribing to the Service, you agree to this Policy.</p>

      <h2>1. What this Policy covers</h2>
      <p>This Policy applies only to <strong>membership fees</strong> paid to Inmedia AI Inc for the OneTap Atelier Service.</p>
      <p>Inmedia AI Inc does not design, manufacture, own, stock, sell, or ship any clothing, footwear, accessories, or other merchandise. If you purchase a product after viewing it on the Service, that purchase is made directly with the third-party brand or retailer, and <strong>that party’s own cancellation, return, and refund policies apply</strong>. We are not a party to those transactions and cannot cancel, return, or refund them.</p>

      <h2>2. Your membership and billing</h2>
      <p>The Service is offered on a monthly subscription basis. Your plan and its included Try-On Film allowance are shown at sign-up and in your account. Your subscription <strong>renews automatically</strong> each billing cycle, and your payment method is charged at the start of each cycle, until you cancel.</p>

      <h2>3. How to cancel</h2>
      <ul>
        <li>You may cancel at any time in your account settings, or by writing to us at <a href="mailto:mitul@onetapatelier.com">mitul@onetapatelier.com</a> from the email address on your account.</li>
        <li>Cancellation takes effect at the <strong>end of your current billing cycle</strong>. You keep full access to the Service, and to any remaining Try-On Films in your allowance, until that date.</li>
        <li>You will not be charged again after cancellation takes effect.</li>
        <li>Where the law of your state provides a specific cancellation mechanism (for example, California’s Automatic Renewal Law), we honour it, including online cancellation that is as simple as sign-up.</li>
      </ul>
      <p>Cancelling your membership does not delete your account or your content. Deletion of your account, your uploaded content, and your Try-On Films is described in our <Link href="/privacy">Privacy Policy</Link> and is honoured in full on request.</p>

      <h2>4. Refunds</h2>
      <p>Because Try-On Films are digital services delivered immediately upon generation, and your allowance is available in full from the start of each cycle, <strong>membership fees are non-refundable except as set out below or as required by applicable law</strong>. In particular, we do not provide refunds or credits for partially used billing cycles, for unused Try-On Films, or for periods in which you did not use the Service.</p>
      <p>We will refund you in the following cases:</p>
      <ul>
        <li><strong>Duplicate or erroneous charges.</strong> If you are charged twice for the same cycle, or charged in error, we refund the incorrect charge in full.</li>
        <li><strong>Charges after cancellation.</strong> If you were charged for a cycle beginning after your cancellation took effect, we refund that charge in full.</li>
        <li><strong>Service failure.</strong> If a material failure of the Service prevents delivery of what you paid for and we cannot remedy it within a reasonable time, we will refund the affected charge or issue a pro-rated refund, at our reasonable discretion.</li>
        <li><strong>Where the law requires it.</strong> Nothing in this Policy limits any non-waivable right you have under the consumer-protection laws of your place of residence.</li>
      </ul>

      <h2>5. Failed or defective Try-On Films</h2>
      <p>Try-On Films are AI-generated, illustrative estimates, and reasonable variation in output is not a defect. However, if a generation <strong>fails to complete, or the delivered film is materially defective</strong> (for example, unwatchable or missing), contact us within 7 days and we will re-run the generation or restore the Try-On Film credit to your allowance. Restored credits, not cash refunds, are the standard remedy for individual generation issues.</p>

      <h2>6. Plan changes</h2>
      <ul>
        <li><strong>Upgrades</strong> take effect immediately; you are charged the difference or the new plan price as shown at the time of upgrade, and the higher allowance applies from that point.</li>
        <li><strong>Downgrades</strong> take effect at the start of your next billing cycle. Your current plan and allowance remain in place until then.</li>
        <li>Unused Try-On Films do not carry over between billing cycles and have no cash value.</li>
      </ul>

      <h2>7. How refunds are processed</h2>
      <p>To request a refund, write to <a href="mailto:mitul@onetapatelier.com">mitul@onetapatelier.com</a> from the email address on your account, stating the charge concerned and the reason. We respond within 2 business days. Approved refunds are issued to your <strong>original payment method</strong> and typically appear within 5 to 10 business days, depending on your bank or card issuer. We do not issue refunds to a different card, account, or person than the one charged.</p>

      <h2>8. Chargebacks</h2>
      <p>If you believe a charge is incorrect, please contact us first; most matters are resolved within a business day. We reserve the right to suspend accounts associated with chargebacks filed on legitimate, delivered charges, after the dispute is resolved.</p>

      <h2>9. Our right to cancel</h2>
      <p>If we terminate your membership for a violation of our <Link href="/terms">Terms of Service</Link>, no refund is due for the current cycle. If we discontinue the Service or terminate your membership for convenience, we will refund the unused portion of your current cycle on a pro-rated basis.</p>

      <h2>10. Changes to this Policy</h2>
      <p>We may update this Policy from time to time. Material changes will be indicated by updating the effective date and posting the revised Policy. Changes apply to billing cycles beginning after the effective date.</p>

      <h2>11. Contact</h2>
      <p>Inmedia AI Inc - OneTap Atelier<br />
      <a href="mailto:mitul@onetapatelier.com">mitul@onetapatelier.com</a></p>

      <footer className="legal-foot">
        <div className="legal-nav">
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/">Return to OneTap Atelier</Link>
        </div>
        © 2026 Inmedia AI Inc. All rights reserved. OneTap Atelier is a product of Inmedia AI Inc. All trademarks and product imagery referenced on the Service are the property of their respective owners; reference to them does not imply affiliation or endorsement.
      </footer>
    </div>
  );
}
