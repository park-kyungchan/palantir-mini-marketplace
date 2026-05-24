// palantir-mini v3.11.0 — analyzer-marker-pickup hook (W3.1d, P2 closure)
// Fires on: SessionStart matcher startup
//
// Per closing-tasks doc CT-3 (~/.claude/plans/2026-04-29-harness-base-mode-closing-tasks.md):
// W3.0 trigger writes /tmp/claude-hooks/<sessionId>/analyzer-request-*.json markers
// when grade_outcome_with_rubric returns fail-verdict at iteration ≥ 1. Hooks cannot
// directly spawn agents (Plan agent §1) so previously the loop required Lead to
// manually pick up the marker via /palantir-mini:pm-harness-sprint Phase 2 step 3.5.
// If Lead context-compacts mid-sprint or skips the step, marker gets stranded.
//
// This hook surfaces stranded markers as advisory `additionalContext` at
// SessionStart, prompting Lead's next turn to spawn harness-analyzer.
//
// Idempotency: marker file persists until analyzer-output-injector consumes it
// (SubagentStop on harness-analyzer cleans up via marker glob in its lifecycle
// extension). Re-firing this hook just re-surfaces the same markers — safe.
//
// Authority: rule 16 (3-agent-harness) §Loop step 6 (post-W3.2 v3.2.0) —
//            surfaces stranded analyzer markers to Lead at SessionStart so the
//            harness evaluation loop closes even after context compaction.
//            ~/.claude/plans/2026-04-29-harness-base-mode-closing-tasks.md CT-3

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { emit } from "../scripts/log";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:           string;
  decision?:         "continue";
  additionalContext?: string;
}

interface MarkerEntry {
  sprintNumber: number;
  iteration:    number;
  rubricId:     string;
  project:      string;
  failedCount:  number;
  requestedAt:  string;
  sessionId:    string;
  markerPath:   string;
}

/** Resolve marker dir under /tmp/claude-hooks/<sessionId>/. */
export function resolveMarkerDir(sessionId: string): string {
  return path.join(os.tmpdir(), "claude-hooks", sessionId);
}

/** Scan marker dir for analyzer-request-*.json; return parsed entries (skips malformed). */
export function scanMarkers(markerDir: string): MarkerEntry[] {
  if (!fs.existsSync(markerDir)) return [];
  let files: string[];
  try {
    files = fs.readdirSync(markerDir);
  } catch {
    return [];
  }

  const entries: MarkerEntry[] = [];
  for (const f of files) {
    if (!/^analyzer-request-.*\.json$/.test(f)) continue;
    const fullPath = path.join(markerDir, f);
    let body: string;
    try {
      body = fs.readFileSync(fullPath, "utf8");
    } catch {
      continue;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(body);
    } catch {
      continue;
    }
    if (
      typeof parsed.sprintNumber !== "number" ||
      typeof parsed.iteration !== "number" ||
      typeof parsed.rubricId !== "string" ||
      typeof parsed.project !== "string"
    ) {
      continue;
    }
    entries.push({
      sprintNumber: parsed.sprintNumber,
      iteration:    parsed.iteration,
      rubricId:     parsed.rubricId,
      project:      parsed.project,
      failedCount:  typeof parsed.failedCount === "number" ? parsed.failedCount : 0,
      requestedAt:  typeof parsed.requestedAt === "string" ? parsed.requestedAt : "",
      sessionId:    typeof parsed.sessionId === "string" ? parsed.sessionId : "",
      markerPath:   fullPath,
    });
  }

  // Stable sort: oldest requestedAt first (FIFO surfacing)
  entries.sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));
  return entries;
}

/** Build human-readable additionalContext lines. Caller joins with '\n'. */
export function buildPickupContext(entries: MarkerEntry[]): string[] {
  const lines = [
    "=== HARNESS ANALYZER PICKUP PENDING (W3.1d) ===",
    `${entries.length} stranded analyzer-request marker(s) from prior iteration(s):`,
    "",
  ];
  for (const e of entries) {
    lines.push(
      `  sprint ${e.sprintNumber} iter ${e.iteration} rubric ${e.rubricId} (${e.failedCount} failed)`,
    );
    lines.push(`    project: ${e.project}`);
    lines.push(`    spawn: /palantir-mini:pm-harness-analyze ${e.sprintNumber} ${e.iteration}`);
  }
  lines.push("");
  lines.push("Lead: spawn harness-analyzer subagent for each pending request to close W3.0+W3.1b loop.");
  lines.push("Markers persist until consumed by analyzer-output-injector on SubagentStop.");
  return lines;
}

export default async function analyzerMarkerPickup(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const sessionId =
    p.session_id ?? process.env.PALANTIR_MINI_SESSION_ID ?? "no-session";

  const markerDir = resolveMarkerDir(sessionId);
  const entries = scanMarkers(markerDir);

  if (entries.length === 0) {
    return {
      message: "palantir-mini: analyzer-marker-pickup — no pending markers",
      decision: "continue",
    };
  }

  const lines = buildPickupContext(entries);

  // Single advisory event with all pending markers in payload
  try {
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag: "harness-analyzer-pickup-pending",
        taskId: `session-${sessionId}-analyzer-pickup`,
        validations: ["markers-scanned", "additional-context-emitted"],
      },
      toolName: "analyzer-marker-pickup",
      cwd: p.cwd ?? process.cwd(),
      sessionId,
      identity: "monitor",
      reasoning: `${entries.length} analyzer-request markers pending pickup: ${entries
        .map((e) => `sprint-${e.sprintNumber}-iter-${e.iteration}`)
        .join(", ")}`,
    });
  } catch {
    // best-effort
  }

  return {
    message: `palantir-mini: analyzer-marker-pickup — ${entries.length} pending`,
    decision: "continue",
    additionalContext: lines.join("\n"),
  };
}
