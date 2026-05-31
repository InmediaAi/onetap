import "server-only";
import { lookup } from "node:dns/promises";
import net from "node:net";

/**
 * Fetch a retailer page with a realistic browser identity and an SSRF guard.
 * Returns the HTML + the final (post-redirect) URL, or a blocked/error signal.
 */

export type FetchResult =
  | { ok: true; html: string; finalUrl: string }
  | { ok: false; blocked: boolean; reason: string };

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) || // link-local / cloud metadata 169.254.169.254
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) // carrier-grade NAT
    );
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    return (
      v === "::1" ||
      v.startsWith("fc") ||
      v.startsWith("fd") || // unique local
      v.startsWith("fe80") || // link-local
      v.startsWith("::ffff:") // IPv4-mapped — resolve via the v4 branch upstream
    );
  }
  return false;
}

/** Validate scheme + resolve host and reject private/loopback targets. */
async function assertSafeUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) {
    throw new Error("Blocked host");
  }
  // If the host is an IP literal, check it directly; otherwise resolve it.
  const literals = net.isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (literals.length === 0 || literals.some(isPrivateIp)) {
    throw new Error("Blocked host");
  }
  return url;
}

export async function fetchPage(raw: string, timeoutMs = 12_000): Promise<FetchResult> {
  let url: URL;
  try {
    url = await assertSafeUrl(raw);
  } catch (e) {
    return { ok: false, blocked: false, reason: e instanceof Error ? e.message : "Invalid URL" };
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url.href, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    if (!res.ok) {
      const blocked = res.status === 403 || res.status === 429 || res.status === 401;
      return { ok: false, blocked, reason: `Site returned ${res.status}` };
    }
    const html = await res.text();
    return { ok: true, html, finalUrl: res.url || url.href };
  } catch (e) {
    const reason = e instanceof Error && e.name === "AbortError" ? "Request timed out" : "Fetch failed";
    return { ok: false, blocked: false, reason };
  } finally {
    clearTimeout(timer);
  }
}
