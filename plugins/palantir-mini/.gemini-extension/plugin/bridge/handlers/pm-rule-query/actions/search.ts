// palantir-mini v3.3.0 — pm-rule-query SEARCH-mode action (B.5)
// Extracted from pm-rule-query.ts.

import { RULE_REGISTRY_ENTRIES } from "#schemas/src/generated/rule-registry";
import { isRetired, readBody } from "../resolve";
import { scoreMatch, extractSnippet } from "../match";
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
} from "../types";
import type { PmRuleQueryArgs, PmRuleQueryResult, RuleSearchHit } from "../types";

export function runSearch(
  query: string,
  args: PmRuleQueryArgs,
): Extract<PmRuleQueryResult, { mode: "search" }> {
  const limit = Math.max(1, Math.min(SEARCH_MAX_LIMIT, args.limit ?? SEARCH_DEFAULT_LIMIT));
  const q = query.trim();

  const hits: RuleSearchHit[] = [];

  for (const rule of RULE_REGISTRY_ENTRIES) {
    if (args.scope && rule.scope !== args.scope) continue;
    if (!args.includeRetired && isRetired(rule)) continue;

    const invHit = scoreMatch(rule.invariant, q);
    if (invHit.count > 0) {
      hits.push({
        ruleId: rule.ruleId,
        slug: rule.slug,
        scope: rule.scope,
        matchedIn: "invariant",
        snippet: extractSnippet(rule.invariant, invHit.firstIdx, q.length),
        score: invHit.count * 2,
      });
    }

    const body = readBody(rule);
    if (body.length > 0) {
      const bodyHit = scoreMatch(body, q);
      if (bodyHit.count > 0) {
        hits.push({
          ruleId: rule.ruleId,
          slug: rule.slug,
          scope: rule.scope,
          matchedIn: "body",
          snippet: extractSnippet(body, bodyHit.firstIdx, q.length),
          score: bodyHit.count,
        });
      }
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return {
    mode: "search",
    query: q,
    count: Math.min(hits.length, limit),
    hits: hits.slice(0, limit),
  };
}
