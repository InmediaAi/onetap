/**
 * Razorpay integration readiness check.
 *
 *   npm run check:razorpay
 *
 * Verifies the env vars are present, the key/secret authenticate, and the two
 * subscription plan ids actually exist in the connected Razorpay account
 * (printing each plan's real amount/currency/interval so you can confirm they
 * match $20 / $49 USD). Run before the first subscribe, and again after going
 * live (the mode is detected from the key prefix).
 *
 * Reads env via `node --env-file=.env.local` (Node ≥ 20.6).
 */

const RESET = "\x1b[0m";
const c = (n, s) => `\x1b[${n}m${s}${RESET}`;
const ok = (s) => c(32, `✓ ${s}`);
const bad = (s) => c(31, `✗ ${s}`);
const warn = (s) => c(33, `! ${s}`);
const dim = (s) => c(90, s);

const EXPECTED = { starter: 20, pro: 49 }; // USD/mo — must match billing_plans
let failed = false;

const env = {
  keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  secret: process.env.RAZORPAY_KEY_SECRET,
  webhook: process.env.RAZORPAY_WEBHOOK_SECRET,
  starter: process.env.RAZORPAY_PLAN_STARTER,
  pro: process.env.RAZORPAY_PLAN_PRO,
};

console.log(c(1, "\nRazorpay readiness check\n"));

// 1) Presence ---------------------------------------------------------------
const REQUIRED = [
  ["NEXT_PUBLIC_RAZORPAY_KEY_ID", env.keyId],
  ["RAZORPAY_KEY_SECRET", env.secret],
  ["RAZORPAY_WEBHOOK_SECRET", env.webhook],
  ["RAZORPAY_PLAN_STARTER", env.starter],
  ["RAZORPAY_PLAN_PRO", env.pro],
];
console.log(c(1, "Environment"));
for (const [name, val] of REQUIRED) {
  if (val) console.log("  " + ok(name));
  else {
    failed = true;
    console.log("  " + bad(`${name} is missing`));
  }
}
if (!env.keyId || !env.secret) {
  console.log("\n" + bad("Cannot reach Razorpay without a key id + secret. Stopping."));
  process.exit(1);
}

// 2) Mode -------------------------------------------------------------------
const mode = env.keyId.startsWith("rzp_live_")
  ? "LIVE"
  : env.keyId.startsWith("rzp_test_")
    ? "TEST"
    : "UNKNOWN";
console.log("\n" + c(1, "Mode") + `  ${mode === "LIVE" ? c(35, "LIVE (real money)") : c(36, mode)}`);
if (mode === "UNKNOWN") {
  console.log("  " + warn("Key id doesn't start with rzp_test_ or rzp_live_ — double-check it."));
}

// 3) Auth + plans -----------------------------------------------------------
const auth = "Basic " + Buffer.from(`${env.keyId}:${env.secret}`).toString("base64");

async function getPlan(id) {
  const res = await fetch(`https://api.razorpay.com/v1/plans/${id}`, {
    headers: { Authorization: auth },
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

console.log("\n" + c(1, "Plans"));
for (const [tier, id] of [
  ["starter", env.starter],
  ["pro", env.pro],
]) {
  if (!id) {
    failed = true;
    console.log("  " + bad(`${tier}: env not set`));
    continue;
  }
  try {
    const { status, body } = await getPlan(id);
    if (status === 401) {
      failed = true;
      console.log("  " + bad("Authentication failed (401) — key id/secret are wrong or mismatched."));
      break;
    }
    if (status >= 400 || !body?.id) {
      failed = true;
      console.log("  " + bad(`${tier}: plan "${id}" not found (${status}) ${dim(body?.error?.description ?? "")}`));
      continue;
    }
    const amt = (body.item?.amount ?? 0) / 100;
    const cur = body.item?.currency ?? "?";
    const cadence = `${body.period}/${body.interval}`;
    let line = `${tier}: ${id} — ${cur} ${amt} (${cadence})`;
    const notes = [];
    if (cur !== "USD") notes.push(`currency ${cur}≠USD`);
    if (amt !== EXPECTED[tier]) notes.push(`amount ${amt}≠$${EXPECTED[tier]}`);
    if (body.period !== "monthly") notes.push(`period ${body.period}≠monthly`);
    if (notes.length) console.log("  " + warn(`${line}  [${notes.join(", ")}]`));
    else console.log("  " + ok(line));
  } catch (e) {
    failed = true;
    console.log("  " + bad(`${tier}: request failed — ${e.message}`));
  }
}

// 4) Webhook reminder (not reliably listable via the standard API) ----------
console.log("\n" + c(1, "Webhook"));
console.log(
  "  " +
    (env.webhook ? ok("RAZORPAY_WEBHOOK_SECRET is set") : bad("RAZORPAY_WEBHOOK_SECRET missing")),
);
console.log(
  dim(
    "  Verify in Dashboard → Settings → Webhooks that one points to\n" +
      "  <site>/api/webhooks/razorpay with events: subscription.activated, .charged,\n" +
      "  .cancelled, .completed, .halted, .pending, payment.captured, order.paid —\n" +
      "  and that its secret equals RAZORPAY_WEBHOOK_SECRET.",
  ),
);

// Summary -------------------------------------------------------------------
console.log("");
if (failed) {
  console.log(bad("Readiness check FAILED — fix the items above.\n"));
  process.exit(1);
}
console.log(ok(`Razorpay looks ready in ${mode} mode.\n`));
