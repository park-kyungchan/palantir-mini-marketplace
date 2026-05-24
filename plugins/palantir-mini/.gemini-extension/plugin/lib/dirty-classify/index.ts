/**
 * palantir-mini v4.9.0 / sprint-055 W2 — 4-axis dirty-file classifier.
 *
 * Pure function module. Classifies `git status --porcelain` lines into 4
 * disjoint axes:
 *
 *   - `auto-regen`        — files regenerated automatically by tooling
 *                           (chrome-native-host, .codex-plugin/plugin.json,
 *                           .cursor-plugin/plugin.json, src/generated/**).
 *                           Safe to auto-stage at session-end.
 *   - `runtime-substrate` — palantir-mini runtime artifacts that SHOULD
 *                           remain in working-tree but typically gitignored
 *                           (events.jsonl, outcome-pairs/, .last-cleanup,
 *                           user-prompt-profile.json, scheduled_tasks.lock).
 *                           If currently tracked-but-ignored: stage delete;
 *                           if untracked: leave to .gitignore.
 *   - `user-WIP`          — any tracked .ts/.tsx/.md/.json edit NOT in
 *                           auto-regen and NOT in runtime-substrate.
 *                           Preserve untouched. Pre-PR gate uses this set
 *                           to decide block-vs-continue based on sprint
 *                           scope.
 *   - `ephemeral`         — transcripts under tracked-project directories
 *                           (.claude/projects/-home-palantirkc-projects-*) and
 *                           home session subdirs (.claude/projects/-home-palantirkc/SESSION_ID/).
 *                           Should be gitignored; if listed in `git status`
 *                           it's because the gitignore pattern is missing.
 *
 * Used by:
 *   - hooks/session-start-dirty-classify.ts (advisory + auto-stage when strict)
 *   - hooks/pre-pr-dirty-gate.ts             (block when user-WIP outside scope)
 *   - hooks/session-end-cleanup.ts           (auto-stage auto-regen at Stop)
 *   - skills/pm-dirty-classify                (manual triage)
 *
 * Authority: ~/.claude/rules/25-auto-merge-cleanup-default.md v1.1.0+ §Wave-split policy.
 */

import * as path from "path";

export type DirtyAxis = "auto-regen" | "runtime-substrate" | "user-WIP" | "ephemeral";

export interface DirtyEntry {
  /** git status code: 'M', 'A', 'D', 'R', '??', etc. */
  readonly status: string;
  /** Path relative to repo root. */
  readonly path:   string;
  /** Classified axis. */
  readonly axis:   DirtyAxis;
  /** Suggested next action by axis ('stage' / 'leave' / 'preserve' / 'gitignore'). */
  readonly action: "stage" | "leave" | "preserve" | "gitignore";
  /** Why this classification matched (rule-engine reason for debugability). */
  readonly reason: string;
}

export interface DirtyClassifyResult {
  total:   number;
  byAxis:  Record<DirtyAxis, number>;
  entries: readonly DirtyEntry[];
}

/* ─── Pattern tables (extend here, not in callers) ───────────────────── */

