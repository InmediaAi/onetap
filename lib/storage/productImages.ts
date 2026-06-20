import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Capture product images into a public Supabase bucket at admin-save time, so
 * try-on generation always pulls a stable Supabase CDN URL instead of a
 * retailer's hotlink-protected source (e.g. Versace's demandware CDN returns
 * 403 to header-less server fetches, breaking the garment download). The
 * download here sends browser-like headers to get past that bot protection.
 *
 * Best-effort: if a source can't be captured, the original URL is kept and
 * reported via `failed` — saving never blocks on it.
 */

const BUCKET = "product-images";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function extFor(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("avif")) return "avif";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

/** True when the URL already points at our own product-images bucket. */
function isOwnStorageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(base) && url.includes(`${base}/storage/v1/object/public/${BUCKET}/`);
}

/** Download with browser headers. null unless it's a real image response. */
async function fetchImageBytes(
  url: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    let referer: string | undefined;
    try {
      referer = `${new URL(url).origin}/`;
    } catch {
      /* leave unset */
    }
    const res = await fetch(url, {
      headers: { ...BROWSER_HEADERS, ...(referer ? { Referer: referer } : {}) },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const contentType = (res.headers.get("content-type") || "").split(";")[0].trim();
    if (!contentType.startsWith("image/")) return null; // HTML block-page etc.
    return { bytes: Buffer.from(await res.arrayBuffer()), contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Re-host each image URL into the public bucket under `<id>/<index>.<ext>`.
 * Returns the resolved URLs (Supabase URL on success, original on failure) and
 * the list of sources that couldn't be captured.
 */
export async function persistProductImages(
  urls: string[],
  id: string,
): Promise<{ images: string[]; failed: string[] }> {
  const db = createServiceClient();
  if (!db) return { images: urls, failed: [] }; // unconfigured → keep originals

  const failed: string[] = [];
  const images = await Promise.all(
    urls.map(async (url, idx) => {
      if (!/^https?:\/\//i.test(url) || isOwnStorageUrl(url)) return url;
      const got = await fetchImageBytes(url);
      if (!got) {
        failed.push(url);
        return url;
      }
      const path = `${id}/${idx}.${extFor(got.contentType)}`;
      const up = await db.storage
        .from(BUCKET)
        .upload(path, got.bytes, { contentType: got.contentType, upsert: true });
      if (up.error) {
        failed.push(url);
        return url;
      }
      return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }),
  );

  return { images, failed };
}
