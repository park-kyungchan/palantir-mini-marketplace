// palantir-mini v3.9.0 — harness-analyzer-trigger hook (W3.0, P2)
// Fires on: PostToolUse with matcher mcp__plugin_palantir-mini_palantir-mini__grade_outcome_with_rubric
//
// Per harness-base-mode blueprint §4-P2 + cold-start §1 W3.0:
// closes AI-FDE step 6 (synthesize failure mode) for EVERY failed iteration
// (was only iter≥3 in v3.8.x — pre-W3.0 trigger never existed; this hook
// CREATES the per-iter analyzer-spawn substrate).
//
// Pattern (per Plan agent §1 — hooks cannot directly spawn Agent()):
//   1. Inspect tool_response for verdict (failedCriteria > 0)
//   2. Skip pass-verdict (no analyzer needed)
//   3. Skip iteration < 1
//   4. Idempotency key = `<sprintNumber>-<iteration>-<rubricId>` —
//      file-existence check makes re-fires no-op
//   5. Write request marker /tmp/claude-hooks/<sessionId>/analyzer-request-<key>.json
//   6. Emit phase_completed phaseTag="harness-analyzer-fire-pending"
//   7. Lead reads marker on next turn → spawns harness-analyzer via skill or Agent()
//
// Marker GC: SessionStart cleans /tmp/claude-hooks/<sessionId>/ — request lives
// only as long as the session. Acceptable for an advisory trigger.
//
// Authority: ~/.claude/rules/16-3-agent-harness.md §Loop (post-W3.2 v3.2.0)
//            ~/.claude/plans/glowing-frolicking-raven.md §1 W3.0
//            ~/.claude/plans/2026-04-28-harness-base-mode-blueprint.md §4-P2

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { emit } from "../scripts/log";
import { normalizePalantirMiniMcpToolName } from "../lib/hooks/tool-classifier";

const TARGET_TOOL = "grade_outcome_with_rubric";

interface HookPayload {
  cwd?:           string;
  session_id?:    string;
  tool_name?:     string;
  tool_input?: {
    rubric?:        { rubricId?: string };
    sprintNumber?:  number;
    iteration?:     number;
    projectPath?:   string;
  };
  tool_response?: {
    rubricId?:        string;
    overallScore?:    number;
    maxPossibleScore?: number;
    passedCriteria?:  number;
    failedCriteria?:  number;
    /** v4.5.0 W2.A1: ordered array of criterionIds where passFail === "fail". */
    failedCriteriaIds?: string[];
    perCriterion?:    Array<{ criterionId?: string; passFail?: "pass" | "fail" | "needs_human_review" }>;
  };
}

interface HookResult {
  message:           string;
  decision?:         "continue";
  reason?:           string;
  additionalContext?: string;
}

