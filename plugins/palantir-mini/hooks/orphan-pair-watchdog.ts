// palantir-mini v4.10.0 / sprint-056 W3.D1 — orphan-pair-watchdog hook
// Fires on: PreCompact (async: true, advisory only)
//
// Calls pm_outcome_pair_audit handler in-process (same pattern as
// value-grade-assigner importing emit-event) to get the current orphanRatio.
// If orphanRatio > 0.05 (5% threshold), writes a stderr advisory and emits
// a phase_completed event so Lead knows orphaned outcome-pairs need attention.
//
// Bypass: PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE=1 (audited via
//   orphan_watchdog_bypass_invoked event).
//
// Authority: ~/.claude/rules/26-valuable-data-standard.md §Axis B1
//            ~/.claude/plans/bubbly-sauteeing-cocke.md §2 Wave 3 D1

import { emit } from "../scripts/log";
import pmOutcomePairAudit from "../bridge/handlers/pm-outcome-pair-audit";
import { findProjectRoot } from "./harness-base-mode-advisory";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message:            string;
  additionalContext?: string;
  decision?:          "block" | "continue";
}

const ORPHAN_THRESHOLD = 0.05; // 5%

export default async function orphanPairWatchdog(
  payload: unknown,
): Promise<HookResult> {
  const p   = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();

  // ─── Bypass path (audited)
  if (process.env.PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE === "1") {
    void emit({
      type: "phase_completed",
      payload: {
        phaseTag: "orphan_watchdog_bypass_invoked",
        taskId:   "orphan-pair-watchdog",
        validations: ["bypassEnv=PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE=1"],
      },
      toolName:  "PreCompact",
      cwd,
      sessionId: p.session_id,
      identity:  "monitor",
      memoryLayers: ["procedural"],
      reasoning: "orphan-pair-watchdog: bypass via PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE=1",
    }).catch(() => {});

    return {
      message: "palantir-mini: orphan-pair-watchdog bypassed (PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE=1)",
    };
  }

  // ─── Resolve project root
  const projectRoot = findProjectRoot(cwd);
  if (!projectRoot) {
    return {
      message: "palantir-mini: orphan-pair-watchdog skipped (no .palantir-mini ancestor found)",
    };
  }

  // ─── Call handler in-process
  let auditResult: {
    orphanRatio:   number;
    totalPairs:    number;
    orphanedPairs: number;
    openPairs:     number;
    closedPairs:   number;
  };
  try {
    auditResult = await pmOutcomePairAudit({ project: projectRoot });
  } catch {
    // Handler failure → advisory + pass-through (never block precompact for this)
    process.stderr.write(
      "[palantir-mini/orphan-pair-watchdog] WARNING: pm_outcome_pair_audit call failed — skipping watchdog check.\n",
    );
    return {
      message: "palantir-mini: orphan-pair-watchdog SKIPPED (audit call failed)",
    };
  }

  const { orphanRatio, totalPairs, orphanedPairs } = auditResult;

  // ─── Threshold check
  if (totalPairs === 0 || orphanRatio <= ORPHAN_THRESHOLD) {
    return {
      message: `palantir-mini: orphan-pair-watchdog OK (orphanRatio=${(orphanRatio * 100).toFixed(1)}%, total=${totalPairs})`,
    };
  }

  // ─── Fire advisory
  const advisory = [
    "=== ORPHAN-PAIR WATCHDOG ADVISORY (rule 26 §Axis B1; threshold 5%) ===",
    `orphanRatio:   ${(orphanRatio * 100).toFixed(1)}% (${orphanedPairs}/${totalPairs} pairs)`,
    `totalPairs:    ${totalPairs}`,
    `orphanedPairs: ${orphanedPairs}`,
    "",
    "Orphaned outcome-pairs reduce BackPropagation circuit fidelity.",
    "Resolution: run /palantir-mini:pm-value-audit to inspect + close open pairs,",
    "  OR emit outcome_pair_close events for relevant decision events.",
    "Bypass: PALANTIR_MINI_ORPHAN_WATCHDOG_DISABLE=1 (audited).",
  ].join("\n");

  process.stderr.write(`[palantir-mini/orphan-pair-watchdog] ${advisory}\n`);

  // ─── Best-effort emit (non-blocking)
  void emit({
    type: "phase_completed",
    payload: {
      phaseTag:  "orphan_watchdog_fired",
      taskId:    "orphan-pair-watchdog",
      validations: [
        `orphanRatio=${(orphanRatio * 100).toFixed(1)}%`,
        `threshold=5%`,
        `totalPairs=${totalPairs}`,
        `orphanedPairs=${orphanedPairs}`,
      ],
    },
    toolName:  "PreCompact",
    cwd,
    sessionId: p.session_id,
    identity:  "monitor",
    memoryLayers: ["working", "procedural"],
    reasoning: `orphan-pair-watchdog fired: ${(orphanRatio * 100).toFixed(1)}% orphan ratio exceeds 5% threshold. ${orphanedPairs}/${totalPairs} pairs orphaned.`,
  }).catch(() => {});

  return {
    message:           `palantir-mini: orphan-pair-watchdog ADVISORY (orphanRatio=${(orphanRatio * 100).toFixed(1)}%, ${orphanedPairs}/${totalPairs})`,
    additionalContext: advisory,
  };
}
