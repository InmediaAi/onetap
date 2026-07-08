import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { enforceRateLimit, LIMITS } from "@/lib/security/rateLimit";

export const runtime = "nodejs";

const str = (v: unknown, max: number) =>
  (typeof v === "string" ? v.trim() : "").slice(0, max);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public partner-enquiry submission (from /partners). Validates, drops obvious
 * bots via a honeypot, and stores the lead via the service role (RLS allows
 * insert-only; reads happen in /admin). Body:
 *   { name, email, company, message?, website? (honeypot) }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Honeypot - real users never see/fill this. Pretend success (don't tip off bots).
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  // Per-IP throttle on top of the honeypot to blunt spam floods.
  const limited = await enforceRateLimit(req, LIMITS.partners);
  if (limited) return limited;

  const name = str(body.name, 200);
  const email = str(body.email, 200);
  const company = str(body.company, 200);
  const message = str(body.message, 4000);

  if (!name || !email || !company) {
    return NextResponse.json(
      { error: "Name, work email and company are required." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const db = createServiceClient();
  if (!db) {
    return NextResponse.json(
      { error: "We couldn't record that right now - please email us directly." },
      { status: 503 },
    );
  }

  const { error } = await db.from("partner_leads").insert({
    name,
    email,
    company,
    message: message || null,
    source_url: str(body.sourceUrl, 500) || null,
  });
  if (error) {
    return NextResponse.json({ error: "Something went wrong - please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
