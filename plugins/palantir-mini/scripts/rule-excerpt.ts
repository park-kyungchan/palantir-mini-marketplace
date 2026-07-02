// palantir-mini v2.26.0 — shared helper: rule-excerpt
//
// Fetches a rule's invariant (or its full frontmatter) via the consolidated
// pm_rule_query handler (D9 — replaces pm_rule_get/list/search) and renders
// an inline block that hooks embed into blocking messages.
// Graceful-fallback: if the registry lookup fails, emits a lightweight
// placeholder so the hook still surfaces a useful error.
//
// Authority: rules/CONTEXT.md §8.2 hook-inlining pattern;
// ~/.claude/plans/immutable-forging-summit.md §3.2 pm_rule_query design.

import * as path from "path";

export interface RuleExcerpt {
  ruleId: number;
  slug: string;
  invariant: string;
  bodyLines?: number;
  available: boolean;
  renderedBlock: string;
}

const PM_RULE_QUERY_PATH = path.resolve(
  import.meta.dirname!,
  "..",
  "bridge",
  "handlers",
  "pm-rule-query",
);

export async function fetchRuleExcerpt(ruleId: number): Promise<RuleExcerpt> {
  try {
    const mod = (await import(PM_RULE_QUERY_PATH)) as {
      default?: (args: unknown) => Promise<unknown>;
    };
    if (typeof mod.default !== "function") {
      return placeholder(ruleId, "pm_rule_query handler unavailable");
    }
    const result = (await mod.default({ byId: ruleId, withFollow: true })) as {
      mode?: string;
      rule?: { ruleId?: number; slug?: string; invariant?: string };
      body?: string;
    } | null;
    if (!result || result.mode !== "get" || !result.rule) {
      return placeholder(ruleId, `rule ${ruleId} not found in registry`);
    }
    const rule = result.rule;
    const invariant = rule.invariant ?? "(invariant missing)";
    const bodyLines = result.body ? result.body.split("\n").length : undefined;
    return {
      ruleId: rule.ruleId ?? ruleId,
      slug: rule.slug ?? "",
      invariant,
      bodyLines,
      available: true,
      renderedBlock: renderBlock(rule.ruleId ?? ruleId, rule.slug ?? "", invariant),
    };
  } catch (e) {
    const msg = (e as Error).message?.slice(0, 80) ?? "unknown";
    return placeholder(ruleId, `registry load error: ${msg}`);
  }
}

function placeholder(ruleId: number, reason: string): RuleExcerpt {
  return {
    ruleId,
    slug: "",
    invariant: `(${reason})`,
    available: false,
    renderedBlock: `=== RULE ${ruleId} INVARIANT ===\n(${reason})\n\nFor full text: pm_rule_query { byId: ${ruleId} }`,
  };
}

function renderBlock(ruleId: number, slug: string, invariant: string): string {
  return [
    `=== RULE ${String(ruleId).padStart(2, "0")} — ${slug} ===`,
    invariant,
    ``,
    `For full text: pm_rule_query { byId: ${ruleId} }`,
  ].join("\n");
}

/** Convenience: wraps a base blocker message with an inline rule excerpt. */
export async function withRuleExcerpt(
  base: string,
  ruleId: number,
): Promise<string> {
  const excerpt = await fetchRuleExcerpt(ruleId);
  return [base, "", excerpt.renderedBlock].join("\n");
}
