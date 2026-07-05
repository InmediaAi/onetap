"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Images } from "lucide-react";
import PricingModal from "@/components/PricingModal";
import SignInModal from "@/components/SignInModal";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";

const NAV: { href: string; label: string; accent?: boolean }[] = [
  { href: "/curator", label: "OneTap Curator" },
  { href: "/tryon", label: "OneTap 360° TryOn" },
  { href: "/creator", label: "OneTap Creator" },
  { href: "/pricing", label: "Pricing" },
  { href: "/fifa", label: "FIFA 2026 Viral Fan", accent: true },
];

export default function Header() {
  const pathname = usePathname();
  const hydrated = useHydrated();
  const lookCount = useAtelier((s) => s.looks.length);
  const closetSeen = useAtelier((s) => s.closetSeen);
  // Unseen looks since the last closet visit — nudges new users to their looks.
  const unseen = hydrated ? Math.max(0, lookCount - closetSeen) : 0;

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="tb-left" />

        <Link href="/" className="wordmark brand">
          OneTap Atelier
        </Link>

        <div className="tb-right">
          <Link
            href="/closet"
            className={"ic ic-closet" + (unseen > 0 ? " has-new" : "")}
            aria-label={unseen > 0 ? `My closet — ${unseen} new` : "My closet"}
          >
            <span className="ic-closet-ic">
              <Images size={17} strokeWidth={1.4} />
              {unseen > 0 && (
                <span className="ic-badge" aria-hidden="true">
                  {unseen > 9 ? "9+" : unseen}
                </span>
              )}
            </span>
            <span className="label ut-label">My Closet</span>
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
