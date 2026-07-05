import { Newsreader } from "next/font/google";
import "./legal.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

/** Shared shell for the legal documents (/terms, /privacy) - light theme,
    scoped under .legal-doc so it never touches the dark product theme. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return <div className={`legal-doc ${newsreader.variable}`}>{children}</div>;
}
