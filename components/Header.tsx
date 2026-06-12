"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User, Images } from "lucide-react";
import PricingModal from "@/components/PricingModal";
import SignInModal from "@/components/SignInModal";

const NAV: { href: string; label: string; accent?: boolean }[] = [
  { href: "/curator", label: "OneTap Curator" },
  { href: "/tryon", label: "OneTap 360° TryOn" },
  { href: "/creator", label: "OneTap Creator" },
  { href: "/pricing", label: "Pricing" },
  { href: "/fifa", label: "FIFA 2026 Viral Fan", accent: true },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="tb-left" />

        <Link href="/" className="wordmark brand">
          OneTap Atelier
        </Link>

        <div className="tb-right">
          <span className="ic label" role="button" aria-label="Search">
            <Search size={16} strokeWidth={1.4} />
            <span className="label ut-label">Search</span>
          </span>
          <Link href="/closet" className="ic" aria-label="My closet">
            <Images size={17} strokeWidth={1.4} />
          </Link>
          <Link href="/profile" className="ic" aria-label="Profile">
            <User size={17} strokeWidth={1.4} />
          </Link>
        </div>
      </div>

      <nav className="catnav">
        <div className="catnav-inner">
          {NAV.map(({ href, label, accent }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${active ? "on" : ""}${accent ? " fifa-tab" : ""}`.trim()}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <PricingModal />
      <SignInModal />
    </header>
  );
}
