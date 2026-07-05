import Link from "next/link";
import HouseCarousel from "@/components/home/HouseCarousel";
import type { HouseTile } from "@/lib/data/getHomeEditorial";

/**
 * "Editor's picks - By your favourite top houses": an auto-swiping carousel of
 * houses (4 visible, advancing every 2s). Content is admin-managed with an
 * auto-derived fallback (top houses by catalogue depth).
 */
export default function HouseEdits({ houses }: { houses: HouseTile[] }) {
  if (!houses.length) return null;

  return (
    <section className="lp-edits">
      <div className="ed-head reveal">
        <span className="eyebrow">Editor’s picks</span>
        <h2>By your favourite top houses</h2>
      </div>

      <div className="reveal">
        <HouseCarousel houses={houses} />
      </div>

      <div className="ed-more reveal">
        <Link href="/brands" className="lp-quiet">
          See all houses →
        </Link>
      </div>
    </section>
  );
}
