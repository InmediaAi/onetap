"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User } from "lucide-react";
import PricingModal from "@/components/PricingModal";

const NAV = [
  { href: "/", label: "OneTap Curator" },
  { href: "/tryon", label: "OneTap 360° TryOn" },
  { href: "/creator", label: "OneTap Creator" },
  { href: "/pricing", label: "Pricing" },
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
          <Link href="/onboarding" className="ic" aria-label="Profile">
            <User size={17} strokeWidth={1.4} />
          </Link>
        </div>
      </div>

      <nav className="catnav">
        <div className="catnav-inner">
          {NAV.map(({ href, label }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={active ? "on" : ""}>
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      <PricingModal />
    </header>
  );
}
