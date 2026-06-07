import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Re-host a generated output (provider URL or data URL) into our public `looks`
 * bucket and record a `generated_looks` row, so shared /look/[id] links are
 * durable + CDN-cacheable (provider URLs like Kling's expire).
 *
 * Best-effort: if Supabase is unconfigured or anything fails, returns the
 * original source unchanged (dev/mock keeps working on provider URLs).
 */

const BUCKET = "looks";

export type LookKind = "tryon" | "spin" | "video";

export interface PersistArgs {
  /** Look id (also the /look/[id] slug). Generated if omitted. */
  id?: string;
  kind: LookKind;
  /** Provider URL or data: URL of the generated asset. */
  source: string;
  userId?: string | null;
  productId?: string | null;
  /** Short, non-PII reference to the input (never a raw data URL). */
  inputRef?: string | null;
  /** Optional still to re-host as the video poster. */
  posterSource?: string | null;
}

export interface PersistResult {
  id: string;
  url: string;
  posterUrl?: string;
  persisted: boolean;
}

function extFor(contentType: string, kind: LookKind): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webm")) return "webm";
  if (ct.includes("mp4")) return "mp4";
  return kind === "tryon" ? "jpg" : "mp4";
}

async function toBytes(
  source: string,
): Promise<{ bytes: Buffer; contentType: string } | null> {
  try {
    if (source.startsWith("data:")) {
      const comma = source.indexOf(",");
      const header = source.slice(5, comma); // e.g. "image/png;base64"
      if (comma < 0 || !header.includes("base64")) return null;
      const contentType = header.split(";")[0] || "";
      return { bytes: Buffer.from(source.slice(comma + 1), "base64"), contentType };
    }
    const res = await fetch(source);
    if (!res.ok) return null;
    return {
      bytes: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") || "",
    };
  } catch {
    return null;
  }
}

export async function persistLook(args: PersistArgs): Promise<PersistResult> {
  const id = args.id ?? crypto.randomUUID();
  const fallback: PersistResult = {
    id,
    url: args.source,
    posterUrl: args.posterSource ?? undefined,
    persisted: false,
  };

  const db = createServiceClient();
  if (!db) return fallback;

  try {
    const folder = args.userId ?? "anon";
    const got = await toBytes(args.source);
    if (!got) return fallback;

    const path = `${folder}/${id}.${extFor(got.contentType, args.kind)}`;
    const up = await db.storage
      .from(BUCKET)
      .upload(path, got.bytes, {
        contentType: got.contentType || undefined,
        upsert: true,
      });
    if (up.error) return fallback;
    const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

    // Optional poster (still) for video looks.
    let posterUrl: string | undefined;
    if (args.posterSource) {
      const pg = await toBytes(args.posterSource);
      if (pg) {
        const ppath = `${folder}/${id}-poster.${extFor(pg.contentType, "tryon")}`;
        const pu = await db.storage
          .from(BUCKET)
          .upload(ppath, pg.bytes, {
            contentType: pg.contentType || undefined,
            upsert: true,
          });
        if (!pu.error) posterUrl = db.storage.from(BUCKET).getPublicUrl(ppath).data.publicUrl;
      }
    }

    const isImage = args.kind === "tryon";
    await db.from("generated_looks").insert({
      id,
      user_id: args.userId ?? null,
      product_id: args.productId ?? null,
      kind: args.kind,
      input_image: args.inputRef ?? null,
      generated_image: isImage ? url : null,
      video_url: isImage ? null : url,
      poster_url: posterUrl ?? null,
    });

    return { id, url, posterUrl, persisted: true };
  } catch {
    return fallback;
  }
}
