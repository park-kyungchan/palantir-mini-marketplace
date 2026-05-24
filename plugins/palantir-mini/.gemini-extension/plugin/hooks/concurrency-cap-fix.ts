// palantir-mini PR-13 — Hook enforcement level
//   enforcement: observe
//   rationale:   TaskUpdate matcher only; logs concurrency cap violations and emits advisory event; does not block task updates.
// palantir-mini v1.5 — concurrency-cap-fix hook
// Fires on: TaskUpdate with status="in_progress" (PreToolUse)
//
// v1.5 (sprint-053 W3C): converted from decision: "block" to
// hookSpecificOutput.permissionDecision: "deny" for CC v2.1.89+ shape
// (audit §H headless coverage). Legacy decision: "block" returned in
// parallel for backward-compat with non-CC-v2.1.89 runtimes.
//
// Phase A-4: replaces/fixes task-claim-throttle.ts (A9.3) which used a
// hardcoded phase-a3 tasks directory path and therefore never fired for
// other teams/sessions.
//
// Fix: glob ~/.claude/tasks/**/*.json (all team directories) instead of
// hardcoded phase-a3. Uses recursive directory iteration via fs.readdirSync.
//
// Per-teammate in_progress cap = 2 (rule 12 §Task granularity).
//
// Root cause of A9.3 miss: task-claim-throttle.ts line 82 hardcodes
//   const tasksDir = path.join(home, ".claude", "tasks", "phase-a3");
// This fix reads all subdirectories under ~/.claude/tasks/.
//
// See plan §Layer 3 hook #5, rule 12 §Task granularity.

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";

interface HookPayload {
  task_id?:    string;
  owner?:      string;
  status?:     string;
  session_id?: string;
  cwd?:        string;
  tasks?:      TaskRecord[];
}

interface TaskRecord {
  id?:     string;
  owner?:  string;
  status?: string;
}

export const IN_PROGRESS_CAP = 2;

/** Recursively walk a directory and collect all *.json file paths. */
export function collectJsonFiles(dir: string, depth = 0): string[] {
  if (depth > 4) return []; // safety limit
  if (!fs.existsSync(dir)) return [];

  const results: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...collectJsonFiles(full, depth + 1));
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        results.push(full);
      }
    }
  } catch {
    // skip unreadable entries
  }
  return results;
}

/** Load task records from all JSON files under the tasks root. */
export function loadAllTasks(tasksRoot: string): TaskRecord[] {
  const files = collectJsonFiles(tasksRoot);
  const tasks: TaskRecord[] = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(f, "utf8")) as unknown;
      if (Array.isArray(raw)) {
        tasks.push(...(raw as TaskRecord[]));
      } else if (typeof raw === "object" && raw !== null) {
        tasks.push(raw as TaskRecord);
      }
    } catch {
      // skip corrupt
    }
  }
  return tasks;
}

/** Count in_progress tasks for owner, excluding the task being claimed. */
export function countInProgressGlobal(tasks: TaskRecord[], owner: string, excludeTaskId?: string): number {
  return tasks.filter(
    (t) =>
      t.status === "in_progress" &&
      t.owner  === owner &&
      t.id     !== excludeTaskId,
  ).length;
}

export default async function concurrencyCapFix(payload: unknown): Promise<{
  message:   string;
  decision?: "block" | "continue";
  reason?:   string;
  hookSpecificOutput?: {
    permissionDecision?: "allow" | "deny" | "ask" | "defer";
    permissionDecisionReason?: string;
  };
}> {
  const p   = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  // Only intercept in_progress transitions
  if (p.status !== "in_progress") {
    return { message: "palantir-mini: concurrency-cap-fix — not an in_progress transition, skipped" };
  }

  const owner = p.owner;
  if (!owner) {
    return { message: "palantir-mini: concurrency-cap-fix — no owner in payload, skipped" };
  }

  // Load tasks: prefer payload.tasks, then global glob, then skip
  let tasks: TaskRecord[] = p.tasks ?? [];
  if (tasks.length === 0) {
    const home      = process.env.HOME ?? "/home/palantirkc";
    const tasksRoot = path.join(home, ".claude", "tasks");
    tasks = loadAllTasks(tasksRoot);
  }

  if (tasks.length === 0) {
    return {
      message:  `palantir-mini: concurrency-cap-fix — no task state available, skipped (owner=${owner})`,
      decision: "continue",
    };
  }

  const existing = countInProgressGlobal(tasks, owner, p.task_id);

  if (existing >= IN_PROGRESS_CAP) {
    const base = `palantir-mini concurrency-cap-fix: ${owner} already has ${existing} in_progress task(s) across ALL teams — complete one before claiming more (rule 12 §Task granularity). [This is the fixed version of task-claim-throttle with global task glob.]`;
    const { withRuleExcerpt } = await import("../scripts/rule-excerpt");
    const reason = await withRuleExcerpt(base, 12);
    process.stderr.write(`[palantir-mini/concurrency-cap-fix] ${reason}\n`);

    try {
      await emit({
        type:      "validation_phase_completed",
        payload:   { phase: "design", passed: false, errorClass: "claim_hoarding_global" },
        toolName:  "TaskUpdate",
        cwd,
        sessionId: p.session_id,
        identity:  "monitor",
        reasoning: reason,
      });
    } catch {
      // best-effort
    }

    return {
      message:  `palantir-mini: concurrency-cap-fix BLOCK (owner=${owner}, existing=${existing})`,
      decision: "block",
      reason,
      hookSpecificOutput: {
        permissionDecision:       "deny",
        permissionDecisionReason: reason,
      },
    };
  }

  return {
    message:  `palantir-mini: concurrency-cap-fix OK (owner=${owner}, existing=${existing})`,
    decision: "continue",
  };
}
