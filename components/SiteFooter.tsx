import Link from "next/link";

/** Social links keep the real profile URLs; icons follow the footer reference. */
const SOCIALS: { label: string; href: string; svg: React.ReactNode }[] = [
  {
    label: "Instagram",
    href: "https://www.instagram.com/onetapatelier/",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
        <circle cx="12" cy="12" r="4.4" />
        <circle cx="17.6" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61572123523611",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        <path d="M15.5 3.2h-2.3c-2.1 0-3.5 1.4-3.5 3.6v2.4H7.2v3h2.5v8.6h3.1v-8.6h2.6l.4-3h-3v-2c0-.8.3-1.2 1.2-1.2h1.5v-2.8z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com/OnetapAtelier",
    svg: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M4 4l16 16M20 4L4 20" />
      </svg>
    ),
  },
];

export default function SiteFooter() {
  return (
    <footer className="foot" role="contentinfo">
      <div className="foot-watermark" aria-hidden="true">
        OneTap Atelier
      </div>

      <div className="foot-inner">
        <div className="foot-top">
          <Link href="/" className="foot-wordmark">
            OneTap Atelier
          </Link>

          <nav className="foot-columns" aria-label="Footer">
            <div className="foot-col">
              <h3>The Atelier</h3>
              <ul>
                <li>
                  <Link href="/brands">Brands</Link>
                </li>
                <li>
                  <Link href="/pricing">Membership</Link>
                </li>
                <li>
                  <Link href="/partners">Partner With Us</Link>
                </li>
                <li>
                  <Link href="/about">About Us</Link>
                </li>
              </ul>
            </div>
            <div className="foot-col">
              <h3>Notes</h3>
              <ul>
                <li>
                  <Link href="/privacy">Privacy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms</Link>
                </li>
                <li>
                  <Link href="/refunds">Cancellation &amp; Refunds</Link>
                </li>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="foot-bottom">
          <p className="foot-legal">
            <span className="foot-maison">OneTap Atelier</span>, by Inmedia AI Inc.
            <br />
            &copy; Inmedia AI Inc. All rights reserved.
          </p>

          <div className="foot-social">
            {SOCIALS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`OneTap Atelier on ${s.label}`}
              >
                {s.svg}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
