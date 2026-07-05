import Link from "next/link";
import EditImg from "@/components/home/EditImg";
import type { OccasionTile } from "@/lib/data/getHomeEditorial";

/**
 * "Editor's picks - By trending occasions for you": large rectangular image
 * tiles with the title + description below, linking to the Curator filtered by
 * that occasion. Content (image/title/description) is admin-managed with an
 * auto-derived fallback. Server-rendered; the reveal observer animates them.
 */
export default function OccasionEdits({ tiles }: { tiles: OccasionTile[] }) {
  if (!tiles.length) return null;

  return (
    <section className="lp-edits">
      <div className="ed-head reveal">
        <span className="eyebrow">Editor’s picks</span>
        <h2>By trending occasions, for you</h2>
      </div>

      <div className="tocc-grid">
        {tiles.map((t) => (
          <Link key={t.title} href={t.href} className="tocc-card reveal">
            <span className="tocc-img">
              {t.image && <EditImg src={t.image} alt="" className="tocc-img-el" />}
              <span className="tocc-overlay">
                <span className="tocc-title">{t.title}</span>
                <span className="tocc-cta">Start exploring →</span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
