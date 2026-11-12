#!/usr/bin/env node
// Backfill / re-sync the app_users table (db/0011) from Stack Auth.
//
//   node scripts/sync-app-users.mjs [--dry-run]
//
// Reads every account from Stack Auth's server API and upserts it into
// app_users. Rows whose account no longer exists in Stack get deleted_at set.
// Safe to re-run any time; first_seen_at is never overwritten.
//
// Reads NEXT_PUBLIC_STACK_PROJECT_ID, STACK_SECRET_SERVER_KEY,
// NEXT_PUBLIC_INSFORGE_URL and INSFORGE_API_KEY from .env.local.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@insforge/sdk";

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

const env = loadEnv();
const need = [
  "NEXT_PUBLIC_STACK_PROJECT_ID",
  "STACK_SECRET_SERVER_KEY",
  "NEXT_PUBLIC_INSFORGE_URL",
  "INSFORGE_API_KEY",
];
const missing = need.filter((k) => !env[k]);
if (missing.length) {
  console.error(`Missing in .env.local: ${missing.join(", ")}`);
  process.exit(1);
}
const dryRun = process.argv.includes("--dry-run");
const STACK_API = (env.NEXT_PUBLIC_STACK_API_URL || "https://api.stack-auth.com").replace(/\/$/, "");

/* ─── read all Stack Auth users ──────────────────────────────────────── */
async function listStackUsers() {
  const users = [];
  let cursor = null;
  do {
    const qs = new URLSearchParams({ limit: "200" });
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(`${STACK_API}/api/v1/users?${qs}`, {
      headers: {
        "x-stack-access-type": "server",
        "x-stack-project-id": env.NEXT_PUBLIC_STACK_PROJECT_ID,
        "x-stack-secret-server-key": env.STACK_SECRET_SERVER_KEY,
      },
    });
    if (!res.ok) {
      console.error(`x Stack Auth ${res.status}: ${(await res.text()).slice(0, 200)}`);
      process.exit(1);
    }
    const body = await res.json();
    users.push(...body.items);
    cursor = body.pagination?.next_cursor ?? null;
  } while (cursor);
  return users;
}

function toRow(u, now) {
  const role = u.client_read_only_metadata?.role;
  const ms = (v) => (typeof v === "number" ? new Date(v).toISOString() : null);
  return {
    user_id: u.id,
    email: u.primary_email ?? null,
    email_verified: !!u.primary_email_verified,
    display_name: u.display_name ?? null,
    profile_image_url: u.profile_image_url ?? null,
    role: role === "founder" || role === "investor" ? role : null,
    auth_methods: [
      ...(u.has_password ? ["password"] : []),
      ...(u.oauth_providers ?? []).map((p) => p.id),
    ],
    country_code: u.country_code ?? null,
    signed_up_at: ms(u.signed_up_at_millis),
    last_active_at: ms(u.last_active_at_millis),
    last_synced_at: now,
    deleted_at: null,
  };
}

/* ─── sync ───────────────────────────────────────────────────────────── */
const stackUsers = (await listStackUsers()).filter((u) => !u.is_anonymous);
const now = new Date().toISOString();
const rows = stackUsers.map((u) => toRow(u, now));

const db = createClient({
  baseUrl: env.NEXT_PUBLIC_INSFORGE_URL.replace(/\/$/, ""),
  anonKey: env.INSFORGE_API_KEY,
  isServerMode: true,
}).database;

const { data: existing, error: readErr } = await db
  .from("app_users")
  .select("user_id, deleted_at");
if (readErr) {
  console.error(`x reading app_users: ${readErr.message}`);
  console.error("  Has migration 0011 been applied? node scripts/migrate.mjs 0011 app-users db/0011-app-users.sql");
  process.exit(1);
}
const existingIds = new Set((existing ?? []).map((r) => r.user_id));
const stackIds = new Set(rows.map((r) => r.user_id));
const newCount = rows.filter((r) => !existingIds.has(r.user_id)).length;
const gone = (existing ?? []).filter((r) => !stackIds.has(r.user_id) && !r.deleted_at);

console.log(`${dryRun ? "DRY RUN — " : ""}Stack Auth: ${rows.length} accounts`);
console.log(`  ${newCount} new, ${rows.length - newCount} to refresh, ${gone.length} to mark deleted`);
if (dryRun) process.exit(0);

let failed = 0;
for (const row of rows) {
  const { error } = await db.from("app_users").upsert(row, { onConflict: "user_id" });
  if (error) {
    failed++;
    console.error(`  x ${row.user_id}: ${error.message}`);
  }
}
for (const r of gone) {
  const { error } = await db
    .from("app_users")
    .update({ deleted_at: now, last_synced_at: now })
    .eq("user_id", r.user_id);
  if (error) {
    failed++;
    console.error(`  x mark deleted ${r.user_id}: ${error.message}`);
  }
}
console.log(failed ? `! done with ${failed} failures` : `+ done — app_users matches Stack Auth`);
process.exit(failed ? 1 : 0);