/** Resolve marker dir under /tmp/claude-hooks/<sessionId>/. Idempotent mkdir. */
function ensureMarkerDir(sessionId: string): string {
  const dir = path.join(os.tmpdir(), "claude-hooks", sessionId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Derive verdict: fail if failedCriteria > 0 OR any perCriterion.passFail === "fail". */
function deriveFailedCount(resp: HookPayload["tool_response"]): number {
  if (!resp) return 0;
  if (typeof resp.failedCriteria === "number") return resp.failedCriteria;
  if (Array.isArray(resp.perCriterion)) {
    return resp.perCriterion.filter((c) => c.passFail === "fail").length;
  }
  return 0;
}

/**
 * Derive the list of failed criterionIds.
 * v4.5.0 W2.A1: prefer explicit failedCriteriaIds[] (populated by grade-outcome-with-rubric
 * handler); fall back to scanning perCriterion[] for passFail==="fail" entries.
 */
function deriveFailedCriteriaIds(resp: HookPayload["tool_response"]): string[] {
  if (!resp) return [];
  if (Array.isArray(resp.failedCriteriaIds) && resp.failedCriteriaIds.length > 0) {
    return resp.failedCriteriaIds;
  }
  if (Array.isArray(resp.perCriterion)) {
    return resp.perCriterion
      .filter((c) => c.passFail === "fail" && typeof c.criterionId === "string")
      .map((c) => c.criterionId as string);
  }
  return [];
}

export default async function harnessAnalyzerTrigger(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const toolName = p.tool_name ?? "";

  // Skip non-target tool
  if (normalizePalantirMiniMcpToolName(toolName) !== TARGET_TOOL) {
    return { message: `palantir-mini: harness-analyzer-trigger skipped (tool=${toolName})`, decision: "continue" };
  }

  const cwd = p.cwd ?? process.cwd();
  const sessionId = p.session_id ?? "no-session";

  // Verdict gate — only fire on fail
  const failedCount = deriveFailedCount(p.tool_response);
  if (failedCount === 0) {
    return { message: `palantir-mini: harness-analyzer-trigger skipped (verdict=pass)`, decision: "continue" };
  }

  // Iteration gate
  const iteration = p.tool_input?.iteration ?? p.tool_response?.["iteration" as keyof typeof p.tool_response] as number | undefined;
  if (typeof iteration !== "number" || iteration < 1) {
    return { message: `palantir-mini: harness-analyzer-trigger skipped (iteration<1 or missing)`, decision: "continue" };
  }

  // Build idempotency key
  const sprintNumber = p.tool_input?.sprintNumber ?? -1;
  const rubricId = p.tool_input?.rubric?.rubricId ?? p.tool_response?.rubricId ?? "no-rubric";
  const key = `${sprintNumber}-${iteration}-${rubricId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

  // Idempotent marker write
  const markerDir = ensureMarkerDir(sessionId);
  const markerPath = path.join(markerDir, `analyzer-request-${key}.json`);

  if (fs.existsSync(markerPath)) {
    // Re-fire = no-op (idempotency)
    return {
      message: `palantir-mini: harness-analyzer-trigger no-op (marker exists for ${key})`,
      decision: "continue",
    };
  }

  const project = p.tool_input?.projectPath ?? cwd;
  const failedCriteriaIds = deriveFailedCriteriaIds(p.tool_response);
  const markerPayload = {
    sprintNumber,
    iteration,
    rubricId,
    project,
    failedCount,
    /** v4.5.0 W2.A1: ordered list of failed criterionIds for harness-analyzer context. */
    failedCriteriaIds,
    requestedAt: new Date().toISOString(),
    sessionId,
  };

  try {
    fs.writeFileSync(markerPath, JSON.stringify(markerPayload, null, 2), "utf8");
  } catch (e) {
    return {
      message: `palantir-mini: harness-analyzer-trigger marker write failed: ${(e as Error).message}`,
      decision: "continue",
    };
  }

  // Emit phase_completed event so Lead's next-turn pickup can replay this request.
  try {
    await emit({
      type: "phase_completed",
      payload: {
        phaseTag: "harness-analyzer-fire-pending",
        taskId: `sprint-${sprintNumber}-iteration-${iteration}-analyzer-request`,
        validations: ["request-file-written", "verdict-fail-confirmed", "iteration-ge-1"],
      },
      toolName: "harness-analyzer-trigger",
      cwd: project,
      sessionId,
      identity: "monitor",
      reasoning: `harness-analyzer trigger queued: marker=${markerPath} sprint=${sprintNumber} iter=${iteration} failed=${failedCount} rubric=${rubricId}`,
    });
  } catch {
    // best-effort
  }

  return {
    message: `palantir-mini: harness-analyzer-trigger queued (key=${key}, marker=${path.basename(markerPath)})`,
    decision: "continue",
    additionalContext: [
      "=== HARNESS ANALYZER TRIGGER QUEUED (W3.0) ===",
      `Sprint ${sprintNumber} iteration ${iteration} failed (${failedCount} criterion(a)).`,
      `Lead: spawn the harness-analyzer subagent to synthesize the failure mode.`,
      `Marker: ${markerPath}`,
      `Skill: /palantir-mini:pm-harness-analyze`,
      `Rule 16 v3.2.0 §Loop step 6 (revise).`,
    ].join("\n"),
  };
}
