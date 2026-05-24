// palantir-mini v4.13.0 — lib/runtime-overlay/resolve-rule.ts (sprint-061 A.W1.a)
//
// Resolves rule body files from the plugin-resident overlay first, then falls
// back to the external ~/.claude/rules/ directory.
//
// Resolution order:
//   1. Plugin overlay:  <PLUGIN_ROOT>/runtime-overlay/rules/<NN-slug>.md
//   2. External:        ~/.claude/rules/<NN-slug>.md
//   3. not-found:       body = "", source = "not-found"
//
// Slug derivation for byId queries: walk the target directory listing and
// match files whose name starts with the zero-padded rule ID (NN-*.md).
//
// Authority: sprint-061 A.W1.a plan §4.A.W1.
// Plan: ~/.claude/plans/inherited-discovering-quill.md §4.A.W1.

import * as fs from "fs";
import * as path from "path";

/** Where the plugin root lives at runtime. */
const PLUGIN_ROOT = path.resolve(__dirname, "..", "..");

/** Plugin-resident rules overlay directory. */
const OVERLAY_RULES_DIR = path.join(PLUGIN_ROOT, "runtime-overlay", "rules");

/** External Claude-native rules directory. */
const EXTERNAL_RULES_DIR = path.join(
  process.env.HOME ?? "/home/palantirkc",
  ".claude",
  "rules",
);

/** Source classification for a resolved rule body. */
export type RuleBodySource = "plugin-overlay" | "external" | "not-found";

export interface ResolveRuleResult {
  body:   string;
  source: RuleBodySource;
  /** Absolute path to the file that was read, if any. */
  filePath?: string;
}

/**
 * List *.md files in a directory whose basename matches the zero-padded numeric
 * prefix NN (e.g. "10" → matches "10-events-jsonl.md").
 */
function findByNumericId(dir: string, numericId: number): string | null {
  if (!fs.existsSync(dir)) return null;
  const prefix = String(numericId).padStart(2, "0") + "-";
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith(prefix) && entry.endsWith(".md")) {
        return path.join(dir, entry);
      }
    }
  } catch {
    // directory not readable — treat as not-found
  }
  return null;
}

/**
 * List *.md files in a directory whose filename (without the NN- prefix)
 * matches the given slug.  E.g. slug "events-jsonl" → "10-events-jsonl.md".
 */
function findBySlug(dir: string, slug: string): string | null {
  if (!fs.existsSync(dir)) return null;
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      // Strip leading NN- prefix (if any).
      const withoutPrefix = entry.replace(/^\d{2}-/, "");
      // Compare without .md extension.
      if (withoutPrefix.replace(/\.md$/, "") === slug) {
        return path.join(dir, entry);
      }
    }
  } catch {
    // directory not readable — treat as not-found
  }
  return null;
}

function readFile(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Resolve a rule body by numeric ID or slug string.
 *
 * Resolution order: plugin-overlay → external → not-found.
 */
export async function resolveRule(
  idOrSlug: number | string,
): Promise<ResolveRuleResult> {
  const isNumeric = typeof idOrSlug === "number";

  // ── Plugin overlay ──────────────────────────────────────────────────────────
  const overlayPath = isNumeric
    ? findByNumericId(OVERLAY_RULES_DIR, idOrSlug as number)
    : findBySlug(OVERLAY_RULES_DIR, idOrSlug as string);

  if (overlayPath !== null) {
    const body = readFile(overlayPath);
    if (body !== null) {
      return { body, source: "plugin-overlay", filePath: overlayPath };
    }
  }

  // ── External fallback ───────────────────────────────────────────────────────
  const externalPath = isNumeric
    ? findByNumericId(EXTERNAL_RULES_DIR, idOrSlug as number)
    : findBySlug(EXTERNAL_RULES_DIR, idOrSlug as string);

  if (externalPath !== null) {
    const body = readFile(externalPath);
    if (body !== null) {
      return { body, source: "external", filePath: externalPath };
    }
  }

  // ── Not found ───────────────────────────────────────────────────────────────
  return { body: "", source: "not-found" };
}

/**
 * Synchronous variant — used in contexts where async/await is unavailable.
 * Identical resolution order to resolveRule().
 */
export function resolveRuleSync(idOrSlug: number | string): ResolveRuleResult {
  const isNumeric = typeof idOrSlug === "number";

  const overlayPath = isNumeric
    ? findByNumericId(OVERLAY_RULES_DIR, idOrSlug as number)
    : findBySlug(OVERLAY_RULES_DIR, idOrSlug as string);

  if (overlayPath !== null) {
    const body = readFile(overlayPath);
    if (body !== null) {
      return { body, source: "plugin-overlay", filePath: overlayPath };
    }
  }

  const externalPath = isNumeric
    ? findByNumericId(EXTERNAL_RULES_DIR, idOrSlug as number)
    : findBySlug(EXTERNAL_RULES_DIR, idOrSlug as string);

  if (externalPath !== null) {
    const body = readFile(externalPath);
    if (body !== null) {
      return { body, source: "external", filePath: externalPath };
    }
  }

  return { body: "", source: "not-found" };
}

// ── Exported paths for consumers that need to list or hash ───────────────────
export { OVERLAY_RULES_DIR, EXTERNAL_RULES_DIR };
