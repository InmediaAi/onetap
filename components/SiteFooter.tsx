import Link from "next/link";

export default function SiteFooter() {
  return (
    <footer className="foot">
      <div className="foot-inner">
        <span className="wordmark">OneTap Atelier</span>
        <div className="fmeta">
          <Link href="/brands" className="label flink">Brands</Link>
          <Link href="/privacy" className="label flink">Privacy</Link>
          <Link href="/terms" className="label flink">Terms</Link>
          <span className="label">Confidential — By Invitation</span>
          <span className="label">&copy; MMXXVI</span>
        </div>
      </div>
    </footer>
  );
}
