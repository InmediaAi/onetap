import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy - OneTap Atelier",
  description: "How Inmedia AI Inc collects, uses, and protects your information on OneTap Atelier.",
};

export default function PrivacyPage() {
  return (
    <div className="wrap">
      <Link href="/" className="mark">OneTap Atelier</Link>

      <span className="eyebrow">Privacy Policy</span>
      <h1>Privacy Policy</h1>
      <p className="meta">Effective date: May 15, 2025 &nbsp;·&nbsp; OneTap Atelier is a product of Inmedia AI Inc.</p>
      <span className="accent" />

      <p>This Privacy Policy explains how <strong>Inmedia AI Inc</strong> (“Inmedia AI,” “we,” “us,” or “our”), the operator of the <strong>OneTap Atelier</strong> platform, websites, and applications (collectively, the “Service”), collects, uses, discloses, and protects personal information. OneTap Atelier is a product of Inmedia AI Inc, and all rights in the Service are reserved by Inmedia AI Inc. By using the Service, you acknowledge the practices described here.</p>

      <h2>1. What OneTap Atelier is - and is not</h2>
      <p>OneTap Atelier is a technology platform that helps you see how apparel and accessories may look on you before you decide to buy them. <strong>Inmedia AI Inc does not design, manufacture, own, hold inventory of, or sell any clothing, footwear, accessories, or other merchandise.</strong> We are an independent technology intermediary - a curator and middleware layer - that surfaces pieces offered by third-party brands and retailers and generates illustrative visualizations (“Try-On Films”) for your personal review. All product names, trademarks, and brand imagery belong to their respective owners. Your purchases, if any, are made directly with third parties under their own terms and privacy policies. See our Terms of Service for the full statement of this relationship.</p>

      <h2>2. Information we collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li><strong>Contact and account data</strong> - name, email address, and the username and password you set.</li>
        <li><strong>Profile and preference data</strong> - the brands and categories you follow, sizes, style preferences, and similar inputs used to curate what you see.</li>
        <li><strong>Likeness Content</strong> - photographs, images, and video of yourself that you upload or capture so that we can generate your Try-On Films. This is treated as sensitive information (see Section 3).</li>
        <li><strong>Item inputs</strong> - product images, screenshots, or photographs of garments you wish to try on, and associated metadata.</li>
        <li><strong>Prompt and selection data</strong> - the scenes, settings, and choices you make within the Service.</li>
        <li><strong>Payment data</strong> - processed by our third-party payment processor (for example, <span className="ph">[Stripe]</span>) and not stored by us. We receive only limited transaction confirmation details.</li>
        <li><strong>Communications and feedback</strong> - messages you send us and support requests.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li><strong>Device and usage data</strong> - IP address, device and browser type, operating system, identifiers, pages viewed, and interactions, collected through cookies and similar technologies described in our <span className="ph">[Cookie Notice]</span>.</li>
        <li><strong>General location</strong> - approximate location derived from IP address.</li>
      </ul>
      <h3>Information from third parties</h3>
      <p>If you sign in through a third-party service (for example, an authentication provider), we receive the limited profile information that service makes available based on your settings.</p>

      <h2>3. Likeness and biometric information - notice and consent</h2>
      <p>To generate your Try-On Films, the Service processes images of you that you choose to provide. Depending on the technology used and applicable law, this processing may involve information that is considered <strong>sensitive personal information</strong> or a <strong>biometric identifier</strong> (such as a scan of facial or body geometry) under laws including the Illinois Biometric Information Privacy Act (BIPA) and comparable state laws.</p>
      <ul>
        <li><strong>Purpose.</strong> We process Likeness Content solely to create the Try-On Films you request and to operate the features you use. We do not use it to build identity profiles for any other purpose.</li>
        <li><strong>Consent.</strong> We collect, process, and store Likeness Content only after you provide your express, informed consent at the point of upload. You may decline, but the try-on features will not function without it.</li>
        <li><strong>No training without opt-in.</strong> We do <strong>not</strong> use your Likeness Content, item inputs, or Try-On Films to train, fine-tune, or develop artificial-intelligence models unless you give us separate, explicit opt-in consent. Opt-in is off by default and may be withdrawn at any time.</li>
        <li><strong>No sale, no disclosure.</strong> We do not sell, lease, trade, or profit from your Likeness Content or biometric information, and we do not disclose it except to the service providers that operate the Service on our behalf under written confidentiality obligations, or as required by law.</li>
        <li><strong>Retention and destruction.</strong> We retain Likeness Content and any biometric identifiers only as long as needed to provide the Service and then destroy them according to the schedule in Section 6 - and in any event within <span className="ph">[3 years]</span> of your last interaction with the Service, or sooner upon your request, consistent with applicable law.</li>
      </ul>

      <h2>4. How we use your information</h2>
      <ul>
        <li>To provide, operate, and secure the Service, including generating your curated edit and your Try-On Films.</li>
        <li>To personalize what we show you based on the brands and preferences on your account.</li>
        <li>To process your subscription and communicate with you about your account and the Service.</li>
        <li>To respond to support requests and improve the reliability and quality of the Service.</li>
        <li>To comply with law, enforce our Terms, and protect the rights, safety, and property of you, us, and others.</li>
      </ul>
      <p>We do <strong>not</strong> sell your personal information, and we do not use your content for advertising or marketing of the Service without your consent.</p>

      <h2>5. How AI generation works on the Service</h2>
      <p>Try-On Films are produced using automated image- and video-generation technology. Your Likeness Content and item inputs are processed - by us and by the specialized model and cloud providers we engage as service providers - for the limited time needed to produce your output. Try-On Films are <strong>illustrative estimates</strong>, not exact representations of any product, fit, colour, or material, and should not be relied upon as a guarantee of how an item will look, fit, or perform. We constrain our providers by contract to process your data only on our instructions and not for their own purposes.</p>

      <h2>6. Retention and deletion</h2>
      <ul>
        <li>You may remove uploaded content and Try-On Films from your account at any time. Removed content may persist on active servers for up to <span className="ph">[30 days]</span> and in encrypted backups for a limited additional period before being purged.</li>
        <li>If you close your account, your content becomes inaccessible promptly and is purged from our systems within <span className="ph">[90 days]</span>, except where retention is required for legal, security, tax, or dispute-resolution purposes.</li>
        <li>Backup copies are isolated from active processing pending deletion.</li>
      </ul>

      <h2>7. How we share information</h2>
      <table>
        <thead><tr><th>Recipient</th><th>Purpose</th></tr></thead>
        <tbody>
          <tr><td>Service providers / subprocessors</td><td>Cloud hosting, AI image and video generation, analytics, customer support, email delivery - bound by contract to act only on our instructions.</td></tr>
          <tr><td>Payment processor</td><td>To process your subscription. Card data is handled by the processor, not stored by us.</td></tr>
          <tr><td>Legal and safety</td><td>To comply with law, respond to lawful requests, and protect rights, safety, and property.</td></tr>
          <tr><td>Business transfers</td><td>In a merger, acquisition, financing, or sale of assets, subject to this Policy.</td></tr>
        </tbody>
      </table>
      <p>We do <strong>not</strong> sell or “share” your personal information for cross-context behavioral advertising, and we do not disclose your Likeness Content to third-party brands or retailers. Links to third-party brand or retailer sites are governed by those parties’ own privacy policies.</p>

      <h2>8. Security</h2>
      <p>We use technical, organizational, and physical safeguards designed to protect personal information. No method of transmission or storage is perfectly secure, and we cannot guarantee absolute security. We maintain procedures to address suspected data incidents and will notify you and regulators where required by law.</p>

      <h2>9. Your privacy rights</h2>
      <p>Depending on where you live, you may have rights under laws such as the California Consumer Privacy Act as amended by the CPRA, and the privacy laws of Virginia, Colorado, Connecticut, Utah, Texas, and other states. These may include the right to know or access, to correct, to delete, to obtain a portable copy, to opt out of sale or targeted advertising, and to limit the use of sensitive personal information.</p>
      <ul>
        <li><strong>We do not sell or share your personal information,</strong> and we do not use sensitive personal information beyond the purposes described here.</li>
        <li>To exercise a right, contact us at mitul@inmediaai.com. We will verify your identity before responding and will not discriminate against you for exercising a right.</li>
        <li>You may use an authorized agent to submit requests where permitted by law.</li>
        <li>If you are unsatisfied with our response, you may have the right to appeal or to contact your state regulator.</li>
      </ul>

      <h2>10. Children</h2>
      <p>The Service is intended only for adults <strong>18 years of age or older</strong>. We do not knowingly collect personal information from anyone under 18. If you believe a minor has provided us information, contact us at mitul@inmediaai.com and we will delete it as required by law.</p>

      <h2>11. International users</h2>
      <p>Inmedia AI Inc is based in the United States, and your information will be processed in the United States and other locations where we or our service providers operate, which may have different data-protection laws than your jurisdiction.</p>

      <h2>12. Changes to this Policy</h2>
      <p>We may update this Policy from time to time. Material changes will be indicated by updating the effective date and posting the revised Policy. Your continued use of the Service after changes take effect constitutes acceptance.</p>

      <h2>13. Contact us</h2>
      <p>Inmedia AI Inc - OneTap Atelier<br />
      mitul@inmediaai.com</p>

      <footer className="legal-foot">
        <div className="legal-nav">
          <Link href="/terms">Terms of Service</Link>
          <Link href="/">Return to OneTap Atelier</Link>
        </div>
        © 2026 Inmedia AI Inc. All rights reserved. OneTap Atelier is a product of Inmedia AI Inc. All trademarks and product imagery referenced on the Service are the property of their respective owners.
      </footer>
    </div>
  );
}
