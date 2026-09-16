#!/usr/bin/env node
// Restore Laelapx application data from a pg_dump into the Insforge project
// named by .env.local.
//
//   node scripts/restore-from-dump.mjs <path-to-dump.sql> [--dry-run]
//
// Only the `public` schema is touched. A dump taken from Insforge is
// instance-wide and also contains auth/storage/deployments/system schemas —
// restoring those would clobber the target project's own configuration, so
// they are ignored here by design.
//
// Rows go through the SDK (PostgREST-style object inserts) rather than raw
// SQL: the dump's `COPY ... FROM stdin` form is psql-only, and re-emitting it
// as INSERT text would rely on the server splitting statements on `;` — which
// free-text columns containing semicolons would break.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@insforge/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ─── env ────────────────────────────────────────────────────────────── */
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
const baseUrl = env.NEXT_PUBLIC_INSFORGE_URL?.replace(/\/$/, "");
const apiKey = env.INSFORGE_API_KEY;
if (!baseUrl || !apiKey) {
  console.error("Missing NEXT_PUBLIC_INSFORGE_URL or INSFORGE_API_KEY in .env.local");
  process.exit(1);
}

const [, , dumpPath, ...flags] = process.argv;
if (!dumpPath) {
  console.error("Usage: node scripts/restore-from-dump.mjs <dump.sql> [--dry-run]");
  process.exit(1);
}
const dryRun = flags.includes("--dry-run");

/* ─── dump parsing ───────────────────────────────────────────────────── */
// Built from char codes: a literal "\\." invites backslash-mangling when this
// file is edited through a shell.
const BACKSLASH = String.fromCharCode(92);
const TERMINATOR = BACKSLASH + ".";
const NULL_FIELD = BACKSLASH + "N";
const ESCAPES = { t: "\t", n: "\n", r: "\r", b: "\b", f: "\f", v: "\v" };

function decode(field) {
  if (field === NULL_FIELD) return null;
  let out = "";
  for (let i = 0; i < field.length; i++) {
    if (field[i] !== BACKSLASH) { out += field[i]; continue; }
    out += ESCAPES[field[++i]] ?? field[i];
  }
  return out;
}

const lines = readFileSync(dumpPath, "utf8").split("\n").map((l) => l.replace(/\r$/, ""));

// Column types, so text fields can be coerced back to bool/number/json.
function parseTypes() {
  const types = {};
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^CREATE TABLE public\.(\w+) \($/);
    if (!m) continue;
    const cols = {};
    for (let j = i + 1; j < lines.length && !lines[j].startsWith(");"); j++) {
      const c = lines[j].trim().match(/^(\w+)\s+([a-z ]+(?:\[\])?)/);
      if (c && !/^(CONSTRAINT|PRIMARY|UNIQUE|CHECK|FOREIGN)$/i.test(c[1])) {
        cols[c[1]] = c[2].trim();
      }
    }
    types[m[1]] = cols;
  }
  return types;
}

function coerce(value, type) {
  if (value === null) return null;
  if (!type) return value;
  if (type === "boolean") return value === "t";
  if (/^(integer|bigint|smallint|numeric|real|double precision)$/.test(type)) {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  if (/^jsonb?$/.test(type)) {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

const TYPES = parseTypes();

function parseRows(table) {
  const idx = lines.findIndex((l) => l.startsWith(`COPY public.${table} (`));
  if (idx === -1) return null;
  const cols = lines[idx].match(/\(([^)]+)\)/)[1].split(",").map((c) => c.trim());
  const rows = [];
  for (let j = idx + 1; j < lines.length; j++) {
    if (lines[j] === TERMINATOR) break;
    if (lines[j] === "") continue;
    const fields = lines[j].split("\t").map(decode);
    if (fields.length !== cols.length) {
      console.error(`x ${table}: row has ${fields.length} fields, expected ${cols.length}`);
      process.exit(1);
    }
    const obj = {};
    cols.forEach((c, k) => { obj[c] = coerce(fields[k], TYPES[table]?.[c]); });
    rows.push(obj);
  }
  return rows;
}

/* ─── restore ────────────────────────────────────────────────────────── */
// Parents before children so foreign keys resolve.
const ORDER = [
  "profiles", "investors", "submissions", "subscriptions", "notifications",
  "profile_views", "saves", "connect_requests", "conversations", "messages",
];

const client = createClient({ baseUrl, anonKey: apiKey, isServerMode: true });

console.log(`${dryRun ? "DRY RUN — " : ""}restoring public schema -> ${baseUrl}\n`);

let grandTotal = 0;
let grandFailed = 0;

for (const table of ORDER) {
  const rows = parseRows(table);
  if (rows === null) { console.log(`!  ${table}: not in dump`); continue; }
  if (!rows.length) { console.log(`-  ${table}: 0 rows`); continue; }
  if (dryRun) {
    console.log(`.  ${table}: ${rows.length} rows ready`);
    grandTotal += rows.length;
    continue;
  }

  let ok = 0;
  let dup = 0;
  const errors = [];
  // One row at a time: a single bad row shouldn't sink the whole table, and
  // the volume here is small enough that batching buys nothing.
  for (const row of rows) {
    const { error } = await client.database.from(table).insert(row);
    if (!error) { ok++; continue; }
    const msg = error.message ?? JSON.stringify(error);
    // A row already present is success for a restore — keeps this re-runnable
    // after a partial failure part-way through the table list.
    if (/duplicate key|already exists/i.test(msg)) dup++;
    else errors.push(msg);
  }
  grandTotal += ok;
  grandFailed += errors.length;
  const bits = [];
  if (dup) bits.push(`${dup} already present`);
  if (errors.length) bits.push(`${errors.length} failed`);
  const suffix = bits.length ? `  (${bits.join(", ")})` : "";
  console.log(`${errors.length ? "!" : "+"}  ${table}: ${ok}/${rows.length}${suffix}`);
  for (const e of [...new Set(errors)].slice(0, 3)) console.log(`     ${e.slice(0, 150)}`);
}

console.log(`\n${grandTotal} rows inserted, ${grandFailed} failed`);
process.exit(grandFailed ? 1 : 0);
