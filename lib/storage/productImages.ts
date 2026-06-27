import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Capture product images into a public Supabase bucket at admin-save time, so
 * try-on generation always pulls a stable Supabase CDN URL instead of a
 * retailer's hotlink-protected source.
 *
 * Many retailer CDNs (e.g. Versace's demandware/Salesforce Commerce) block our
 * serverless egress IP outright — browser headers alone don't help. So we try a
 * direct headered fetch first, then fall back to an image proxy (default
 * images.weserv.nl) which fetches from its own clean IPs and re-serves the image.
 * IMAGE_PROXY_TEMPLATE is env-swappable to a paid scraping API for hard cases.
 *
 * Best-effort: if a source can't be captured, the original URL is kept and
 * reported via `failed` — saving never blocks on it. Admins can also upload the
 * image file directly (see /api/admin/upload-image) as a guaranteed fallback.
 */

const BUCKET = "product-images";

// `{url}` is replaced with the URL-encoded source. weserv re-serves the image
// from its own infrastructure, so retailer IP/hotlink blocks don't apply.
const IMAGE_PROXY_TEMPLATE =
  process.env.IMAGE_PROXY_TEMPLATE || "https://images.weserv.nl/?url={url}";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Dest": "image",
  "Sec-Fetch-Mode": "no-cors",
  "Sec-Fetch-Site": "cross-site",
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

/** One fetch attempt → image bytes, or null unless it's a real image response. */
async function fetchOnce(
  target: string,
  headers: Record<string, string>,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(target, { headers, redirect: "follow", signal: controller.signal });
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

/** Download an image: direct (browser headers) first, then via the proxy. */
async function fetchImageBytes(
  url: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  let referer: string | undefined;
  try {
    referer = `${new URL(url).origin}/`;
  } catch {
    /* leave unset */
  }

  // 1) direct — works for permissive hosts (incl. our own Supabase URLs).
  const direct = await fetchOnce(url, {
    ...BROWSER_HEADERS,
    ...(referer ? { Referer: referer } : {}),
  });
  if (direct) return direct;

  // 2) proxy fallback — beats IP/hotlink blocks (Versace demandware, etc.).
  if (IMAGE_PROXY_TEMPLATE) {
    const proxied = IMAGE_PROXY_TEMPLATE.replace("{url}", encodeURIComponent(url));
    const viaProxy = await fetchOnce(proxied, {
      "User-Agent": BROWSER_HEADERS["User-Agent"],
      Accept: BROWSER_HEADERS.Accept,
    });
    if (viaProxy) return viaProxy;
  }

  return null;
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
      // Content-address the path so a year-long immutable cache is safe: an
      // admin re-edit with a different image yields a new URL (no stale CDN/
      // browser copy); an identical re-save reuses the same path (idempotent).
      const hash = createHash("sha1").update(got.bytes).digest("hex").slice(0, 10);
      const path = `${id}/${idx}-${hash}.${extFor(got.contentType)}`;
      const up = await db.storage
        .from(BUCKET)
        .upload(path, got.bytes, {
          contentType: got.contentType,
          upsert: true,
          cacheControl: "31536000",
        });
      if (up.error) {
        failed.push(url);
        return url;
      }
      return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }),
  );

  return { images, failed };
}

/**
 * Store admin-uploaded image bytes directly into the bucket (the guaranteed
 * manual fallback — no remote fetch). Returns the public URL, or null on failure.
 */
export async function uploadProductImageBytes(
  bytes: Buffer,
  contentType: string,
): Promise<string | null> {
  const db = createServiceClient();
  if (!db) return null;
  const path = `manual/${randomUUID()}.${extFor(contentType)}`;
  const up = await db.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: contentType || "image/jpeg",
      upsert: true,
      cacheControl: "31536000", // unique UUID path — immutable
    });
  if (up.error) return null;
  return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
