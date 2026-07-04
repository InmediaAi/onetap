import "server-only";
import { createReadClient } from "@/lib/supabase/server";

/**
 * Admin-managed showcase clip URLs for the /partners "See your pieces in action"
 * section. Public read (createReadClient); set in /admin → Partners. Falls back
 * to [] when Supabase is unconfigured or the row is empty.
 */
export async function getPartnerShowcase(): Promise<string[]> {
  const db = createReadClient();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("partner_config")
      .select("showcase_urls")
      .eq("id", "default")
      .maybeSingle();
    if (error || !data) return [];
    const urls = (data.showcase_urls as string[] | null) ?? [];
    return urls.filter((u) => /^https?:\/\//i.test(u));
  } catch {
    return [];
  }
}
