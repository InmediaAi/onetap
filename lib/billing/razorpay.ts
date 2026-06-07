import "server-only";
import Razorpay from "razorpay";

/**
 * Razorpay server SDK (subscriptions). Returns null when unconfigured so the
 * app runs without billing (free-trial limit only).
 */

const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

export function isRazorpayConfigured(): boolean {
  return Boolean(keyId && keySecret);
}

let client: Razorpay | null = null;
export function getRazorpay(): Razorpay | null {
  if (!keyId || !keySecret) return null;
  if (!client) client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}
