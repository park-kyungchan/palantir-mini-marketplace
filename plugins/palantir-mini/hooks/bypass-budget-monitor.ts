// palantir-mini v4.14.0 — bypass-budget-monitor hook (sprint-062 W3-α)
// Fires on: Stop — advisory only, NEVER blocks
//
// PURPOSE: Monitor bypass envvar usage frequency across a session. When any single
// bypass envvar pattern (e.g. PALANTIR_MINI_MCP_FIRST_BYPASS=1) is invoked more
// than BYPASS_BUDGET_THRESHOLD times in the last SCAN_WINDOW_EVENTS events, emit
// an advisory event signaling the bypass is being overused and root-cause
// investigation is warranted.
//
// Logic:
//   1. Find project root from cwd.
//   2. Read last SCAN_WINDOW_EVENTS events from project events.jsonl.
//   3. Filter events whose payload.errorClass matches *_bypass_invoked pattern.
//   4. Group by errorClass → count occurrences.
//   5. For each errorClass with count > BYPASS_BUDGET_THRESHOLD:
//      - emit validation_phase_completed errorClass="bypass_budget_exceeded"
//        with refinementTarget pointing to investigation need.
//   6. Always returns decision: "continue" (Stop hook never blocks).
//
// Cross-ref: rule 12 v3.10.0 §MCP-First protocol
//            rule 16 §Default-On Policy (harness bypass auditing)
//            sprint-062 plan §Phase 4 W3-α

// @domain: LOGIC

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot } from "./harness-base-mode-advisory";
import { readEvents } from "../lib/event-log/read";
import { eventsPathFor } from "../scripts/log";

/** Number of recent events to scan for bypass patterns. */
const SCAN_WINDOW_EVENTS = 200;

/** Number of bypass invocations before advisory fires. */
const BYPASS_BUDGET_THRESHOLD = 5;

/** Pattern to match bypass errorClass values. */
const BYPASS_ERROR_CLASS_PATTERN = /_bypass_invoked$/;

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message: string;
}

/**
 * Map from bypass errorClass → friendly envvar description.
 * Used to compose a helpful advisory message.
 */
function errorClassToEnvvar(errorClass: string): string {
  const mapping: Record<string, string> = {
    mcp_first_bypass_invoked:              "PALANTIR_MINI_MCP_FIRST_BYPASS=1",
    harness_bypass_invoked:               "PALANTIR_MINI_HARNESS_BYPASS=1",
    lead_direct_bypass_invoked:           "PALANTIR_MINI_LEAD_DIRECT_BYPASS=1",
    predelegation_bypass_invoked:         "PALANTIR_MINI_PREDELEGATION_BYPASS=1",
    task_budget_bypass_invoked:           "PALANTIR_MINI_TASK_BUDGET_BYPASS=1",
    automerge_bypass_invoked:             "PALANTIR_MINI_AUTOMERGE_BYPASS=1",
    dirty_gate_bypass_invoked:            "PALANTIR_MINI_DIRTY_GATE_BYPASS=1",
    agent_ownership_bypass_invoked:       "PALANTIR_MINI_AGENT_OWNERSHIP_BYPASS=1",
    domain_classification_bypass_invoked: "PALANTIR_MINI_DOMAIN_CLASSIFICATION_BYPASS=1",
    value_grade_bypass_invoked:           "PALANTIR_MINI_VALUE_GRADE_BYPASS=1",
  };
  return mapping[errorClass] ?? errorClass.replace(/_/g, " ").toUpperCase();
}

export default async function bypassBudgetMonitor(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const sessionId = p.session_id;

  try {
    // Find project root
    const projectRoot = findProjectRoot(cwd);
    if (!projectRoot) {
      return { message: "palantir-mini: bypass-budget-monitor skipped (not a tracked project)" };
    }

    // Read last SCAN_WINDOW_EVENTS events
    const eventsPath = eventsPathFor(projectRoot);
    if (!fs.existsSync(eventsPath)) {
      return { message: "palantir-mini: bypass-budget-monitor skipped (no events.jsonl)" };
    }

    const all = readEvents(eventsPath);
    const recent = all.slice(-SCAN_WINDOW_EVENTS);

    // Count bypass invocations by errorClass
    const bypassCounts = new Map<string, number>();

    for (const evt of recent) {
      const errorClass =
        (evt.payload as Record<string, unknown>)?.errorClass;
      if (typeof errorClass === "string" && BYPASS_ERROR_CLASS_PATTERN.test(errorClass)) {
        bypassCounts.set(errorClass, (bypassCounts.get(errorClass) ?? 0) + 1);
      }
    }

    // Check for budget exceedance
    const exceeded: Array<{ errorClass: string; count: number }> = [];
    for (const [errorClass, count] of bypassCounts.entries()) {
      if (count > BYPASS_BUDGET_THRESHOLD) {
        exceeded.push({ errorClass, count });
      }
    }

    if (exceeded.length === 0) {
      const totalBypasses = Array.from(bypassCounts.values()).reduce((a, b) => a + b, 0);
      return {
        message: `palantir-mini: bypass-budget-monitor OK (${totalBypasses} total bypass events in last ${SCAN_WINDOW_EVENTS}; none exceed threshold ${BYPASS_BUDGET_THRESHOLD})`,
      };
    }

    // Emit advisory for each exceeded bypass
    for (const { errorClass, count } of exceeded) {
      const envvar = errorClassToEnvvar(errorClass);

      try {
        await emit({
          type: "validation_phase_completed",
          payload: {
            phase:      "design",
            passed:     false,
            errorClass: "bypass_budget_exceeded",
          },
          toolName: "Stop",
          cwd:      projectRoot,
          sessionId,
          identity: "monitor",
          memoryLayers: ["episodic", "procedural"],
          reasoning: `bypass-budget-monitor: "${errorClass}" (${envvar}) was invoked ${count}× in last ${SCAN_WINDOW_EVENTS} events (threshold: ${BYPASS_BUDGET_THRESHOLD}). Frequent bypass of this gate suggests root-cause investigation is warranted — consider fixing the underlying issue rather than bypassing. Sprint-062 W3-α advisory.`,
          refinementTarget: {
            kind:            "other",
            filePathOrRid:   errorClass,
            description:     `frequent bypass of ${envvar} (${count}× > threshold ${BYPASS_BUDGET_THRESHOLD}) suggests root-cause investigation needed`,
            confidenceLevel: "high",
          },
        });
      } catch { /* best-effort */ }
    }

    const exceededSummary = exceeded
      .map(({ errorClass, count }) => `${errorClassToEnvvar(errorClass)} (${count}×)`)
      .join(", ");

    return {
      message: `palantir-mini: bypass-budget-monitor ADVISORY — exceeded threshold ${BYPASS_BUDGET_THRESHOLD}: ${exceededSummary}. See events.jsonl for bypass_budget_exceeded events.`,
    };

  } catch (err) {
    // Never fail the hook — always allow through
    const errMsg = (err as Error).message ?? String(err);
    try {
      process.stderr.write(
        `[palantir-mini/bypass-budget-monitor] unexpected error (suppressed): ${errMsg}\n`
      );
    } catch { /* truly silent */ }
    return {
      message: `palantir-mini: bypass-budget-monitor error suppressed (${errMsg})`,
    };
  }
}
