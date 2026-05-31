import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * Single shared-password admin gate. The password lives only here (server-side)
 * via ADMIN_PASSWORD — never NEXT_PUBLIC_. Every admin route calls checkAdmin()
 * before doing any work.
 */

/** Constant-time string compare that tolerates differing lengths. */
function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still spend a comparison to avoid leaking length via timing.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

/** True when the supplied password matches ADMIN_PASSWORD. */
export function checkAdmin(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false; // not configured → admin disabled
  if (typeof password !== "string" || password.length === 0) return false;
  return safeEqual(password, expected);
}

/** Whether the admin gate is usable at all (password configured). */
export function isAdminEnabled() {
  return Boolean(process.env.ADMIN_PASSWORD);
}
