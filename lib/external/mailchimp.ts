import "server-only";
import crypto from "node:crypto";

/**
 * Mailchimp Marketing API v3 — server-side audience sync for re-targeting.
 *
 * Two audiences (lists):
 *   • registered users — email at first sign-in, brand tags after onboarding
 *   • paid users       — email + plan tag on subscription activation
 *
 * Every call is idempotent (upsert by email hash) and NON-BLOCKING: a Mailchimp
 * failure is swallowed so it can never break signup / onboarding / the webhook.
 * A no-op when unconfigured (mirrors isRazorpayConfigured / createServiceClient).
 */

const API_KEY = process.env.MAILCHIMP_API_KEY;
const REGISTERED_LIST = process.env.MAILCHIMP_REGISTERED_AUDIENCE_ID;
const PAID_LIST = process.env.MAILCHIMP_PAID_AUDIENCE_ID;

/** Data-center prefix (e.g. "us21") — explicit env, else parsed from the key suffix. */
function serverPrefix(): string | null {
  if (process.env.MAILCHIMP_SERVER_PREFIX) return process.env.MAILCHIMP_SERVER_PREFIX;
  const dash = API_KEY?.lastIndexOf("-") ?? -1;
  return dash > -1 ? (API_KEY as string).slice(dash + 1) : null;
}

export function isMailchimpConfigured(): boolean {
  return Boolean(API_KEY && serverPrefix() && (REGISTERED_LIST || PAID_LIST));
}

/** Mailchimp subscriber hash = MD5 of the lowercased, trimmed email. */
function subscriberHash(email: string): string {
  return crypto.createHash("md5").update(email.trim().toLowerCase()).digest("hex");
}

function authHeader(): string {
  return "Basic " + Buffer.from(`any:${API_KEY}`).toString("base64");
}

async function mcFetch(path: string, method: string, body: unknown): Promise<void> {
  const dc = serverPrefix();
  if (!dc) return;
  const res = await fetch(`https://${dc}.api.mailchimp.com/3.0${path}`, {
    method,
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.warn(`[mailchimp] ${method} ${path} → ${res.status} ${detail.slice(0, 300)}`);
  }
}

/** Upsert a member into a list (idempotent; never resubscribes an opted-out contact). */
async function upsertMember(listId: string, email: string): Promise<void> {
  await mcFetch(`/lists/${listId}/members/${subscriberHash(email)}`, "PUT", {
    email_address: email,
    status_if_new: "subscribed",
  });
}

/** Add/reconcile tags on an existing member (additive; status active | inactive). */
async function addTags(
  listId: string,
  email: string,
  tags: { name: string; status: "active" | "inactive" }[],
): Promise<void> {
  if (!tags.length) return;
  await mcFetch(`/lists/${listId}/members/${subscriberHash(email)}/tags`, "POST", { tags });
}

/** First sign-in: add the email to the registered audience (no tags yet). */
export async function registerEmail(email: string | null | undefined): Promise<void> {
  if (!isMailchimpConfigured() || !REGISTERED_LIST || !email) return;
  try {
    await upsertMember(REGISTERED_LIST, email);
  } catch (err) {
    console.warn("[mailchimp] registerEmail failed (non-blocking):", err);
  }
}

const cleanList = (arr: string[] | null | undefined): string[] =>
  (arr ?? [])
    .map((b) => (typeof b === "string" ? b.trim() : ""))
    .filter(Boolean)
    .slice(0, 60);

/**
 * Reconcile a member's brand tags to match their current selection (at onboarding
 * or on a later profile edit): the `selected` brands are set `active`, the
 * `removed` (deselected) ones `inactive`, so Mailchimp always mirrors the user's
 * brands. Upserts the member first (self-sufficient if the sign-in add hadn't run).
 */
export async function syncRegisteredBrands(
  email: string | null | undefined,
  selected: string[] | null | undefined,
  removed: string[] | null | undefined,
): Promise<void> {
  if (!isMailchimpConfigured() || !REGISTERED_LIST || !email) return;
  const sel = cleanList(selected);
  const selSet = new Set(sel);
  const rem = cleanList(removed).filter((b) => !selSet.has(b)); // don't deactivate re-selected
  const tags = [
    ...sel.map((name) => ({ name, status: "active" as const })),
    ...rem.map((name) => ({ name, status: "inactive" as const })),
  ];
  if (!tags.length) return;
  try {
    await upsertMember(REGISTERED_LIST, email);
    await addTags(REGISTERED_LIST, email, tags);
  } catch (err) {
    console.warn("[mailchimp] syncRegisteredBrands failed (non-blocking):", err);
  }
}

/** All plan display names — used to reconcile the paid audience's plan tag. */
const ALL_PLAN_TAGS = ["Free", "Starter", "Pro", "Maison", "Fan Membership"];

/**
 * Subscription active: add the email to the paid audience and set the plan tag.
 * The current plan is `active`; the other known plans are set `inactive` so the
 * contact reflects only their current tier (clean upgrade/downgrade segmentation).
 */
export async function addPaidMember(
  email: string | null | undefined,
  planName: string | null | undefined,
): Promise<void> {
  if (!isMailchimpConfigured() || !PAID_LIST || !email || !planName) return;
  try {
    await upsertMember(PAID_LIST, email);
    const tags = ALL_PLAN_TAGS.map((name) => ({
      name,
      status: (name === planName ? "active" : "inactive") as "active" | "inactive",
    }));
    // Include the plan even if it isn't in the known list (defensive).
    if (!ALL_PLAN_TAGS.includes(planName)) tags.push({ name: planName, status: "active" });
    await addTags(PAID_LIST, email, tags);
  } catch (err) {
    console.warn("[mailchimp] addPaidMember failed (non-blocking):", err);
  }
}
