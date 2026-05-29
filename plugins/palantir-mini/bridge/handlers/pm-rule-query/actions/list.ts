// palantir-mini v3.3.0 — pm-rule-query LIST-mode action (B.5)
// Extracted from pm-rule-query.ts.

import {
  RULE_REGISTRY_ENTRIES,
} from "#schemas/src/generated/rule-registry";
import type { RuleDeclaration } from "#schemas/ontology/primitives/rule";
import { ruleRegistryCounts } from "../../rule-counts";
import { matchesScope, isRetired } from "../resolve";
import type { PmRuleQueryArgs, PmRuleQueryResult, RuleListEntry } from "../types";

export function runList(args: PmRuleQueryArgs): Extract<PmRuleQueryResult, { mode: "list" }> {
  const { scope, compact, includeRetired } = args;
  const filtered = RULE_REGISTRY_ENTRIES.filter((r) => {
    if (!matchesScope(r, scope)) return false;
    if (!includeRetired && isRetired(r)) return false;
    return true;
  });
  const entries: Array<RuleDeclaration | RuleListEntry> = compact
    ? filtered.map((r) => ({
        ruleId: r.ruleId,
        slug: r.slug,
        invariant: r.invariant,
      }))
    : [...filtered];
  const counts = ruleRegistryCounts();
  return {
    mode: "list",
    count: entries.length,
    entries,
    totalRegistered: counts.registeredTotal,
    registeredTotal: counts.registeredTotal,
    activeGlobalCount: counts.activeGlobalCount,
  };
}
