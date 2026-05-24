// palantir-mini v3.7.0 — hooks/rule-audit.ts (orchestrator)
// Mode dispatcher across bottleneck | drift | citation modes.
// Decomposed in v3.7.0 A.1: per-mode logic moved to ./rule-audit/{mode-bottleneck, mode-drift, mode-citation}.ts.
// Shared helpers in ./rule-audit/shared.ts. Types in ./rule-audit/types.ts.
//
// Authority: ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §8.2
//            ~/.claude/plans/deep-wiggling-mccarthy.md T1
//            ~/.claude/plans/concurrent-gathering-taco.md (v2.24.1 retire plan)
//            rules/CONTEXT.md §8 enforcement hooks.
//
// Mode dispatch:
//   bottleneck — kind="bottleneck:*", PreCompact event, advisory
//   drift      — kind="drift:*|stale-crossref|stale-hook-citation", SessionStart, advisory
//   citation   — scans edited hooks/*.ts for "rule NN" citations, PostToolUse, advisory

import { runBottleneckMode } from "./rule-audit/mode-bottleneck";
import { runDriftMode } from "./rule-audit/mode-drift";
import { runCitationMode } from "./rule-audit/mode-citation";
import type { HookPayload, HookResult, RuleAuditMode } from "./rule-audit/types";

// Backward-compat re-exports for tests + external callers
export type { RuleAuditMode, HookPayload, HookResult, AuditResult, KnownRule } from "./rule-audit/types";
export { runBottleneckMode } from "./rule-audit/mode-bottleneck";
export { runDriftMode } from "./rule-audit/mode-drift";
export { runCitationMode } from "./rule-audit/mode-citation";

/** Parse --mode=X from process.argv. */
export function parseModeFromArgv(argv: string[]): RuleAuditMode | null {
  for (const arg of argv) {
    const m = arg.match(/^--mode=(bottleneck|drift|citation)$/);
    if (m) return m[1] as RuleAuditMode;
  }
  return null;
}

/** Direct mode invocation — exported for tests. */
export async function runMode(mode: RuleAuditMode, payload: unknown): Promise<HookResult> {
  const p = (payload ?? {}) as HookPayload;
  switch (mode) {
    case "bottleneck": return runBottleneckMode(p);
    case "drift":      return runDriftMode(p);
    case "citation":   return runCitationMode(p);
  }
}

export default async function ruleAudit(payload: unknown): Promise<HookResult> {
  const mode = parseModeFromArgv(process.argv);
  if (!mode) {
    return {
      message: "palantir-mini: rule-audit error — missing --mode={bottleneck|drift|citation} argv flag",
      decision: "continue",
    };
  }
  return runMode(mode, payload);
}
