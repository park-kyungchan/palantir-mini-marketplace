// palantir-mini v3.7.0 — hooks/session-start/state-files.ts
// ontology-state + inbox file list / reset / stale-detect helpers.
// Extracted from session-start.ts during A.1 decomposition.

import * as fs from "fs";
import * as path from "path";

export const EMPTY_ONTOLOGY_STATE_TEMPLATE = JSON.stringify(
  {
    schema_version: "1.0",
    generated_at:   "",
    primitives:     [],
    edges:          [],
  },
  null,
  2,
);

export const EMPTY_INBOX_TEMPLATE = (recipient: string): string =>
  JSON.stringify({ recipient, messages: [] }, null, 2);

/**
 * Lists ontology-state JSON files that would be reset under CLEAN_STATE=1.
 * Returns absolute paths.
 */
export function listOntologyStateFiles(root: string): string[] {
  const dir = path.join(root, "ontology-state");
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/**
 * Lists inbox-*.json files under .palantir-mini/session/.
 * Returns absolute paths.
 */
export function listInboxFiles(root: string): string[] {
  const dir = path.join(root, ".palantir-mini", "session");
  if (!fs.existsSync(dir)) return [];
  try {
    return fs.readdirSync(dir)
      .filter((f) => f.startsWith("inbox-") && f.endsWith(".json"))
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/**
 * Resets a single ontology-state JSON file to the empty template.
 * Never touches events.jsonl.
 */
export function resetOntologyStateFile(file: string): void {
  fs.writeFileSync(file, EMPTY_ONTOLOGY_STATE_TEMPLATE + "\n", "utf8");
}

/**
 * Truncates an inbox-*.json file to an empty-messages template.
 * Recipient name is derived from filename (inbox-<name>.json).
 */
export function resetInboxFile(file: string): void {
  const base = path.basename(file, ".json");
  const recipient = base.replace(/^inbox-/, "") || "unknown";
  fs.writeFileSync(file, EMPTY_INBOX_TEMPLATE(recipient) + "\n", "utf8");
}

/**
 * Identifies prior-session state files whose modification timestamp predates
 * the current session boot by at least 60 seconds. Used to decide whether to
 * warn about stale state when CLEAN_STATE is unset.
 */
export function detectStaleState(root: string): string[] {
  const now = Date.now();
  const files: string[] = [];
  for (const f of listOntologyStateFiles(root)) {
    try {
      const stat = fs.statSync(f);
      if (stat.size > 0 && (now - stat.mtimeMs) > 60_000) files.push(f);
    } catch { /* skip */ }
  }
  for (const f of listInboxFiles(root)) {
    try {
      const stat = fs.statSync(f);
      if (stat.size > 0 && (now - stat.mtimeMs) > 60_000) files.push(f);
    } catch { /* skip */ }
  }
  return files;
}
