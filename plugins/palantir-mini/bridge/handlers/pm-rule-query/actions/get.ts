// palantir-mini v3.3.0 — pm-rule-query GET-mode action (B.5)
// Extracted from pm-rule-query.ts.

import { RULE_REGISTRY } from "#schemas/src/generated/rule-registry";
import type { RuleDeclaration, RuleId } from "#schemas/ontology/primitives/rule";
import { followLinks, readBody } from "../resolve";
import type { PmRuleQueryArgs, PmRuleQueryResult } from "../types";

export function runGet(
  initial: RuleDeclaration,
  args: PmRuleQueryArgs,
): Extract<PmRuleQueryResult, { mode: "get" }> {
  const { resolved, followed } =
    args.withFollow === false
      ? { resolved: initial, followed: null }
      : followLinks(initial);

  const body = readBody(resolved);
  const result: Extract<PmRuleQueryResult, { mode: "get" }> = {
    mode: "get",
    rule: resolved,
    body,
  };
  if (followed !== null) result.followedFrom = followed;

  if (args.withContext) {
    const ctx: Array<{ ruleId: RuleId; invariant: string }> = [];
    for (const id of resolved.crossRefs) {
      const neighbor = RULE_REGISTRY.get(id);
      if (neighbor) ctx.push({ ruleId: id, invariant: neighbor.invariant });
    }
    result.contextRules = ctx;
  }

  return result;
}