const AUTO_REGEN_PATTERNS: ReadonlyArray<{ regex: RegExp; reason: string }> = [
  { regex: /^\.claude\/chrome\/chrome-native-host(\.|$|\/)/,                              reason: "chrome native host installer regen" },
  { regex: /^\.claude\/plugins\/palantir-mini\/\.codex-plugin\/plugin\.json$/,            reason: "codex sibling manifest sync target" },
  { regex: /^\.claude\/plugins\/palantir-mini\/\.cursor-plugin\/plugin\.json$/,           reason: "cursor sibling manifest sync target" },
  { regex: /^src\/generated\//,                                                            reason: "codegen output (rule 08)" },
  { regex: /^.+\/src\/generated\//,                                                        reason: "codegen output (rule 08, nested project)" },
  { regex: /^\.claude\/schemas\/src\/generated\//,                                         reason: "claude-schemas codegen output" },
];

const RUNTIME_SUBSTRATE_PATTERNS: ReadonlyArray<{ regex: RegExp; reason: string }> = [
  { regex: /\.palantir-mini\/session\/events\.jsonl$/,           reason: "events.jsonl append-only substrate (rule 10)" },
  { regex: /\.palantir-mini\/session\/outcome-pairs\//,          reason: "outcome-pair lifecycle markers" },
  { regex: /\.palantir-mini\/session\/\.session-ended-markers\//, reason: "session-ended idempotency markers (rule 26 §R1)" },
  { regex: /^\.claude\/\.last-cleanup$/,                          reason: "last-cleanup heartbeat" },
  { regex: /^\.claude\/scheduled_tasks\.lock$/,                   reason: "CronCreate session lock" },
  { regex: /^\.claude\/scheduled_tasks\.json$/,                   reason: "CronCreate durable persistence (when present)" },
  { regex: /^\.claude\/hooks\/user-prompt-profile\.json$/,        reason: "user-prompt-profile auto-mutated by hooks" },
];

const EPHEMERAL_PATTERNS: ReadonlyArray<{ regex: RegExp; reason: string }> = [
  // Any tracked-project subdir under .claude/projects/<scope>/<id>/ — covers
  // both old (-home-palantirkc-palantir-math) and new (-home-palantirkc-projects-X)
  // layouts. Matches transcript .jsonl files + UUID-named session subdirs +
  // tool-results subtrees.
  { regex: /^\.claude\/projects\/[^\/]+\/[^\/]+\.jsonl$/,    reason: "tracked-project transcript" },
  { regex: /^\.claude\/projects\/[^\/]+\/[^\/]+\/.+/,        reason: "tracked-project session subdir content" },
  { regex: /^\.claude\/projects\/[^\/]+\/[^\/]+\/$/,         reason: "tracked-project session subdir" },
  { regex: /^\.claude\/projects\/[^\/]+\/[a-zA-Z0-9-]+$/,    reason: "tracked-project session subdir bare" },
  { regex: /^\/tmp\//,                                       reason: "tmp file" },
  { regex: /\.tmp$/,                                         reason: "tmp file extension" },
];

/* ─── Classifier ─────────────────────────────────────────────────────── */

export function classifyPath(relPath: string): { axis: DirtyAxis; reason: string } {
  // Normalize to forward slash.
  const p = relPath.replace(/\\/g, "/");

  for (const { regex, reason } of AUTO_REGEN_PATTERNS) {
    if (regex.test(p)) return { axis: "auto-regen", reason };
  }
  for (const { regex, reason } of RUNTIME_SUBSTRATE_PATTERNS) {
    if (regex.test(p)) return { axis: "runtime-substrate", reason };
  }
  for (const { regex, reason } of EPHEMERAL_PATTERNS) {
    if (regex.test(p)) return { axis: "ephemeral", reason };
  }
  return { axis: "user-WIP", reason: "no pattern match — defaults to user-WIP" };
}

const AXIS_TO_ACTION: Record<DirtyAxis, DirtyEntry["action"]> = {
  "auto-regen":         "stage",
  "runtime-substrate":  "leave",
  "user-WIP":           "preserve",
  "ephemeral":          "gitignore",
};

/**
 * Parse a single `git status --porcelain` line.
 * Format: "XY <path>" where XY are status codes.
 */
export function parsePorcelainLine(line: string): { status: string; path: string } | null {
  const trimmed = line.replace(/\r$/, "");
  if (trimmed.length < 4) return null;
  const status = trimmed.slice(0, 2).trim() || "??";
  const rest   = trimmed.slice(3);
  // Handle rename "old -> new" — return the new path
  const renameIdx = rest.indexOf(" -> ");
  const targetPath = renameIdx >= 0 ? rest.slice(renameIdx + 4) : rest;
  // Strip surrounding quotes (for paths with spaces)
  const cleanPath = targetPath.replace(/^"(.*)"$/, "$1");
  return { status, path: cleanPath };
}

/**
 * Classify a `git status --porcelain` output (multi-line string).
 */
export function classifyDirty(porcelainOutput: string): DirtyClassifyResult {
  const lines = porcelainOutput.split("\n").filter((l) => l.trim().length > 0);
  const entries: DirtyEntry[] = [];
  const byAxis: Record<DirtyAxis, number> = {
    "auto-regen":         0,
    "runtime-substrate":  0,
    "user-WIP":           0,
    "ephemeral":          0,
  };

  for (const line of lines) {
    const parsed = parsePorcelainLine(line);
    if (!parsed) continue;
    const { axis, reason } = classifyPath(parsed.path);
    byAxis[axis] += 1;
    entries.push({
      status: parsed.status,
      path:   parsed.path,
      axis,
      action: AXIS_TO_ACTION[axis],
      reason,
    });
  }

  return { total: entries.length, byAxis, entries };
}

/**
 * Filter entries by axis.
 */
export function entriesByAxis(result: DirtyClassifyResult, axis: DirtyAxis): readonly DirtyEntry[] {
  return result.entries.filter((e) => e.axis === axis);
}

/**
 * Pretty-printer (used by skill + hook advisory output).
 */
export function formatSummary(result: DirtyClassifyResult): string {
  const lines = [
    `Total dirty: ${result.total}`,
    `  auto-regen:         ${result.byAxis["auto-regen"]} (action: stage)`,
    `  runtime-substrate:  ${result.byAxis["runtime-substrate"]} (action: leave/gitignore)`,
    `  user-WIP:           ${result.byAxis["user-WIP"]} (action: preserve)`,
    `  ephemeral:          ${result.byAxis["ephemeral"]} (action: should be gitignored)`,
  ];
  return lines.join("\n");
}

/**
 * Detect if a user-WIP path is OUTSIDE the declared sprint scope.
 *
 * `scopePrefixes` — array of path-prefix strings or globs (relative to repo
 * root) that the active sprint declares as its working set. Anything outside
 * is flagged as out-of-scope.
 *
 * Empty `scopePrefixes` array → treats every user-WIP as in-scope (no block).
 */
export function isOutOfScope(entry: DirtyEntry, scopePrefixes: readonly string[]): boolean {
  if (entry.axis !== "user-WIP") return false;
  if (scopePrefixes.length === 0) return false;
  return !scopePrefixes.some((prefix) =>
    entry.path === prefix ||
    entry.path.startsWith(prefix.endsWith("/") ? prefix : prefix + "/") ||
    matchesGlobPrefix(entry.path, prefix),
  );
}

/** Lightweight glob matcher — only handles `*` and `**` prefixes. */
function matchesGlobPrefix(filePath: string, glob: string): boolean {
  if (!glob.includes("*")) return false;
  // Convert glob to regex anchored at start.
  const regexBody = glob
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "::DSTAR::")
    .replace(/\*/g, "[^/]*")
    .replace(/::DSTAR::/g, ".*");
  return new RegExp(`^${regexBody}`).test(filePath);
}

/** Re-export path for caller convenience (avoid importing from node:path repeatedly). */
export { path };
