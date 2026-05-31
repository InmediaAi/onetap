"use client";

import Link from "next/link";
import { ChevronDown, Search, User, Heart, ShoppingBag } from "lucide-react";
import { useAtelier } from "@/lib/store";
import { useHydrated } from "@/lib/useHydrated";
import PricingModal from "@/components/PricingModal";

export default function Header() {
  const hydrated = useHydrated();
  const count = useAtelier((s) => s.wishlist.length);
  const credits = useAtelier((s) => s.credits);
  const openPricing = useAtelier((s) => s.openPricing);

  return (
    <header className="topbar">
      <div className="topbar-row">
        <div className="tb-left">
          <span className="util label">
            <span className="ut-label">Membership</span>
            <span className="chev">
              <ChevronDown size={11} strokeWidth={1.6} />
            </span>
          </span>
        </div>

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
          <span className="ic" role="button" aria-label="Saved">
            <Heart size={17} strokeWidth={1.4} />
          </span>
          <span className="ic pill-count" role="button" aria-label="Bag">
            <ShoppingBag size={17} strokeWidth={1.4} />
            {hydrated && count > 0 && <span className="dot">{count}</span>}
          </span>
        </div>
      </div>

      <nav className="catnav">
        <div className="catnav-inner">
          <a onClick={openPricing}>
            Pricing
            <span className="credits-chip">
              {hydrated ? credits : "—"} credits
            </span>
          </a>
          <a>My Closet Looks</a>
        </div>
      </nav>

      <PricingModal />
    </header>
  );
}
