// palantir-mini v3.7.0 — hooks/rule-audit/mode-bottleneck.ts
// Bottleneck mode: PreCompact, advisory ceiling violation check.
// Extracted from rule-audit.ts during A.1 decomposition.

import { emit } from "../../scripts/log";
import { runAudit } from "./shared";
import type { HookPayload, HookResult } from "./types";
import { emitSkillSuggestion } from "../../lib/skill-suggestion-emit";

export async function runBottleneckMode(payload: HookPayload): Promise<HookResult> {
  const cwd = payload.cwd ?? process.cwd();
  const audit = await runAudit();
  if (!audit) {
    return {
      message: "palantir-mini: rule-audit (mode=bottleneck) skipped (pm_rule_audit unavailable)",
      decision: "continue",
    };
  }
  const bottlenecks = audit.findings.filter((f) => f.kind.startsWith("bottleneck:"));

  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: bottlenecks.length === 0,
        errorClass: bottlenecks.length > 0 ? "rules_bottleneck" : undefined,
      },
      toolName: "PreCompact",
      cwd,
      sessionId: payload.session_id,
      identity: "monitor",
      reasoning:
        bottlenecks.length === 0
          ? "rule-audit (bottleneck): all ceilings OK"
          : `rule-audit (bottleneck): ${bottlenecks.length} ceiling violation(s)`,
    });
  } catch {
    // best-effort
  }

  if (bottlenecks.length === 0) {
    return {
      message: `palantir-mini: rule-audit (mode=bottleneck) OK (${audit.summary.registeredRules} rules scanned)`,
      decision: "continue",
    };
  }

  const lines = bottlenecks.map((f) => {
    const measured = f.measured ?? "?";
    const ceiling = f.ceiling ?? "?";
    return `  - ${f.kind}${f.ruleId !== undefined ? ` (rule ${f.ruleId})` : ""}: ${f.detail} [${measured}/${ceiling}]`;
  });
  const advisory = [
    `palantir-mini: rule-audit (mode=bottleneck) — ${bottlenecks.length} ceiling violation(s) (advisory):`,
    ...lines,
    ``,
    `Run /palantir-mini:pm-rule-audit for full report.`,
  ].join("\n");

  process.stderr.write(`[palantir-mini/rule-audit] ${advisory}\n`);
  // W1.8 — persist suggestion as 5-dim event (rule 26 §Definition closure; Agent #3 audit gap)
  await emitSkillSuggestion({
    suggestedSkillSlug: "pm-rule-audit",
    suggestedByHook:    "rule-audit/mode-bottleneck",
    triggerCondition:   `${bottlenecks.length} ceiling violation(s) detected`,
    suggestionContext:  bottlenecks.map((f) => f.kind).join(","),
    memoryLayers:       ["procedural", "semantic"],
    cwd,
  });
  return {
    message: `palantir-mini: rule-audit (mode=bottleneck, advisory, ${bottlenecks.length} violations)`,
    decision: "continue",
    reason: advisory,
  };
}
