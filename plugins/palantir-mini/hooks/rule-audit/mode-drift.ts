// palantir-mini v3.7.0 — hooks/rule-audit/mode-drift.ts
// Drift mode: SessionStart, advisory drift / stale-crossref / stale-hook-citation.
// Extracted from rule-audit.ts during A.1 decomposition.

import { emit } from "../../scripts/log";
import { runAudit } from "./shared";
import type { HookPayload, HookResult } from "./types";

export async function runDriftMode(payload: HookPayload): Promise<HookResult> {
  const cwd = payload.cwd ?? process.cwd();
  const audit = await runAudit();
  if (!audit) {
    return {
      message: "palantir-mini: rule-audit (mode=drift) skipped (pm_rule_audit unavailable)",
      decision: "continue",
    };
  }
  const drifts = audit.findings.filter(
    (f) =>
      f.kind.startsWith("drift:") ||
      f.kind === "stale-crossref" ||
      f.kind === "stale-hook-citation",
  );

  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: drifts.length === 0,
        errorClass: drifts.length > 0 ? "rules_drift" : undefined,
      },
      toolName: "SessionStart",
      cwd,
      sessionId: payload.session_id,
      identity: "monitor",
      reasoning:
        drifts.length === 0
          ? "rule-audit (drift): no drift"
          : `rule-audit (drift): ${drifts.length} drift finding(s)`,
    });
  } catch {
    // best-effort
  }

  if (drifts.length === 0) {
    return {
      message: `palantir-mini: rule-audit (mode=drift) OK (${audit.summary.registeredRules} rules)`,
      decision: "continue",
    };
  }

  const lines = drifts.map(
    (f) => `  - ${f.kind}${f.ruleId !== undefined ? ` (rule ${f.ruleId})` : ""}: ${f.detail}`,
  );
  const advisory = [
    `palantir-mini: rule-audit (mode=drift) — ${drifts.length} drift finding(s) (advisory):`,
    ...lines,
    ``,
    `Run /palantir-mini:pm-rule-audit for full report.`,
  ].join("\n");
  process.stderr.write(`[palantir-mini/rule-audit] ${advisory}\n`);
  return {
    message: `palantir-mini: rule-audit (mode=drift, advisory, ${drifts.length} drifts)`,
    decision: "continue",
    reason: advisory,
  };
}
