// palantir-mini v3.4.0 — pm-rule-audit sibling: stale crossRefs + stale hook citations.

import * as fs from "fs";
import { RULE_REGISTRY_ENTRIES } from "#schemas/src/generated/rule-registry";
import type { RuleAuditFinding } from "#schemas/ontology/primitives/rule";
import { HOOKS_DIR } from "./types";

export function checkStaleCrossRefs(findings: RuleAuditFinding[]): void {
  // Per rule 23 §Scope isolation: project-scope rule IDs are local to that
  // project. crossRefs from a project rule MUST be looked up within the same
  // scope, NOT against the global RULE_REGISTRY. Pre-fix this function flagged
  // mathcrew rule 06's crossRefs `[01, 02, 03, 05]` as stale because 03/05 are
  // permanent gaps in the GLOBAL namespace — but they're valid local IDs in
  // project:mathcrew (whose scope has 01–06).
  for (const r of RULE_REGISTRY_ENTRIES) {
    for (const xr of r.crossRefs) {
      const found = RULE_REGISTRY_ENTRIES.some(
        (other) => other.ruleId === xr && other.scope === r.scope,
      );
      if (!found) {
        findings.push({
          kind: "stale-crossref",
          severity: "warn",
          ruleId: r.ruleId,
          detail: `rule ${r.ruleId} (${r.slug}, scope=${r.scope}) crossRefs ruleId ${xr} which is not registered in the same scope`,
        });
      }
    }
  }
}

export function checkHookCitations(findings: RuleAuditFinding[]): void {
  if (!fs.existsSync(HOOKS_DIR)) return;
  const hooks = new Set(
    fs
      .readdirSync(HOOKS_DIR)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => f.replace(/\.ts$/, "")),
  );
  for (const r of RULE_REGISTRY_ENTRIES) {
    for (const hc of r.hookCitations) {
      if (!hooks.has(hc)) {
        findings.push({
          kind: "stale-hook-citation",
          severity: "advisory",
          ruleId: r.ruleId,
          detail: `rule ${r.ruleId} (${r.slug}) cites hook "${hc}" which is not found under hooks/`,
        });
      }
    }
  }
}
