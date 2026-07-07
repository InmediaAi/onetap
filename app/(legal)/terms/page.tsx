import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service - OneTap Atelier",
  description: "The terms governing your use of OneTap Atelier, a product of Inmedia AI Inc.",
};

export default function TermsPage() {
  return (
    <div className="wrap">
      <Link href="/" className="mark">OneTap Atelier</Link>

      <span className="eyebrow">Terms of Service</span>
      <h1>Terms of Service</h1>
      <p className="meta">Effective date: May 15, 2025 &nbsp;·&nbsp; OneTap Atelier is a product of Inmedia AI Inc.</p>
      <span className="accent" />

      <p>These Terms of Service (“Terms”) form a binding agreement between you and <strong>Inmedia AI Inc</strong> (“Inmedia AI,” “Company,” “we,” “us,” or “our”), the operator of the <strong>OneTap Atelier</strong> platform, websites, and applications (the “Service”). OneTap Atelier is a product of Inmedia AI Inc, and all rights in the Service are reserved by Inmedia AI Inc. By accessing or using the Service, you agree to these Terms and to our <Link href="/privacy">Privacy Policy</Link>. If you do not agree, do not use the Service.</p>

      <h2>1. Eligibility</h2>
      <p>You must be at least <strong>18 years old</strong> and able to form a binding contract to use the Service. The Service is not directed to and may not be used by anyone under 18.</p>

      <h2>2. What the Service is</h2>
      <p>The Service is a technology platform that curates apparel and accessories offered by third-party brands and retailers and generates illustrative visualizations (“Try-On Films”) showing how selected items may appear on you. The Service includes the OneTap Curator, 360° Try-On, and Atelier Scenes features. The Service is provided on a subscription basis as described in Section 4.</p>

      <h2>3. We do not own or sell merchandise - independent intermediary</h2>
      <p><strong>Inmedia AI Inc does not design, manufacture, own, stock, distribute, sell, or ship any clothing, footwear, accessories, or other merchandise.</strong> The Service is a curation and middleware layer only. Accordingly:</p>
      <ul>
        <li>All garments and products shown on the Service are offered by third parties. We do not hold title to, take possession of, or have control over any product, its price, its availability, its authenticity, or its sale.</li>
        <li>Any purchase you make is a transaction solely between you and the relevant third-party brand or retailer, governed by that party’s own terms, pricing, and policies. We are not a party to, and assume no responsibility for, those transactions.</li>
        <li>We make no representation or warranty regarding any third-party product, including its fit, quality, materials, authenticity, availability, or delivery.</li>
        <li><strong>No affiliation or endorsement.</strong> Reference to any brand, designer, retailer, or product name is for the sole purpose of identifying items you may wish to view, in their ordinary descriptive (nominative) sense. Such references do not imply any partnership, sponsorship, affiliation, authorization, or endorsement by or with those parties, and none should be inferred. All third-party trademarks, trade names, logos, and product imagery are the property of their respective owners.</li>
      </ul>

      <h2>4. Accounts, subscription, and billing</h2>
      <ul>
        <li>You are responsible for the accuracy of your account information and for safeguarding your credentials.</li>
        <li>The Service is offered on a subscription basis. The available plans and the number of Try-On Films included in each billing cycle are shown on our <Link href="/pricing">Pricing</Link> page and at sign-up. The plan you select and its included allowance are shown before you pay.</li>
        <li><strong>Automatic renewal.</strong> Your subscription renews automatically each cycle and your payment method is charged until you cancel. You may cancel at any time through your account; cancellation takes effect at the end of the current cycle. Where required by law (for example, California’s Automatic Renewal Law), we will provide the disclosures, consents, and cancellation mechanism that law requires.</li>
        <li>Payments are handled by our third-party payment processor, <strong>Razorpay</strong>. Fees are stated exclusive of taxes, which you are responsible for where applicable.</li>
        <li>Except where required by law, fees are non-refundable. Cancellation and the limited circumstances in which we refund are described in our <Link href="/refunds">Cancellation &amp; Refund Policy</Link>.</li>
      </ul>

      <h2>5. Your content and the rights you grant</h2>
      <p>“User Content” means anything you upload or submit, including images and video of yourself (“Likeness Content”) and item inputs. You retain ownership of your User Content. You grant Inmedia AI Inc a limited, worldwide, non-exclusive, royalty-free license to host, store, process, and modify your User Content solely as necessary to operate the Service and provide your Try-On Films. This license ends when you delete the content or close your account, except for copies retained as described in the <Link href="/privacy">Privacy Policy</Link>.</p>
      <p><strong>We do not use your User Content to train AI models without your separate, explicit opt-in consent</strong> (see the <Link href="/privacy">Privacy Policy</Link>).</p>
      <h3>Your representations and warranties</h3>
      <p>You represent and warrant that:</p>
      <ul>
        <li>You own or have all rights necessary to submit your User Content and to grant the license above.</li>
        <li>Any Likeness Content depicts <strong>you</strong>, or a person who has given you documented, informed consent to use their likeness; you will not upload images of any other person without such consent, and never of a minor.</li>
        <li>Your User Content does not infringe any intellectual-property, privacy, publicity, or other right, and does not violate any law.</li>
      </ul>
      <p>You are solely responsible for your User Content and for your use and distribution of any Try-On Film you create.</p>

      <h2>6. Try-On Films and generated outputs</h2>
      <ul>
        <li>Subject to these Terms, you may use the Try-On Films you generate for your own personal, non-commercial purposes. As between you and us, you own the outputs you create from your own Likeness Content, and we retain ownership of the Service and underlying technology.</li>
        <li>Try-On Films are <strong>AI-generated, illustrative estimates</strong>. They may be inaccurate and do not represent the actual fit, colour, texture, drape, or appearance of any product. They are not endorsed by, and do not originate from, any brand shown.</li>
        <li>You may not use Try-On Films to deceive, to imply a brand’s endorsement, to misrepresent a product as authentic or as your own design, or in any unlawful manner.</li>
      </ul>

      <h2>7. Acceptable use</h2>
      <p>You agree not to: upload another person’s likeness without consent; infringe any intellectual-property or other right; create content that is unlawful, defamatory, sexually explicit, or harmful; misrepresent affiliation with any brand; resell, scrape, reverse-engineer, or copy the Service; interfere with its operation or security; or use it for any purpose other than as intended.</p>

      <h2>8. Intellectual property</h2>
      <h3>Our property</h3>
      <p>The Service, including its software, models, design, text, the “OneTap Atelier” name and marks, and all related intellectual property, is owned by Inmedia AI Inc and protected by law. All rights are reserved by Inmedia AI Inc. We grant you a limited, revocable, non-transferable licence to use the Service in accordance with these Terms; no other rights are granted.</p>
      <h3>Third-party property</h3>
      <p>All other trademarks, names, logos, and product imagery referenced on or surfaced through the Service belong to their respective owners and are used only nominatively to identify items, as described in Section 3. We claim no ownership of, and no affiliation with, those marks or their owners.</p>
      <h3>Copyright complaints - DMCA notice and takedown</h3>
      <p>We respect intellectual-property rights and respond to notices of alleged infringement under the Digital Millennium Copyright Act (17 U.S.C. § 512). If you believe content on the Service infringes your copyright, send a written notice to our Designated Agent containing: (a) your signature; (b) identification of the copyrighted work; (c) identification of the allegedly infringing material and its location; (d) your contact information; (e) a statement of good-faith belief that the use is unauthorized; and (f) a statement, under penalty of perjury, that your notice is accurate and you are authorized to act.</p>
      <p><strong>Designated Copyright Agent:</strong> Inmedia AI Inc, <a href="mailto:mitul@inmediaai.com">mitul@inmediaai.com</a>.</p>
      <p>We will respond to valid notices, may remove or disable the material, will accommodate counter-notifications as the DMCA provides, and will <strong>terminate the accounts of repeat infringers</strong> in appropriate circumstances.</p>

      <h2>9. Third-party brands, retailers, and links</h2>
      <p>The Service may display information about, and link to, third-party brands and retailers. We do not control and are not responsible for third-party products, websites, content, prices, or practices. Your dealings with any third party are solely between you and that third party.</p>

      <h2>10. Disclaimers</h2>
      <p className="legal-caps">The Service, including all curated content and Try-On Films, is provided “as is” and “as available,” without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, accuracy, non-infringement, and any warranty regarding third-party products or the appearance, fit, or performance of any item. Inmedia AI Inc does not warrant that the Service will be uninterrupted, error-free, or that generated outputs will be accurate.</p>

      <h2>11. Limitation of liability</h2>
      <p className="legal-caps">To the maximum extent permitted by law, Inmedia AI Inc and its officers, employees, and agents will not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or any loss of profits, data, goodwill, or for any third-party products or transactions. Our total liability for any claim relating to the Service will not exceed the greater of the amount you paid us in the twelve months before the claim or one hundred U.S. dollars ($100).</p>

      <h2>12. Indemnification</h2>
      <p>You agree to indemnify, defend, and hold harmless Inmedia AI Inc and its affiliates from any claims, damages, losses, and expenses (including reasonable legal fees) arising out of your User Content, your use of the Service, your violation of these Terms, or your infringement of any third party’s rights - including any claim that your uploaded content or your use of any Try-On Film infringed intellectual-property, privacy, or publicity rights.</p>

      <h2>13. Dispute resolution; governing law</h2>
      <p>These Terms are governed by the laws of the State of <span className="ph">[State, e.g., Delaware]</span>, without regard to conflict-of-laws rules.</p>
      <div className="note"><strong style={{ color: "var(--ink)" }}>Optional - confirm with counsel.</strong> Many U.S. platforms include binding arbitration with a class-action waiver. Whether to include one, and how to draft the opt-out, are significant legal choices.</div>
      <p className="legal-caps">Except where prohibited, any dispute will be resolved by binding individual arbitration administered by <span className="ph">[arbitration body]</span> under its rules, and you and Inmedia AI Inc waive any right to a jury trial or to participate in a class action. You may opt out of arbitration within 30 days of first accepting these Terms by notifying us at <a href="mailto:mitul@inmediaai.com">mitul@inmediaai.com</a>. Claims that qualify may be brought in small-claims court.</p>

      <h2>14. Termination</h2>
      <p>You may stop using the Service and close your account at any time. We may suspend or terminate your access if you violate these Terms or to protect the Service or others. Sections that by their nature should survive termination - including ownership, disclaimers, limitation of liability, indemnification, and dispute resolution - survive.</p>

      <h2>15. Changes to these Terms</h2>
      <p>We may update these Terms from time to time. Material changes will be indicated by updating the effective date and posting the revised Terms. Your continued use of the Service after changes take effect constitutes acceptance.</p>

      <h2>16. Miscellaneous</h2>
      <p>These Terms and the <Link href="/privacy">Privacy Policy</Link> are the entire agreement between you and Inmedia AI Inc regarding the Service. If any provision is found unenforceable, the remainder stays in effect. Our failure to enforce a provision is not a waiver. You may not assign these Terms; we may assign them in connection with a merger, acquisition, or sale of assets. We are not liable for delays or failures caused by events beyond our reasonable control.</p>

      <h2>17. Contact</h2>
      <p>Inmedia AI Inc - OneTap Atelier<br />
      <a href="mailto:mitul@inmediaai.com">mitul@inmediaai.com</a></p>

      <footer className="legal-foot">
        <div className="legal-nav">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/refunds">Cancellation &amp; Refunds</Link>
          <Link href="/shipping">Shipping &amp; Delivery</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/">Return to OneTap Atelier</Link>
        </div>
        © 2026 Inmedia AI Inc. All rights reserved. OneTap Atelier is a product of Inmedia AI Inc. All trademarks and product imagery referenced on the Service are the property of their respective owners; reference to them does not imply affiliation or endorsement.
      </footer>
    </div>
  );
}
