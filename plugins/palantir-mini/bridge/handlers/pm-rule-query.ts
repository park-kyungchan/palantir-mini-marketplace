// palantir-mini v3.3.0 — MCP tool handler: pm_rule_query
// Domain: OPS (Rule prim-ops-19 — schemas v1.18.0+)
//
// Thin orchestrator after v3.3.0 N1-LARGE wave 1 decomposition. Mode actions
// extracted to ./pm-rule-query/{types,resolve,match,actions/}.ts. Public API
// unchanged: default export preserved.
//
// Consolidated rule lookup: byId / bySlug / byQuery / list-all.
//
// Authority chain:
//   ~/.claude/plans/2026-04-25-harness/06-plugin-only-architecture.md §9.1 (D9)
//   -> ~/.claude/plans/immutable-forging-summit.md §3.2
//   -> rules/CONTEXT.md §5 frontmatter + §8.1 MCP handlers
//   -> schemas/ontology/primitives/rule.ts (RuleDeclaration)
//   -> schemas/src/generated/rule-registry.ts (codegen output)
//   -> this handler

import { RULE_REGISTRY_ENTRIES } from "#schemas/src/generated/rule-registry";
import { resolveBySlug } from "./pm-rule-query/resolve";
import { runGet } from "./pm-rule-query/actions/get";
import { runList } from "./pm-rule-query/actions/list";
import { runSearch } from "./pm-rule-query/actions/search";
import type { PmRuleQueryArgs, PmRuleQueryResult } from "./pm-rule-query/types";

// Backward-compat re-exports
export type { PmRuleQueryArgs, PmRuleQueryResult, RuleSearchHit } from "./pm-rule-query/types";

const DISCRIMINATOR_FIELDS = ["byId", "bySlug", "byQuery"] as const;

function countDiscriminators(args: PmRuleQueryArgs): number {
  return activeDiscriminators(args).length;
}

function activeDiscriminators(args: PmRuleQueryArgs): string[] {
  return DISCRIMINATOR_FIELDS.filter((field) => args[field] !== undefined);
}

function discriminatorRepairMessage(args: PmRuleQueryArgs): string {
  return [
    "pm_rule_query: at most ONE of { byId, bySlug, byQuery } may be set.",
    `Received discriminators: ${activeDiscriminators(args).join(", ")}.`,
    'Repair: use one of {"byId":10}, {"bySlug":"events-jsonl"}, {"byQuery":"events.jsonl"}, or omit all three for list mode with {}.',
  ].join(" ");
}

function blankQueryRepairMessage(args: PmRuleQueryArgs): string {
  return [
    "pm_rule_query: byQuery must be non-empty for search mode.",
    `Received byQuery: ${JSON.stringify(args.byQuery)}.`,
    'Repair: use {"byQuery":"events.jsonl"} or omit byQuery for list mode with {}.',
  ].join(" ");
}

export default async function pmRuleQuery(
  args: PmRuleQueryArgs,
): Promise<PmRuleQueryResult> {
  const discCount = countDiscriminators(args);
  if (discCount > 1) {
    throw new Error(discriminatorRepairMessage(args));
  }

  // Get mode — byId
  // G13b: a numeric ruleId can collide across scopes (e.g. id 1 maps to a global
  // rule plus project:<id> overlays). RULE_REGISTRY (Map keyed by ruleId) silently
  // last-wins, so resolve over RULE_REGISTRY_ENTRIES instead: honor an explicit
  // scope override, else prefer scope 'global', else fall back to the last entry.
  if (args.byId !== undefined) {
    const matches = RULE_REGISTRY_ENTRIES.filter((r) => r.ruleId === args.byId);
    if (matches.length === 0) {
      throw new Error(`pm_rule_query: rule not found (byId=${args.byId})`);
    }
    const initial =
      matches.length > 1
        ? (args.scope !== undefined
            ? matches.find((r) => r.scope === args.scope)
            : matches.find((r) => r.scope === "global")) ??
          matches[matches.length - 1]!
        : matches[0]!;
    return runGet(initial, args);
  }

  // Get mode — bySlug
  if (args.bySlug !== undefined) {
    const initial = resolveBySlug(args.bySlug);
    if (!initial) {
      throw new Error(`pm_rule_query: rule not found (bySlug='${args.bySlug}')`);
    }
    return runGet(initial, args);
  }

  // Search mode — byQuery
  if (args.byQuery !== undefined) {
    if (args.byQuery.trim().length === 0) {
      throw new Error(blankQueryRepairMessage(args));
    }
    return runSearch(args.byQuery, args);
  }

  // List mode — no discriminators set
  return runList(args);
}
