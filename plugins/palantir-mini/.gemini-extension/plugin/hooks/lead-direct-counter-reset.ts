// palantir-mini — lead-direct-counter-reset hook (sprint-059 W1.3; P0 Blocker B3 / R3-F1)
// Fires on: SessionStart (async advisory)
//
// PURPOSE: Reset the session-cumulative Lead-direct edit counter to {count:0}
// on every SessionStart. Without this reset, the counter at
//   <projectRoot>/.palantir-mini/session/.lead-direct-edit-counter.json
// was monotonic-increment-only across sessions and sprints, reaching count=131
// (2026-05-07 audit) with 117 zero-followthrough block events. Rule 12 v3.4.0
// §Lead-direct edit threshold is meaningless without session-boundary resets.
//
// Semantics:
//   - Resets ONLY the session-cumulative counter (global to the project session dir).
//   - Does NOT touch per-sprint counters at
//       <sprintDir>/.lead-direct-edit-counter.json  ← sprint-scoped, intentionally preserved.
//   - Does NOT delete the counter file (only zeros count, nulls timestamp).
//   - Creates the counter file + session dir if not yet present.
//   - Emits validation_phase_completed errorClass="lead_direct_counter_reset" (5-dim, rule 10).
//
// Cross-ref: rule 12 v3.4.0 §Lead-direct edit threshold; rule 10 §Substrate invariant.
//
// async: true — advisory; never blocks SessionStart.
// timeout: 5 seconds.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot } from "./harness-base-mode-advisory";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
  tool_name?:  string;
}

interface CounterFile {
  count:             number;
  lastEditTimestamp: string | null;  // null after session reset; string after first edit
}

interface HookResult {
  message: string;
  hookSpecificOutput?: {
    additionalContext?: string;
  };
}

/** Resolve the session counter file path for this project. */
function counterFilePath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "session", ".lead-direct-edit-counter.json");
}

/** Atomic write: write to .tmp then rename. */
function writeCounter(counterPath: string, state: CounterFile): void {
  const tmpPath = counterPath + ".tmp";
  fs.writeFileSync(tmpPath, JSON.stringify(state));
  fs.renameSync(tmpPath, counterPath);
}

export default async function leadDirectCounterReset(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  try {
    // Find the project root — if none found, there is no session counter to reset.
    const projectRoot = findProjectRoot(cwd);
    if (!projectRoot) {
      return {
        message: `palantir-mini: lead-direct-counter-reset skipped (no project root for cwd=${cwd})`,
      };
    }

    // Ensure the session dir exists (may not yet on first ever run in a project).
    const sessionDir = path.join(projectRoot, ".palantir-mini", "session");
    fs.mkdirSync(sessionDir, { recursive: true });

    // Read the current count before reset (for the emit payload — diagnostic only).
    const counterPath = counterFilePath(projectRoot);
    let previousCount = 0;
    try {
      const raw = fs.readFileSync(counterPath, "utf8");
      const parsed = JSON.parse(raw) as Partial<CounterFile>;
      if (typeof parsed.count === "number") {
        previousCount = parsed.count;
      }
    } catch {
      // File missing or malformed — previousCount stays 0
    }

    // Reset the session-cumulative counter to zero.
    const resetState: CounterFile = {
      count:             0,
      lastEditTimestamp: null,
    };
    writeCounter(counterPath, resetState);

    // Emit 5-dim envelope per rule 10 §Substrate invariant.
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "runtime",
          passed:     true,
          errorClass: "lead_direct_counter_reset",
        },
        toolName:  "SessionStart",
        cwd:       projectRoot,
        sessionId: p.session_id,
        identity:  "monitor",
        memoryLayers: ["procedural", "semantic"],
        reasoning: `lead-direct-counter-reset: session-cumulative Lead-direct edit counter reset from ${previousCount} → 0 at session boundary (${projectRoot}). Per-sprint counters untouched. Rule 12 v3.4.0 §Lead-direct edit threshold requires session-scoped counting.`,
      });
    } catch {
      // best-effort emit; never fail the hook
    }

    return {
      message: `palantir-mini: lead-direct-counter-reset OK (was ${previousCount} → 0, project=${projectRoot})`,
      hookSpecificOutput: {
        additionalContext: `Lead-direct session counter reset to 0 (was ${previousCount}). Per-sprint counters at <sprintDir>/.lead-direct-edit-counter.json are untouched.`,
      },
    };
  } catch (err) {
    // Never fail SessionStart — always exit 0
    const errMsg = (err as Error).message ?? String(err);
    try {
      process.stderr.write(`[palantir-mini/lead-direct-counter-reset] unexpected error (suppressed): ${errMsg}\n`);
    } catch {
      // truly silent fallback
    }
    return { message: `palantir-mini: lead-direct-counter-reset error suppressed (${errMsg})` };
  }
}
