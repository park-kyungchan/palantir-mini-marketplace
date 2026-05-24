// palantir-mini v2.24.0 — harness-eval-circuit-breaker hook (Phase 2a T2)
// Fires on: PreCompact (advisory)
//
// Surfaces stuck harness sprints before compaction burns more tokens. When
// a sprint has reached iterationLimit AND drift is suspected, emit advisory
// warning so operator can /palantir-mini:pm-harness-abort or revise spec.
//
// Authority: ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §8.1
//            ~/.claude/plans/deep-wiggling-mccarthy.md T2

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { projectRoot } from "../scripts/log";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface SprintContractFile {
  contractId?:                string;
  sprintNumber?:              number;
  terminationHardThreshold?:  number;
  iterationLimit?:            number;
}

interface SprintStateFile {
  iteration?:        number;
  state?:            string;
  bestScore?:        number;
  driftSuspected?:   boolean;
  lastVerdict?:      "pass" | "revise" | "fail" | "abort";
}

export interface StuckSprint {
  sprintId:    string;
  iteration:   number;
  threshold:   number;
  hasDrift:    boolean;
  contractPath: string;
}

/** Walk <project>/.palantir-mini/harness/sprints/* for stuck-sprint signals. */
export function findStuckSprints(root: string): StuckSprint[] {
  const sprintsDir = path.join(root, ".palantir-mini", "harness", "sprints");
  if (!fs.existsSync(sprintsDir)) return [];

  const stuck: StuckSprint[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(sprintsDir, { withFileTypes: true });
  } catch {
    return stuck;
  }

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const sprintDir = path.join(sprintsDir, e.name);
    const contractPath = path.join(sprintDir, "contract.json");
    const statePath = path.join(sprintDir, "state.json");
    if (!fs.existsSync(contractPath)) continue;

    let contract: SprintContractFile | null = null;
    let state: SprintStateFile | null = null;
    try {
      contract = JSON.parse(fs.readFileSync(contractPath, "utf8")) as SprintContractFile;
    } catch {
      continue;
    }
    try {
      if (fs.existsSync(statePath)) {
        state = JSON.parse(fs.readFileSync(statePath, "utf8")) as SprintStateFile;
      }
    } catch {
      // state file missing or unreadable — skip
    }

    const threshold = contract.iterationLimit ?? contract.terminationHardThreshold ?? 5;
    const iteration = state?.iteration ?? 0;
    const driftSuspected = state?.driftSuspected === true;
    const stillRunning = state?.state !== "passed" && state?.state !== "failed" && state?.state !== "aborted";

    // Stuck = at-or-past iteration cap AND still running AND drift signal present.
    if (stillRunning && iteration >= threshold && driftSuspected) {
      stuck.push({
        sprintId: e.name,
        iteration,
        threshold,
        hasDrift: true,
        contractPath,
      });
    }
  }

  return stuck;
}

export default async function harnessEvalCircuitBreaker(payload: unknown): Promise<{
  message:   string;
  decision?: "continue";
  reason?:   string;
}> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? projectRoot();

  const stuck = findStuckSprints(cwd);

  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: stuck.length === 0,
        errorClass: stuck.length > 0 ? "harness_stuck_sprints" : undefined,
      },
      toolName: "PreCompact",
      cwd,
      sessionId: p.session_id,
      identity: "monitor",
      reasoning:
        stuck.length === 0
          ? "harness-eval-circuit-breaker: no stuck sprints"
          : `harness-eval-circuit-breaker: ${stuck.length} stuck sprint(s) at-or-past iterationLimit + drift-suspected`,
    });
  } catch {
    // best-effort
  }

  if (stuck.length === 0) {
    return {
      message: "palantir-mini: harness-eval-circuit-breaker OK (no stuck sprints)",
      decision: "continue",
    };
  }

  const lines = stuck.map(
    (s) =>
      `  - ${s.sprintId}: iteration ${s.iteration}/${s.threshold} (drift suspected) — abort or revise spec`,
  );
  const advisory = [
    `palantir-mini: harness-eval-circuit-breaker — ${stuck.length} stuck sprint(s) (advisory):`,
    ...lines,
    ``,
    `Run /palantir-mini:pm-harness-abort <sprint-rid> or revise the spec to break the loop.`,
  ].join("\n");

  process.stderr.write(`[palantir-mini/harness-eval-circuit-breaker] ${advisory}\n`);

  return {
    message: `palantir-mini: harness-eval-circuit-breaker (advisory, ${stuck.length} stuck)`,
    decision: "continue",
    reason: advisory,
  };
}
