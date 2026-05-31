/**
 * Onboarding left panel — an auto-scrolling masonry of sample try-on reels
 * (columns drift up/down on a loop). Decorative only.
 */

const SHOT = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&q=80`;

// Editorial / fashion shots already referenced elsewhere in the app.
const SHOTS = [
  "1539109136881-3be0616acf4b",
  "1591047139829-d91aecb6caea",
  "1434389677669-e08b4cac3105",
  "1594633312681-425c7b97ccd1",
  "1485231183945-fffde7cc051e",
  "1595777457583-95e059d581b8",
  "1487222477894-8943e31ef7b2",
  "1490481651871-ab68de25d43d",
  "1483985988355-763728e1935b",
].map(SHOT);

// Three columns, each drifting; middle column runs the opposite direction.
const COLUMNS = [
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
].map((idx) => idx.map((i) => SHOTS[i]));

export default function ReelsWall() {
  return (
    <div className="ob-reels" aria-hidden="true">
      <div className="reels">
        {COLUMNS.map((col, ci) => (
          <div
            key={ci}
            className={"reel-col" + (ci % 2 === 1 ? " down" : "")}
            style={{ animationDuration: `${40 + ci * 7}s` }}
          >
            {/* doubled for a seamless -50% loop */}
            {[...col, ...col].map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" loading="lazy" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
