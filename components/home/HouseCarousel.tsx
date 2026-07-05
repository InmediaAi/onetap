"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import EditImg from "@/components/home/EditImg";
import { deriveMono } from "@/lib/supabase/util";
import type { HouseTile } from "@/lib/data/getHomeEditorial";

const INTERVAL = 2000; // advance one house every 2s

/**
 * Auto-advancing house carousel - shows 4 at a time (responsive), slides left
 * one house every 2s and loops seamlessly. Pauses on hover; the arrow advances
 * manually. Respects prefers-reduced-motion (no auto-advance).
 */
export default function HouseCarousel({ houses }: { houses: HouseTile[] }) {
  const n = houses.length;
  const loopable = n > 4; // only animate when there's more than a screenful
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const paused = useRef(false);

  // Auto-advance.
  useEffect(() => {
    if (!loopable) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!paused.current) setIndex((i) => i + 1);
    }, INTERVAL);
    return () => clearInterval(id);
  }, [loopable]);

  // Seamless wrap: once we've advanced a full set, snap back with no transition.
  useEffect(() => {
    if (index >= n && n > 0) {
      const t = setTimeout(() => {
        setAnimate(false);
        setIndex((i) => i - n);
      }, 650);
      return () => clearTimeout(t);
    }
    if (!animate) {
      const r = requestAnimationFrame(() => setAnimate(true));
      return () => cancelAnimationFrame(r);
    }
  }, [index, animate, n]);

  // Duplicate the set so the wrap has slides to show while snapping.
  const slides = loopable ? [...houses, ...houses] : houses;

  return (
    <div
      className="hc"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      <div className="hc-viewport">
        <div
          className={"hc-track" + (animate ? " anim" : "")}
          style={{ ["--i" as string]: String(index) }}
        >
          {slides.map((h, i) => (
            <Link key={`${h.name}-${i}`} href={h.href} className="hc-slide" aria-label={h.name}>
              <span className="hc-img">
                {h.image ? (
                  <EditImg src={h.image} alt="" className="hc-img-el" />
                ) : (
                  <span className="hc-mono" aria-hidden="true">
                    {deriveMono(h.name)}
                  </span>
                )}
              </span>
              <span className="hc-name">{h.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {loopable && (
        <button
          className="hc-next"
          type="button"
          onClick={() => setIndex((i) => i + 1)}
          aria-label="Next houses"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
