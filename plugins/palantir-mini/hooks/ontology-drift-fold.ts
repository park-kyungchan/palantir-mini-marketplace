// palantir-mini v7.21.0 — ontology-drift-fold hook (Pillar C #3, always-on lane)
// Fires on: Stop — advisory only, NEVER blocks, READ-ONLY (DETECTS, never proposes)
//
// PURPOSE: Once-per-session, fold code↔ontology drift back into a sink (CORE.md P4).
// Calls the read-only `detectOntologyStalenessGit` for the current project and, ONLY
// when stale.length > 0, emits ONE advisory `validation_phase_completed`
// (errorClass="ontology_drift_detected") surfacing comparator + noiseWarning VERBATIM
// + indeterminate.length. Silent on a clean fold.
//
// BOUNDARY (DESIGN §2.1 / SPEC #3): this hook DETECTS only. It emits NO re-elevation
//   proposal, calls NOTHING in the propose-step (drift-propose.ts), and never enters
//   the elevate / DTC / approval path. The structural-fingerprint (DEFER, #1) gates any
//   proposal lane — this hook MUST NOT be wired to anything that proposes or mutates.
//
// Logic:
//   1. Find project root from cwd; skip if none (not a tracked project).
//   2. Gate on `.palantir-mini/` existing; skip if absent.
//   3. Bypass envvar PALANTIR_MINI_DRIFT_FOLD_BYPASS=1 → skip + emit a
//      *_bypass_invoked errorClass so bypass-budget-monitor audits it (gate parity).
//   4. await detectOntologyStalenessGit({ project: root }).
//   5. Emit ONLY when stale.length > 0: one advisory carrying comparator + noiseWarning
//      verbatim + stale.length + indeterminate.length. Else silent.
//   6. Always returns { message } (Stop hook never blocks).
//
// Cross-ref: hooks/bypass-budget-monitor.ts (exact precedent: async, advisory, read-only),
//            lib/event-log/ontology-staleness.ts (the detector + its BOUNDARY contract),
//            CORE.md P4 (every session folds drift back into sinks), SPEC #3.

// @domain: LEARN

import * as fs from "fs";
import * as path from "path";
import { emit } from "../scripts/log";
import { findProjectRoot, isExcludedProjectRoot } from "../lib/project/find-root";
import { detectOntologyStalenessGit } from "../lib/event-log/ontology-staleness";

/** Bypass envvar — turns this advisory lane OFF for a project/session (audited). */
const DRIFT_FOLD_BYPASS = "PALANTIR_MINI_DRIFT_FOLD_BYPASS";

interface HookPayload {
  cwd?:        string;
  session_id?: string;
}

interface HookResult {
  message: string;
}

export default async function ontologyDriftFold(payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  const cwd = p.cwd ?? process.cwd();
  const sessionId = p.session_id;

  try {
    // Find project root
    const projectRoot = findProjectRoot(cwd);
    if (!projectRoot) {
      return { message: "palantir-mini: ontology-drift-fold skipped (not a tracked project)" };
    }

    // A stray `.palantir-mini` marker at $HOME or a temp dir must not make HOME/tmp the
    // drift-detection frame + emit governed events under the wrong root (mirrors the
    // ontology-import-guard FIX 2 exclusion). The existence gate below does NOT protect
    // this case (the stray marker satisfies it).
    if (isExcludedProjectRoot(projectRoot)) {
      return { message: "palantir-mini: ontology-drift-fold skipped (excluded project root)" };
    }

    // Gate on .palantir-mini/ existing
    if (!fs.existsSync(path.join(projectRoot, ".palantir-mini"))) {
      return { message: "palantir-mini: ontology-drift-fold skipped (no .palantir-mini/)" };
    }

    // Bypass envvar → skip + audit (so bypass-budget-monitor counts it)
    if (process.env[DRIFT_FOLD_BYPASS] === "1") {
      try {
        await emit({
          type: "validation_phase_completed",
          payload: { phase: "design", passed: true, errorClass: "drift_fold_bypass_invoked" },
          toolName: "Stop",
          cwd:      projectRoot,
          sessionId,
          identity: "monitor",
          memoryLayers: ["episodic", "procedural"],
          reasoning: `ontology-drift-fold: ${DRIFT_FOLD_BYPASS}=1 set — drift fold skipped for this session.`,
        });
      } catch { /* best-effort */ }
      return { message: `palantir-mini: ontology-drift-fold skipped (${DRIFT_FOLD_BYPASS}=1)` };
    }

    // Read-only detect — DETECTS only, proposes NOTHING.
    const report = await detectOntologyStalenessGit({ project: projectRoot });

    if (report.stale.length === 0) {
      return {
        message: `palantir-mini: ontology-drift-fold OK (clean — ${report.inspectedCount} primitives inspected, 0 stale; comparator ${report.comparator})`,
      };
    }

    // Emit ONE advisory — surface comparator + noiseWarning VERBATIM + indeterminate count.
    try {
      await emit({
        type: "validation_phase_completed",
        payload: {
          phase:      "design",
          passed:     false,
          errorClass: "ontology_drift_detected",
        },
        toolName: "Stop",
        cwd:      projectRoot,
        sessionId,
        identity: "monitor",
        memoryLayers: ["episodic", "procedural"],
        reasoning:
          `ontology-drift-fold: ${report.stale.length}/${report.inspectedCount} registered primitives are STALE ` +
          `(comparator: ${report.comparator}; indeterminate: ${report.indeterminate.length}). ` +
          `ADVISORY ONLY — this DETECTS drift; it emits no re-elevation proposal and touches no commit path. ` +
          `noiseWarning: ${report.noiseWarning ?? "(none)"}`,
        refinementTarget: {
          kind:            "other",
          filePathOrRid:   projectRoot,
          description:     `${report.stale.length} stale primitive(s) detected via ${report.comparator}; manual/gated propose-step required — do NOT auto-re-elevate (OPEN #1 fingerprint gates any proposal lane)`,
          confidenceLevel: "medium",
        },
      });
    } catch { /* best-effort — Stop hook never blocks */ }

    return {
      message:
        `palantir-mini: ontology-drift-fold ADVISORY — ${report.stale.length}/${report.inspectedCount} primitives stale ` +
        `(comparator ${report.comparator}; indeterminate ${report.indeterminate.length}). See events.jsonl for the ontology_drift_detected event.`,
    };

  } catch (err) {
    // Never fail the hook — always allow through
    const errMsg = (err as Error).message ?? String(err);
    try {
      process.stderr.write(
        `[palantir-mini/ontology-drift-fold] unexpected error (suppressed): ${errMsg}\n`
      );
    } catch { /* truly silent */ }
    return {
      message: `palantir-mini: ontology-drift-fold error suppressed (${errMsg})`,
    };
  }
}
