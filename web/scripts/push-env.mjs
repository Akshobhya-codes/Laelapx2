#!/usr/bin/env node
// Bulk-push env vars from web/.env.local to the linked Vercel project.
// Skips empty values + comments. Pushes to production + preview + development.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const text = readFileSync(envPath, "utf8");

const vars = [];
for (const line of text.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith("#")) continue;
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (!m) continue;
  const key = m[1];
  const value = m[2].trim();
  if (!value) continue; // skip blank values
  vars.push({ key, value });
}

console.log(`→ Pushing ${vars.length} env vars to Vercel...`);

const ENVS = ["production", "preview", "development"];
const cwd = resolve(__dirname, "..");

let ok = 0;
let skipped = 0;
let failed = 0;

for (const { key, value } of vars) {
  for (const env of ENVS) {
    // First remove any existing value (idempotent), then add fresh.
    spawnSync("vercel", ["env", "rm", key, env, "--yes"], {
      cwd,
      stdio: "pipe",
      shell: true,
    });
    const r = spawnSync("vercel", ["env", "add", key, env], {
      cwd,
      input: value + "\n",
      shell: true,
      encoding: "utf8",
    });
    if (r.status === 0) {
      ok++;
      process.stdout.write(`✓ ${key} (${env})\n`);
    } else {
      failed++;
      process.stdout.write(
        `✗ ${key} (${env}) — ${r.stderr?.toString().slice(0, 200) || "unknown"}\n`
      );
    }
  }
}

console.log(`\nDone. ${ok} added, ${skipped} skipped, ${failed} failed.`);
