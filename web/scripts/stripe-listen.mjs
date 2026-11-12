#!/usr/bin/env node
// Forward Stripe sandbox webhooks to the local dev server.
//
//   npm run stripe:listen      (from web/ or the repo root)
//
// Reads STRIPE_SECRET_KEY from .env.local and passes it to the Stripe CLI
// through the environment, never the command line. Refuses live keys: live
// events must go to the production webhook endpoint, not a laptop.
//
// The webhook signing secret the CLI prints is stable per account, and
// STRIPE_WEBHOOK_SECRET in .env.local already holds it.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const text = readFileSync(resolve(__dirname, "..", ".env.local"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/^(['"])(.*)\1$/s, "$2");
  }
  return env;
}

function findStripeCli() {
  // 1. On PATH.
  const which = spawnSync(process.platform === "win32" ? "where" : "which", ["stripe"], { encoding: "utf8" });
  if (which.status === 0) return which.stdout.split(/\r?\n/)[0].trim();
  // 2. Installed by winget but not linked onto PATH.
  const pkgs = join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Packages");
  if (existsSync(pkgs)) {
    const dir = readdirSync(pkgs).find((d) => d.startsWith("Stripe.StripeCli"));
    if (dir && existsSync(join(pkgs, dir, "stripe.exe"))) return join(pkgs, dir, "stripe.exe");
  }
  return null;
}

const key = loadEnv().STRIPE_SECRET_KEY;
if (!key) {
  console.error("STRIPE_SECRET_KEY is empty in web/.env.local.");
  process.exit(1);
}
if (!key.startsWith("sk_test_")) {
  console.error("Refusing to forward webhooks with a live key. Use your sandbox key (sk_test_…) locally.");
  process.exit(1);
}

const cli = findStripeCli();
if (!cli) {
  console.error("Stripe CLI not found. Install it with:  winget install Stripe.StripeCli");
  process.exit(1);
}

const events = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
].join(",");

console.log("→ Forwarding Stripe sandbox events to http://localhost:3000/api/stripe/webhook (Ctrl+C to stop)\n");
const child = spawn(cli, ["listen", "--forward-to", "localhost:3000/api/stripe/webhook", "--events", events], {
  stdio: "inherit",
  env: { ...process.env, STRIPE_API_KEY: key },
});
child.on("exit", (code) => process.exit(code ?? 0));
