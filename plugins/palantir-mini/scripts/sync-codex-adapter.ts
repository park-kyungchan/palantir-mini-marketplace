#!/usr/bin/env bun
/**
 * sync-codex-adapter.ts
 *
 * Regenerates ~/.codex/hooks/palantir-mini-claude-hook-adapter.ts from
 * the canonical private marketplace plugin hook registry.
 *
 * The Codex-side adapter MUST be a thin shim delegating to the plugin
 * lib/codex/claude-hook-adapter.ts source. This script enforces that
 * contract and prevents the shim from drifting into a separate fork.
 *
 * Usage:
 *   bun scripts/sync-codex-adapter.ts [--dry-run] [--target <path>]
 *
 * Flags:
 *   --dry-run          Print generated content to stdout; do NOT write.
 *   --target <path>    Override default target path.
 *
 * Exits:
 *   0  Success (or dry-run complete).
 *   1  Validation failure (hooks.json missing, bad structure, write error).
 *
 * Per canonical plan v2 §4 row 6.2 (sprint-129 PR 6.2; PHASE 6 PR 2/7).
 * AUTO-GENERATED header in output enforces forbidden-fork policy from .ssot-authority.json.
 */

// AUTO-GENERATED from plugins/palantir-mini/hooks/hooks.json
// — see scripts/sync-codex-adapter.ts; DO NOT EDIT BY HAND

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const PLUGIN_ROOT = path.resolve(import.meta.dir, "..");
const HOME = process.env.HOME ?? "/home/palantirkc";

const DEFAULT_TARGET = path.join(HOME, ".codex", "hooks", "palantir-mini-claude-hook-adapter.ts");
const HOOKS_JSON_PATH = path.join(PLUGIN_ROOT, "hooks", "hooks.json");
const SSOT_AUTHORITY_PATH = path.join(PLUGIN_ROOT, ".ssot-authority.json");

// ────────────────────────────────────────────────────────────────────────────
// CLI argument parsing
// ────────────────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { dryRun: boolean; target: string } {
  let dryRun = false;
  let target = DEFAULT_TARGET;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--target" && argv[i + 1]) {
      target = argv[i + 1] as string;
      i++;
    }
  }

  return { dryRun, target };
}

// ────────────────────────────────────────────────────────────────────────────
// Validation helpers
// ────────────────────────────────────────────────────────────────────────────

type HooksDocument = {
  description?: string;
  hooks?: Record<string, unknown[]>;
};

function validateHooksJson(raw: string): HooksDocument {
  let doc: HooksDocument;
  try {
    doc = JSON.parse(raw) as HooksDocument;
  } catch (err) {
    throw new Error(`hooks.json parse failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!doc.hooks || typeof doc.hooks !== "object") {
    throw new Error("hooks.json missing 'hooks' field");
  }
  return doc;
}

function deriveEventAllowlist(doc: HooksDocument): string[] {
  return Object.keys(doc.hooks ?? {}).sort();
}

// ────────────────────────────────────────────────────────────────────────────
// Generator
// ────────────────────────────────────────────────────────────────────────────

function generateAdapterContent(
  hooksJsonPath: string,
  pluginRoot: string,
  eventAllowlist: string[],
  generatedAt: string,
): string {
  const relativePluginRoot = pluginRoot
    .replace(HOME, "~")
    .replace(/\\/g, "/");
  const displayHooksJsonPath = hooksJsonPath
    .replace(HOME, "~")
    .replace(/\\/g, "/");

  const allowlistLines = eventAllowlist.map((e) => `  "${e}",`).join("\n");

  return `#!/usr/bin/env bun
/**
 * palantir-mini Codex hook adapter — thin shim.
 *
 * AUTO-GENERATED from ${displayHooksJsonPath} — see scripts/sync-codex-adapter.ts; DO NOT EDIT BY HAND
 * Generated at: ${generatedAt}
 * Source authority: ${relativePluginRoot}
 *
 * Adapter logic lives in the versioned plugin source:
 *   ${relativePluginRoot}/lib/codex/claude-hook-adapter.ts
 *
 * This file MUST remain a thin shim. Per .ssot-authority.json forbidden-fork policy,
 * runtime-local adapters are protocol consumers, not workflow authorities.
 *
 * Event allowlist live-read from SSoT hooks.json (${eventAllowlist.length} events):
${allowlistLines}
 *
 * To regenerate this file:
 *   cd ${relativePluginRoot}
 *   bun scripts/sync-codex-adapter.ts [--dry-run]
 *
 * Per canonical plan v2 §4 row 6.2 (sprint-129 PR 6.2; PHASE 6 PR 2/7).
 */
import { runCodexHookAdapterCli } from "${pluginRoot}/lib/codex/claude-hook-adapter.ts";

process.stdout.write(await runCodexHookAdapterCli());
`;
}

// ────────────────────────────────────────────────────────────────────────────
// Main
// ────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { dryRun, target } = parseArgs(process.argv);

  // 1. Verify SSoT authority marker exists (sanity check)
  if (!existsSync(SSOT_AUTHORITY_PATH)) {
    console.error(`ERROR: .ssot-authority.json not found at ${SSOT_AUTHORITY_PATH}`);
    console.error("Run from the plugin root or ensure the SSoT marker exists (PR 6.1).");
    process.exit(1);
  }

  // 2. Read + validate hooks.json
  if (!existsSync(HOOKS_JSON_PATH)) {
    console.error(`ERROR: hooks.json not found at ${HOOKS_JSON_PATH}`);
    process.exit(1);
  }

  let doc: HooksDocument;
  try {
    const raw = readFileSync(HOOKS_JSON_PATH, "utf8");
    doc = validateHooksJson(raw);
  } catch (err) {
    console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const eventAllowlist = deriveEventAllowlist(doc);
  if (eventAllowlist.length === 0) {
    console.error("ERROR: hooks.json has no events — refusing to generate an empty adapter.");
    process.exit(1);
  }

  // 3. Generate content
  // Derive the timestamp from the SSoT hook registry so recurring sync jobs are idempotent.
  const generatedAt = statSync(HOOKS_JSON_PATH).mtime.toISOString();
  const content = generateAdapterContent(HOOKS_JSON_PATH, PLUGIN_ROOT, eventAllowlist, generatedAt);

  // 4. Dry-run: print to stdout and exit
  if (dryRun) {
    process.stdout.write(content);
    console.error(
      `[dry-run] Would write ${content.length} bytes to ${target} (${eventAllowlist.length} events from SSoT).`,
    );
    return;
  }

  // 5. Write to target
  const targetDir = path.dirname(target);
  if (!existsSync(targetDir)) {
    try {
      mkdirSync(targetDir, { recursive: true });
    } catch (err) {
      console.error(`ERROR: cannot create target directory ${targetDir}: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  }

  try {
    if (existsSync(target) && readFileSync(target, "utf8") === content) {
      console.log(`[sync-codex-adapter] Up to date: ${target}`);
      console.log(`[sync-codex-adapter] Event allowlist (${eventAllowlist.length}): ${eventAllowlist.join(", ")}`);
      return;
    }
    writeFileSync(target, content, { encoding: "utf8" });
    console.log(`[sync-codex-adapter] Wrote ${content.length} bytes → ${target}`);
    console.log(`[sync-codex-adapter] Event allowlist (${eventAllowlist.length}): ${eventAllowlist.join(", ")}`);
  } catch (err) {
    console.error(`ERROR: failed to write ${target}: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }
}

await main();
