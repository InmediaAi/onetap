import "server-only";
import crypto from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Google Search Console → keyword_queue feedback loop. Pulls Search Analytics
 * via a Google SERVICE ACCOUNT (JWT signed with node:crypto — no googleapis dep)
 * and queues "opportunity" queries (real impressions, ranking on page 1-2 but not
 * top) as topics for the draft pipeline. Env-gated → no-op when unconfigured.
 *
 * Setup: create a GCP service account, add its email as a user on the GSC
 * property, and set GSC_CLIENT_EMAIL / GSC_PRIVATE_KEY / GSC_SITE_URL.
 */

const CLIENT_EMAIL = process.env.GSC_CLIENT_EMAIL;
const PRIVATE_KEY = (process.env.GSC_PRIVATE_KEY || "").replace(/\\n/g, "\n");
const SITE_URL = process.env.GSC_SITE_URL; // e.g. "sc-domain:onetapatelier.com"

export function isGscConfigured(): boolean {
  return Boolean(CLIENT_EMAIL && PRIVATE_KEY && SITE_URL);
}

const b64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

function makeJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(
    JSON.stringify({
      iss: CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claim}`;
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(PRIVATE_KEY);
  return `${signingInput}.${b64url(signature)}`;
}

async function accessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: makeJwt(),
    }),
  });
  if (!res.ok) throw new Error(`GSC token ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error("GSC token: no access_token");
  return j.access_token;
}

function isoDay(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

/**
 * Ingest opportunity queries into keyword_queue. "Opportunity" = enough
 * impressions, ranking roughly page 1-2 (position 5-20) — where fresh content
 * can lift rankings. Returns how many new terms were queued.
 */
export async function ingestGsc(opts?: {
  minImpressions?: number;
  minPos?: number;
  maxPos?: number;
}): Promise<{ ok: boolean; queued?: number; skipped?: string }> {
  if (!isGscConfigured()) return { ok: false, skipped: "GSC not configured" };
  const db = createServiceClient();
  if (!db) return { ok: false, skipped: "Supabase not configured" };

  const minImpr = opts?.minImpressions ?? 20;
  const minPos = opts?.minPos ?? 5;
  const maxPos = opts?.maxPos ?? 20;

  const token = await accessToken();
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL!)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        startDate: isoDay(-28),
        endDate: isoDay(-1),
        dimensions: ["query"],
        rowLimit: 250,
      }),
    },
  );
  if (!res.ok) throw new Error(`GSC query ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as { rows?: GscRow[] };

  const opportunities = (data.rows ?? []).filter(
    (r) => r.impressions >= minImpr && r.position >= minPos && r.position <= maxPos,
  );

  if (opportunities.length === 0) return { ok: true, queued: 0 };

  const rows = opportunities.map((r) => ({
    term: r.keys[0],
    intent: "gsc opportunity",
    source: "gsc" as const,
    status: "queued" as const,
    metrics: {
      impressions: r.impressions,
      clicks: r.clicks,
      ctr: r.ctr,
      position: r.position,
    },
  }));

  // ignoreDuplicates → don't reset a term that's already drafted/published.
  const { error } = await db
    .from("keyword_queue")
    .upsert(rows, { onConflict: "term", ignoreDuplicates: true });
  if (error) throw new Error(error.message);

  return { ok: true, queued: rows.length };
}
