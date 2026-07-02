#!/usr/bin/env bun
/**
 * verify-event-registry-changelog — schemas v1.17+ maintenance script
 *
 * Cross-checks `ontology/lineage/event-types.ts` `EVENT_TYPE_NAMES` array
 * against `CHANGELOG.md` to ensure every registered event type is mentioned
 * in at least one version's `### Added` section.
 *
 * Prevents the silent-break class: new event type added to the registry
 * without a CHANGELOG entry → consumers pinning a compatible range pull the
 * bump but see no documentation about the new surface.
 *
 * Complement to A1 (verify_schema_pin handler) which validates the version
 * number; this script validates the CONTENT of the version.
 *
 * Exit codes:
 *   0 — every registered event name mentioned in CHANGELOG
 *   2 — one or more events missing from CHANGELOG (diff printed to stderr)
 *   1 — could not locate event-types.ts or CHANGELOG.md (environment error)
 *
 * Usage:
 *   bun run scripts/verify-event-registry-changelog.ts
 *   (exit-2 suitable for a PreToolUse / PostToolUse hook on event-types.ts edits)
 */

import * as fs from "fs";
import * as path from "path";

const EVENT_TYPES_FILE = path.resolve(__dirname, "..", "ontology", "lineage", "event-types.ts");
const CHANGELOG_FILE   = path.resolve(__dirname, "..", "CHANGELOG.md");

/**
 * Events registered before the comprehensive-citation convention took hold
 * (pre-v1.14). These are grandfathered — not required to be cited. New
 * events added in v1.14+ MUST be cited. To enforce against the full
 * registry regardless of vintage, pass --strict.
 *
 * Remediation path for legacy exemptions: if a consumer wants a particular
 * legacy event documented, open a CHANGELOG backfill PR + remove from this
 * set. Do not silently expand this set — each entry is a historical-only
 * exemption.
 */
export const LEGACY_EVENTS_EXEMPT: ReadonlySet<string> = new Set([
  "edit_proposed",
  "edit_committed",
  "submission_criteria_failed",
  "validation_phase_completed",
  "codegen_started",
  "codegen_completed",
  "phase_completed",
  "drift_detected",
  "session_started",
  "session_ended",
  "scenario_created",
  "doc_drift_detected",
  "session_resumed",
  "research_library_refreshed",
  "research_library_pruned",
  "claude_code_version_checked",
  "research_docs_drift_detected",
  "orphan_event_reconciled",
]);

/** Parse `EVENT_TYPE_NAMES` array literal from event-types.ts. Regex-based
 *  because a full TS AST walk would add a ts-morph dep for no benefit here —
 *  the array is a literal `[ "..." , ... ]` whose shape does not drift. */
export function extractEventTypeNames(source: string): string[] {
  const m = source.match(/export const EVENT_TYPE_NAMES\s*=\s*\[([\s\S]*?)\]\s*as\s+const/);
  if (!m) return [];
  const body = m[1] ?? "";
  const names: string[] = [];
  for (const raw of body.split("\n")) {
    const quoted = raw.match(/^\s*"([a-z_][a-z0-9_]*)"\s*,?\s*(?:\/\/.*)?$/i);
    if (quoted) names.push(quoted[1]!);
  }
  return names;
}

/** Extract every `### Added` section body from CHANGELOG. Returns the joined
 *  text so downstream membership checks are a simple includes(). */
export function extractChangelogAddedBlocks(source: string): string {
  const blocks: string[] = [];
  const lines = source.split("\n");
  let inAdded = false;
  for (const line of lines) {
    if (/^### /.test(line)) {
      inAdded = /^### (Added|\bAdded\b)/.test(line);
      if (inAdded) blocks.push(line);
      continue;
    }
    if (inAdded) blocks.push(line);
  }
  return blocks.join("\n");
}

/** Returns the list of event names that are NOT mentioned in any Added block.
 *  Matching is "name appears as `` `name` `` OR `name` bare in the text". Both
 *  forms observed in CHANGELOG entries. */
export function findUncitedEvents(names: string[], addedText: string): string[] {
  const uncited: string[] = [];
  for (const n of names) {
    const backtickForm = new RegExp("`" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "`");
    const bareForm     = new RegExp("(?:^|[\\s,])" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?:[\\s,.]|$)", "m");
    if (!backtickForm.test(addedText) && !bareForm.test(addedText)) {
      uncited.push(n);
    }
  }
  return uncited;
}

function main(): number {
  const strict = process.argv.includes("--strict");
  if (!fs.existsSync(EVENT_TYPES_FILE)) {
    console.error(`verify-event-registry-changelog: missing ${EVENT_TYPES_FILE}`);
    return 1;
  }
  if (!fs.existsSync(CHANGELOG_FILE)) {
    console.error(`verify-event-registry-changelog: missing ${CHANGELOG_FILE}`);
    return 1;
  }
  const names      = extractEventTypeNames(fs.readFileSync(EVENT_TYPES_FILE, "utf8"));
  const addedText  = extractChangelogAddedBlocks(fs.readFileSync(CHANGELOG_FILE, "utf8"));
  if (names.length === 0) {
    console.error("verify-event-registry-changelog: EVENT_TYPE_NAMES empty or unparseable");
    return 1;
  }
  const uncitedAll = findUncitedEvents(names, addedText);
  const uncited    = strict ? uncitedAll : uncitedAll.filter((n) => !LEGACY_EVENTS_EXEMPT.has(n));
  const exemptMissing = strict ? [] : uncitedAll.filter((n) => LEGACY_EVENTS_EXEMPT.has(n));
  if (uncited.length === 0) {
    const modeLabel = strict ? "--strict" : "forward-only";
    console.log(`verify-event-registry-changelog: PASS (${modeLabel}) — ${names.length - exemptMissing.length}/${names.length} enforced event types cited; ${exemptMissing.length} legacy exempt`);
    return 0;
  }
  const modeLabel = strict ? "strict" : "forward-only";
  console.error(`verify-event-registry-changelog: FAIL (${modeLabel}) — ${uncited.length}/${names.length} event types uncited:`);
  for (const n of uncited) console.error(`  - ${n}`);
  console.error(`\nRemediation: add a CHANGELOG entry under the MINOR bump that introduced each event, OR add to LEGACY_EVENTS_EXEMPT if it predates the citation convention. See rules/08-schema-versioning.md.`);
  return 2;
}

// Bun/Node script entrypoint
if (import.meta.main === true || require.main === module) {
  process.exit(main());
}
