// palantir-mini PR 5.5 (sprint-116) — Per-agent isolated correlation marker
//
// Problem: subagent-orchestration-audit.ts writes timestamp-keyed JSON files to
// a shared <sessionDir>/.subagent-correlations/ directory. agent-decision-log.ts
// reads the most-recently-sorted file from that directory to resolve correlationId.
// When ≥2 subagents run concurrently this produces misattribution: both reads pick
// up the same (latest) file, coupling events from agent B to agent A's correlationId.
//
// Fix: bind correlationId to a per-agent isolated marker file keyed by
// sessionId + subagentId at:
//   <projectRoot>/.palantir-mini/session/correlation-markers/<sessionId>/<subagentId>.json
//
// The per-subagentId filename guarantees at-most-one writer per subagent instance.
// readCorrelationMarker resolves from the same path — no iteration, no race.
//
// Backward compat: if subagentId is absent, the caller falls back to legacy dir.
//
// Authority: canonical plan v2 §4 row 5.5 + rule 12 §Subagent decision audit invariant
// Cross-refs: hooks/subagent-orchestration-audit.ts (writer), hooks/agent-decision-log.ts (reader)

import * as fs   from "fs";
import * as path from "path";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Stored shape of a per-agent correlation marker. */
export interface CorrelationMarker {
  /** UUIDv4 correlationId allocated at subagent spawn. */
  correlationId: string;
  /** Session identifier (CLAUDE_SESSION_ID or equivalent). */
  sessionId:     string;
  /** Stable per-subagent identifier — agent_id from SubagentStart payload or Agent tool output. */
  subagentId:    string;
  /** Resolved human-readable agent name (e.g. "implementer"). */
  agentName:     string;
  /** ISO8601 timestamp of spawn. */
  spawnedAt:     string;
  /** Optional: additional spawn metadata fields (model, promptDigest, etc.) */
  [key: string]: unknown;
}

/** Options for writeCorrelationMarker. */
export interface WriteMarkerOpts {
  /** Absolute project root (contains .palantir-mini/). */
  projectRoot:   string;
  sessionId:     string;
  subagentId:    string;
  correlationId: string;
  agentName:     string;
  spawnedAt?:    string;
  /** Additional metadata to merge into the marker file (e.g. model, promptDigest). */
  extra?:        Record<string, unknown>;
}

/** Options for readCorrelationMarker. */
export interface ReadMarkerOpts {
  /** Absolute project root (contains .palantir-mini/). */
  projectRoot: string;
  sessionId:   string;
  subagentId:  string;
}

// ─── Path helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the directory that holds all per-agent marker files for a session.
 * <projectRoot>/.palantir-mini/session/correlation-markers/<sessionId>/
 */
function sessionMarkerDir(projectRoot: string, sessionId: string): string {
  return path.join(
    projectRoot,
    ".palantir-mini",
    "session",
    "correlation-markers",
    sessionId,
  );
}

/**
 * Returns the full path of the per-agent marker file.
 * <sessionDir>/<subagentId>.json
 */
function markerFilePath(projectRoot: string, sessionId: string, subagentId: string): string {
  return path.join(sessionMarkerDir(projectRoot, sessionId), `${subagentId}.json`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Write a per-agent isolated correlation marker file.
 *
 * Idempotent: if a file already exists for this subagentId, it is overwritten
 * (last-writer wins; the same subagent should never spawn twice, so this is
 * effectively idempotent in practice).
 *
 * Never throws — returns false on any I/O error (best-effort, never blocks spawn).
 */
export function writeCorrelationMarker(opts: WriteMarkerOpts): boolean {
  try {
    const dir = sessionMarkerDir(opts.projectRoot, opts.sessionId);
    fs.mkdirSync(dir, { recursive: true });

    const marker: CorrelationMarker = {
      correlationId: opts.correlationId,
      sessionId:     opts.sessionId,
      subagentId:    opts.subagentId,
      agentName:     opts.agentName,
      spawnedAt:     opts.spawnedAt ?? new Date().toISOString(),
      ...(opts.extra ?? {}),
    };

    fs.writeFileSync(
      markerFilePath(opts.projectRoot, opts.sessionId, opts.subagentId),
      JSON.stringify(marker, null, 2),
      "utf8",
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Read the per-agent correlation marker for a specific subagent.
 *
 * Returns the parsed CorrelationMarker when the file exists and is valid JSON,
 * or null otherwise.  Never throws.
 */
export function readCorrelationMarker(opts: ReadMarkerOpts): CorrelationMarker | null {
  try {
    const filePath = markerFilePath(opts.projectRoot, opts.sessionId, opts.subagentId);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf8");
    const obj = JSON.parse(raw) as CorrelationMarker;
    if (typeof obj.correlationId !== "string") return null;
    return obj;
  } catch {
    return null;
  }
}

/**
 * Read ALL per-agent correlation markers for a session.
 *
 * Returns an array (may be empty) sorted by spawnedAt ascending.
 * Silently skips files that fail to parse.  Never throws.
 */
export function readAllMarkersForSession(
  projectRoot: string,
  sessionId:   string,
): CorrelationMarker[] {
  try {
    const dir = sessionMarkerDir(projectRoot, sessionId);
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
    const markers: CorrelationMarker[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf8");
        const obj = JSON.parse(raw) as CorrelationMarker;
        if (typeof obj.correlationId === "string") {
          markers.push(obj);
        }
      } catch {
        // skip malformed file
      }
    }
    markers.sort((a, b) => {
      const ta = typeof a.spawnedAt === "string" ? a.spawnedAt : "";
      const tb = typeof b.spawnedAt === "string" ? b.spawnedAt : "";
      return ta.localeCompare(tb);
    });
    return markers;
  } catch {
    return [];
  }
}
