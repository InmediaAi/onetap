"use client";

import { useEffect, useState } from "react";
import {
  computeMembershipOffer,
  BASELINE_OFFER,
  type MembershipOffer,
} from "@/lib/pricing/membershipOffer";

/**
 * Founding-members scarcity meter (pricing hook). Renders a progress bar whose
 * fill = "booked %" with a marker showing how many of the 1,000 are sold. The
 * numbers are a hard-coded monthly curve (see lib/pricing/membershipOffer) —
 * not real subscription data.
 */
export default function PricingUrgency() {
  // Start from the 60% baseline (identical on server + first paint → no
  // hydration mismatch); resolve the real day's value after mount and animate.
  const [offer, setOffer] = useState<MembershipOffer>(BASELINE_OFFER);
  useEffect(() => setOffer(computeMembershipOffer(new Date())), []);

  const { bookedPct, remainingPct, sold, total } = offer;
  const markerLeft = Math.min(95, Math.max(5, bookedPct));

  return (
    <div className="price-offer" role="note">
      <p className="po-head">
        Only {total.toLocaleString()} memberships available this month.
      </p>

      <div
        className="po-track"
        role="progressbar"
        aria-valuenow={bookedPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${sold.toLocaleString()} of ${total.toLocaleString()} memberships booked`}
      >
        <span className="po-fill" style={{ width: `${bookedPct}%` }} />
        <span className="po-marker" style={{ left: `${markerLeft}%` }}>
          <span className="po-count">{sold.toLocaleString()} Sold</span>
          <span className="po-pin" aria-hidden="true" />
        </span>
      </div>

      <div className="po-labels">
        <span>Booked {bookedPct}%</span>
        <span>Remaining {remainingPct}%</span>
      </div>
    </div>
  );
}
