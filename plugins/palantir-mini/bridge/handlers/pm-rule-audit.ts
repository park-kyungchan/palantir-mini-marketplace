// palantir-mini v4.9.0 — MCP tool handler: pm_rule_audit
// Domain: OPS (Rule prim-ops-19 — schemas v1.18.0)
//
// Thin orchestrator after v3.4.0 N1-LARGE wave 2 decomposition. Per-axis checks
// extracted to ./pm-rule-audit/{detect-bottleneck, detect-stale-crossrefs, detect-drift, types}.ts.
//
// Comprehensive health check for the rules/ system:
//   - drift:memory-counter — MEMORY.md rule count stale
//   - drift:file-count — registered rules vs files on disk
//   - bottleneck:t1-total + t1-file — CORE.md / CONTEXT.md / BROWSE.md size
//   - bottleneck:t2-file + t2-total — numbered rule body sizes
//   - stale-crossref — crossRefs pointing to deleted rule
//   - stale-hook-citation — hookCitations pointing to non-existent hook + bidirectional citation mismatches (sprint-056 W3.D2)
//   - missing-frontmatter — rule file without required fields
//   - recycled-rule-id — same ruleId in same scope
//
// Authority: rules/CONTEXT.md §12 ceiling contract + §10 anti-patterns.
// Rules: 07 (file-ownership), 22 (hook-citation-validation)

import type { RuleAuditFinding } from "#schemas/ontology/primitives/rule";
import { checkT1Bottleneck, checkT2Bottleneck } from "./pm-rule-audit/detect-bottleneck";
import {
  checkHookCitations,
  checkStaleCrossRefs,
} from "./pm-rule-audit/detect-stale-crossrefs";
import {
  checkFileCountDrift,
  checkMemoryCounter,
  checkRecycledIds,
  checkUnusedRules30d,
} from "./pm-rule-audit/detect-drift";
import { ruleRegistryCounts } from "./rule-counts";
import type { Args, RuleAuditResult } from "./pm-rule-audit/types";
import validateHookCitations from "./validate-hook-citations";

// Backward-compat re-exports
export type { Args, RuleAuditResult } from "./pm-rule-audit/types";

export default async function pmRuleAudit(args: Args): Promise<RuleAuditResult> {
  const findings: RuleAuditFinding[] = [];

  checkT1Bottleneck(findings);
  checkT2Bottleneck(findings);
  checkStaleCrossRefs(findings);
  checkHookCitations(findings);
  checkFileCountDrift(findings);
  checkMemoryCounter(findings);
  checkRecycledIds(findings);
  // sprint-055 W3.A — unused-rule-30d advisory (uses optional projectRoot for events.jsonl scan)
  checkUnusedRules30d(findings, args.projectRoot ?? process.env.PALANTIR_MINI_PROJECT ?? process.cwd());

  // sprint-056 W3.D2 — bidirectional hook citation audit (rule 22 v1.0.0)
  // Merge forward + reverse mismatches into the existing findings list as
  // stale-hook-citation findings (kind reuse avoids schema primitive edit).
  try {
    const citationAudit = await validateHookCitations({});
    for (const fm of citationAudit.forwardMismatches) {
      findings.push({
        kind: "stale-hook-citation",
        severity: "advisory",
        detail: `[forward] ${fm.hookFile}: cites rule ${fm.citedRuleId} — ${fm.reason}`,
      });
    }
    for (const rm of citationAudit.reverseMismatches) {
      findings.push({
        kind: "stale-hook-citation",
        severity: "advisory",
        ruleId: rm.ruleId,
        detail: `[reverse] rule ${rm.ruleId} (${rm.slug}) hookCitations["${rm.citedHook}"]: ${rm.reason}`,
      });
    }
  } catch {
    // best-effort; citation audit failure should not block the main audit
  }

  const filtered =
    args.includeAdvisory === false
      ? findings.filter((f) => f.severity !== "advisory")
      : findings;

  const byKind: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  for (const f of filtered) {
    byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;
    bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  }
  const counts = ruleRegistryCounts();

  return {
    findings: filtered,
    summary: {
      totalFindings: filtered.length,
      byKind,
      bySeverity,
      registeredRules: counts.registeredTotal,
      registeredTotal: counts.registeredTotal,
      activeGlobalCount: counts.activeGlobalCount,
    },
  };
}
