#!/usr/bin/env node
// Apply a Laelapx SQL migration to Insforge.
//
//   node scripts/migrate.mjs <version> <name> <path-to-sql>
//
// Example:
//   node scripts/migrate.mjs 0002 init-schema db/0002-init-schema.sql
//
// Reads NEXT_PUBLIC_INSFORGE_URL + INSFORGE_API_KEY from .env.local.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  const text = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
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

const [, , version, name, sqlPath] = process.argv;
if (!version || !name || !sqlPath) {
  console.error("Usage: node scripts/migrate.mjs <version> <name> <path-to-sql>");
  process.exit(1);
}

const sql = readFileSync(resolve(__dirname, "..", sqlPath), "utf8");
console.log(`→ Pushing migration ${version} (${name}) to ${baseUrl}`);
console.log(`  ${sql.split(/\r?\n/).length} lines · ${sql.length} bytes`);

const res = await fetch(`${baseUrl}/api/database/migrations`, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ version, name, sql }),
});

const body = await res.text();
let parsed;
try {
  parsed = JSON.parse(body);
} catch {
  parsed = body;
}

if (!res.ok) {
  console.error(`✗ ${res.status} ${res.statusText}`);
  console.error(parsed);
  process.exit(1);
}

console.log(`✓ ${res.status} migration applied`);
console.log(`  ${parsed.statements?.length ?? 0} statements executed`);
console.log(`  at ${parsed.createdAt}`);
