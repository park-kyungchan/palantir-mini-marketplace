// palantir-mini v3.7.0 — hooks/rule-audit.ts (orchestrator)
// Single live mode: bottleneck. The drift + citation modes were retired in the
// 2026-06-14 rules-lightening — drift was registered in ZERO hook entries (its
// capability stays live via pm_rule_audit detect-drift), and citation was an
// accidental no-op (broken registry path) whose stale-citation capability is
// covered by pm_rule_audit detect-stale-crossrefs. Full rationale: pm_rule_query
// (rule bodies) + the rules-lightening apply report.
//
// Shared helpers in ./rule-audit/shared.ts. Types in ./rule-audit/types.ts.
//
// Mode dispatch:
//   bottleneck — kind="bottleneck:*", PreCompact event, advisory

import { runBottleneckMode } from "./rule-audit/mode-bottleneck";
import type { HookPayload, HookResult, RuleAuditMode } from "./rule-audit/types";

// Backward-compat re-exports for tests + external callers
export type { RuleAuditMode, HookPayload, HookResult, AuditResult, KnownRule } from "./rule-audit/types";
export { runBottleneckMode } from "./rule-audit/mode-bottleneck";

/** Parse --mode=X from process.argv. */
export function parseModeFromArgv(argv: string[]): RuleAuditMode | null {
  for (const arg of argv) {
    const m = arg.match(/^--mode=(bottleneck)$/);
    if (m) return m[1] as RuleAuditMode;
  }
  return null;
}

/** Direct mode invocation — exported for tests. */
export async function runMode(mode: RuleAuditMode, payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  switch (mode) {
    case "bottleneck": return runBottleneckMode(p);
  }
}

export default async function ruleAudit(payload: unknown): Promise<HookResult> {
  const mode = parseModeFromArgv(process.argv);
  if (!mode) {
    return {
      message: "palantir-mini: rule-audit error — missing --mode={bottleneck} argv flag",
      decision: "continue",
    };
  }
  return runMode(mode, payload);
}
