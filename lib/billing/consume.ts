import "server-only";
import { createServerSupabase, isAuthConfigured } from "@/lib/supabase/ssr-server";

/**
 * Server-authoritative video quota. Reserve ONE video before generating; refund
 * if the provider call fails afterward.
 *
 * - Auth NOT configured → { skip:true } so zero-config mock dev keeps working.
 * - Auth configured but no user → { needAuth:true } → the route returns 401
 *   (sign-in required). Closes the bypass where a logged-out direct API call
 *   would otherwise skip the limit.
 * - Authenticated → consume_video() → { ok } / { ok:false } (limit reached).
 */

export type ReserveResult =
  | { skip: true }
  | { needAuth: true }
  | { ok: true; source: string }
  | { ok: false };

export async function reserveVideo(): Promise<ReserveResult> {
  if (!isAuthConfigured()) return { skip: true };
  const sb = await createServerSupabase();
  if (!sb) return { skip: true };
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return { needAuth: true }; // auth configured + logged out → block

  const { data, error } = await sb.rpc("consume_video");
  if (error) return { skip: true }; // RPC missing / DB error → fail open in dev
  if (data?.ok) return { ok: true, source: data.source as string };
  return { ok: false };
}

export async function refundVideo(source: string): Promise<void> {
  try {
    const sb = await createServerSupabase();
    if (!sb) return;
    await sb.rpc("refund_video", { p_source: source });
  } catch {
    // best-effort; a stray reserved unit self-corrects on the next period reset
  }
}
