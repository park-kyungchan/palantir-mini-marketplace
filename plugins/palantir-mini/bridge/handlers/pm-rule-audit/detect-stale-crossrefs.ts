// palantir-mini v3.4.0 — pm-rule-audit sibling: stale crossRefs + stale hook citations.

import * as fs from "fs";
import { RULE_REGISTRY_ENTRIES } from "#schemas/src/generated/rule-registry";
import type { RuleAuditFinding } from "#schemas/ontology/primitives/rule";
import { HOOK_INSTANCES } from "#schemas/ontology/self";
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

/**
 * Classify a single rule→hook citation. Pure + injectable (unit-testable):
 *   - hook file absent          → stale-hook-citation  (advisory)
 *   - hook present but UNWIRED   → unwired-hook-citation (warn) — a rule promising
 *                                  enforcement via an orphan hook is a governance lie
 *   - hook present + wired       → null (valid)
 * `orphanIds` is the SSoT wired/unwired axis (self-Ontology HOOK_INSTANCES, drift-guarded
 * by the registration test incl. in-process aggregator membership).
 */
export function classifyHookCitation(
  ruleId: number,
  slug: string,
  citedHook: string,
  hooks: ReadonlySet<string>,
  orphanIds: ReadonlySet<string>,
): RuleAuditFinding | null {
  if (!hooks.has(citedHook)) {
    return {
      kind: "stale-hook-citation",
      severity: "advisory",
      ruleId,
      detail: `rule ${ruleId} (${slug}) cites hook "${citedHook}" which is not found under hooks/`,
    };
  }
  if (orphanIds.has(citedHook)) {
    return {
      kind: "unwired-hook-citation",
      severity: "warn",
      ruleId,
      detail: `rule ${ruleId} (${slug}) cites hook "${citedHook}" which exists but is UNWIRED in hooks/hooks.json (orphanInRegistry) — the rule promises enforcement that never fires`,
    };
  }
  return null;
}

export function checkHookCitations(findings: RuleAuditFinding[]): void {
  if (!fs.existsSync(HOOKS_DIR)) return;
  const hooks = new Set(
    fs
      .readdirSync(HOOKS_DIR)
      .filter((f) => f.endsWith(".ts"))
      .map((f) => f.replace(/\.ts$/, "")),
  );
  const orphanIds = new Set(
    HOOK_INSTANCES.filter((h) => h.orphanInRegistry).map((h) => h.hookId),
  );
  for (const r of RULE_REGISTRY_ENTRIES) {
    for (const hc of r.hookCitations) {
      const finding = classifyHookCitation(r.ruleId, r.slug, hc, hooks, orphanIds);
      if (finding) findings.push(finding);
    }
  }
}
