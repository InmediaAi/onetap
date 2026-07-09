"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useAtelier } from "@/lib/store";

/**
 * Post-payment overlay. After a captured Razorpay payment, checkout.ts drives the
 * store `paymentFlow` (settling → success | error) while it polls for webhook
 * activation. This renders the on-brand light popup for all three phases. Global
 * (mounted in the root layout) so it covers BOTH the /pricing page and the
 * try-on paywall modal, and survives navigation while settling.
 */

// Deterministic confetti (no Math.random → no hydration mismatch). A refined,
// mostly-monochrome burst with a few brand-orange + green accents.
const CONFETTI = Array.from({ length: 16 }, (_, i) => {
  const colors = ["#111111", "#F37021", "#1e8e5a", "#c9c9c9"];
  return {
    left: 6 + (i * 88) / 15, // spread 6%..94%
    delay: (i % 6) * 0.06,
    duration: 1.5 + (i % 5) * 0.18,
    rotate: (i % 2 ? 1 : -1) * (120 + (i % 4) * 80),
    color: colors[i % colors.length],
    round: i % 3 === 0,
  };
});

export default function MembershipCelebration() {
  const flow = useAtelier((s) => s.paymentFlow);
  const closeFlow = useAtelier((s) => s.closePaymentFlow);
  const closePricing = useAtelier((s) => s.closePricing);
  const refreshProfile = useAtelier((s) => s.refreshProfile);
  const paymentSettled = useAtelier((s) => s.paymentSettled);
  const reduce = useReducedMotion();

  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const { phase, kind, unlocked, planName, message } = flow;
  const open = phase !== "idle";

  const n = unlocked ?? 0;
  const unit = n === 1 ? "try-on" : "try-ons";
  const successLine =
    kind === "topup" ? `You've added ${n} ${unit}.` : `You've unlocked ${n} ${unit}.`;

  const dismiss = () => {
    closeFlow();
    closePricing();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProfile();
      const u = useAtelier.getState().usage;
      if (kind === "subscription" && u.status === "active") {
        paymentSettled(u.videoLimit, u.planName);
      } else if (kind === "topup") {
        // Balance already reflects if the webhook landed; just dismiss.
        dismiss();
      }
      // otherwise: stay in the error state so the user can retry / contact us.
    } finally {
      setRefreshing(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="mship-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          // Only allow click-to-dismiss once it's a terminal (non-settling) state.
          onMouseDown={(e) => {
            if (phase !== "settling" && (e.target as HTMLElement).classList.contains("mship-scrim"))
              dismiss();
          }}
          role="dialog"
          aria-modal="true"
          aria-live="polite"
        >
          <motion.div
            className="mship-card"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {phase === "settling" && (
              <>
                <div className="mship-loader" aria-hidden="true">
                  <span className="mship-ring" />
                  <span className="mship-dots">
                    <i /><i /><i />
                  </span>
                </div>
                <h2 className="mship-title">Updating your membership status</h2>
                <p className="mship-sub">This only takes a moment.</p>
              </>
            )}

            {phase === "success" && (
              <>
                {!reduce && (
                  <div className="mship-confetti" aria-hidden="true">
                    {CONFETTI.map((c, i) => (
                      <span
                        key={i}
                        className={"mship-confetti-piece" + (c.round ? " round" : "")}
                        style={{
                          left: `${c.left}%`,
                          background: c.color,
                          animationDelay: `${c.delay}s`,
                          animationDuration: `${c.duration}s`,
                          // @ts-expect-error CSS var for the keyframe rotation
                          "--r": `${c.rotate}deg`,
                        }}
                      />
                    ))}
                  </div>
                )}
                <div className="mship-badge success" aria-hidden="true">
                  <svg viewBox="0 0 52 52">
                    <circle className="mship-badge-circle" cx="26" cy="26" r="24" />
                    <path className="mship-badge-mark" d="M15 27 l7 7 l15 -16" />
                  </svg>
                </div>
                <h2 className="mship-title">Congratulations</h2>
                <p className="mship-line">{successLine}</p>
                {kind !== "topup" && planName && (
                  <p className="mship-sub">Welcome to {planName}.</p>
                )}
                <button className="mship-btn" onClick={dismiss}>
                  Continue
                </button>
              </>
            )}

            {phase === "error" && (
              <>
                <div className="mship-badge error" aria-hidden="true">
                  <svg viewBox="0 0 52 52">
                    <circle className="mship-badge-circle" cx="26" cy="26" r="24" />
                    <path className="mship-badge-mark" d="M18 18 l16 16 M34 18 l-16 16" />
                  </svg>
                </div>
                <h2 className="mship-title">We couldn&rsquo;t confirm your membership</h2>
                <p className="mship-sub">
                  {message ||
                    "If you were charged, your membership will update shortly and we'll email you."}
                </p>
                <div className="mship-actions">
                  <button className="mship-btn" onClick={onRefresh} disabled={refreshing}>
                    {refreshing ? "Checking…" : "Refresh"}
                  </button>
                  <button className="mship-btn ghost" onClick={dismiss} disabled={refreshing}>
                    Close
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
