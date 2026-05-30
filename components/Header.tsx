"use client";

import Link from "next/link";
import { Search, User } from "lucide-react";

const NAV = ["New In", "The Edit", "Designers", "Atelier"];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-editorial items-center justify-between px-6 py-5 md:px-10">
        <nav className="hidden flex-1 items-center gap-8 md:flex">
          {NAV.map((item) => (
            <Link
              key={item}
              href="/"
              className="text-[12px] uppercase tracking-luxe text-muted transition-colors hover:text-ink"
            >
              {item}
            </Link>
          ))}
        </nav>

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
    </header>
  );
}
