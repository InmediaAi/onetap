import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase clients, mirroring the env-driven mock fallback in lib/ai/index.ts:
 * when keys are absent the app runs entirely on the mock catalog. Callers
 * receive `null` and fall back rather than crashing.
 *
 * - read client  → anon key, only the public-read RLS SELECT is permitted.
 * - service client → service-role key, bypasses RLS for admin writes. Never
 *   import this from a client component; it is server-only.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** True when read access (anon) is configured. */
export function isSupabaseConfigured() {
  return Boolean(url && anonKey);
}

/** Read-only client (anon). Returns null when unconfigured → caller uses mock. */
export function createReadClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

/** Write client (service role). Returns null when unconfigured. */
export function createServiceClient(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
