"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, User } from "lucide-react";

const MODULES = [
  { label: "OneTap Curator", href: "/curator" },
  { label: "OneTap 360° TryOn", href: "/tryon-360" },
  { label: "OneTap Creator", href: "/creator" },
  { label: "Pricing", href: "/pricing" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="mx-auto max-w-editorial px-6 py-5 md:px-10">
        {/* Top row — logo centered, actions right */}
        <div className="flex items-center justify-between">
          <div className="flex-1" />

          <Link
            href="/"
            className="flex-1 text-center font-display text-xl tracking-[0.22em] md:text-2xl"
          >
            ONETAP <span className="italic">Atelier</span>
          </Link>

          <div className="flex flex-1 items-center justify-end gap-5">
            <button aria-label="Search" className="text-ink transition-opacity hover:opacity-60">
              <Search size={18} strokeWidth={1.5} />
            </button>
            <Link
              href="/onboarding"
              aria-label="Profile"
              className="text-ink transition-opacity hover:opacity-60"
            >
              <User size={18} strokeWidth={1.5} />
            </Link>
          </div>
        </div>

        {/* Module tabs — centered beneath the logo */}
        <nav className="mt-4 flex items-center justify-center gap-6 md:gap-10">
          {MODULES.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap text-[11px] uppercase tracking-luxe transition-colors hover:text-ink md:text-[12px] ${
                  active ? "text-ink" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
