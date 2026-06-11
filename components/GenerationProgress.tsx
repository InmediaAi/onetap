"use client";

import { useEffect, useState } from "react";

/**
 * Aesthetic generation progress for the long try-on / 360° / film calls.
 *
 * The providers don't report real progress, so the bar EASES toward a per-phase
 * ceiling (always moving, never "finishing" early) while atelier copy cycles to
 * keep the wait engaging. `compact` renders a bottom overlay (e.g. over the
 * try-on still while the 360° films); otherwise it fills the stage.
 */

type Phase = "tryon" | "spin" | "video";

const COPY: Record<Phase, { sub: string; lines: string[] }> = {
  tryon: {
    sub: "Tailoring the piece to you",
    lines: [
      "Reading the piece",
      "Studying your likeness",
      "Draping the fabric",
      "Pinning the silhouette",
      "Composing the fitting",
    ],
  },
  spin: {
    sub: "Filming your 360°",
    lines: [
      "Setting the studio light",
      "Cueing the slow turn",
      "Filming the 360°",
      "Steadying the frame",
      "Colour-grading the reel",
    ],
  },
  video: {
    sub: "Directing your film",
    lines: [
      "Blocking the scene",
      "Setting the light",
      "Rolling camera",
      "Catching the movement",
      "Colour-grading the cut",
    ],
  },
};

// [floor, ceiling] the eased bar travels between for each phase.
const RANGE: Record<Phase, [number, number]> = {
  tryon: [8, 60],
  spin: [60, 96],
  video: [10, 96],
};

export default function GenerationProgress({
  phase,
  compact = false,
  copy,
}: {
  phase: Phase;
  compact?: boolean;
  /** Override the per-phase copy (e.g. campaign wording); defaults to atelier copy. */
  copy?: Partial<Record<Phase, { sub: string; lines: string[] }>>;
}) {
  const [floor, ceil] = RANGE[phase];
  const { sub, lines } = { ...COPY[phase], ...copy?.[phase] };
  const [pct, setPct] = useState(floor);
  const [line, setLine] = useState(0);

  // Ease toward the ceiling — fast at first, slowing as it approaches.
  useEffect(() => {
    setPct((p) => Math.max(p, floor));
    const id = setInterval(() => {
      setPct((p) => (p >= ceil ? ceil : p + Math.max(0.2, (ceil - p) * 0.03)));
    }, 160);
    return () => clearInterval(id);
  }, [phase, floor, ceil]);

  // Cycle the status copy.
  useEffect(() => {
    setLine(0);
    const id = setInterval(() => setLine((l) => (l + 1) % lines.length), 2600);
    return () => clearInterval(id);
  }, [phase, lines.length]);

  return (
    <div className={"genprog" + (compact ? " compact" : "")}>
      {!compact && (
        <div className="genprog-weave" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} style={{ animationDelay: `${i * 0.11}s` }} />
          ))}
        </div>
      )}
      <div className="genprog-line" key={line}>
        {lines[line]}
      </div>
      <div className="genprog-sub">{sub}</div>
      <div className="genprog-track">
        <div className="genprog-fill" style={{ width: `${pct}%` }} />
      </div>
      {!compact && (
        <div className="genprog-note">A few moments — every stitch by hand.</div>
      )}
    </div>
  );
}
