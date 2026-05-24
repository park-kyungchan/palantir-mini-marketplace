// palantir-mini v4.13.0 — pm-rule-query resolve helpers (B.5; sprint-061 A.W1.b)
// Extracted from pm-rule-query.ts. Slug + supersession + scope migration following.
//
// sprint-061 A.W1.b: readBody() now routes through resolveRule() from
// lib/runtime-overlay/resolve-rule.ts instead of reading ~/.claude/rules/ directly.
// Resolution order: plugin-overlay → external → not-found (same as before for external).
// When source="not-found" but the registry has the rule, a runtime_overlay_drift_detected
// event is emitted (T2 advisory) — callers receive the "body not found" message unchanged.

import * as path from "path";
import {
  RULE_REGISTRY,
  RULE_REGISTRY_ENTRIES,
} from "#schemas/src/generated/rule-registry";
import type { RuleDeclaration, RuleId } from "#schemas/ontology/primitives/rule";
import { HOME } from "./types";
import { resolveRuleSync } from "../../../lib/runtime-overlay/resolve-rule";
import { emit } from "../../../scripts/log";

function readBodyPathFallback(rule: RuleDeclaration): string | null {
  const abs = path.isAbsolute(rule.bodyPath)
    ? rule.bodyPath
    : path.join(HOME, rule.bodyPath);
  try {
    const { readFileSync, existsSync } = require("fs") as typeof import("fs");
    if (existsSync(abs)) {
      return readFileSync(abs, "utf8");
    }
  } catch {
    // ignore; caller handles not-found drift
  }
  return null;
}

export function resolveBySlug(slug: string): RuleDeclaration | undefined {
  for (const r of RULE_REGISTRY_ENTRIES) {
    if (r.slug === slug) return r;
  }
  return undefined;
}

export function followLinks(start: RuleDeclaration): {
  resolved: RuleDeclaration;
  followed: RuleId | null;
} {
  let current = start;
  let followedFrom: RuleId | null = null;
  const seen = new Set<RuleId>();
  while (true) {
    if (seen.has(current.ruleId)) break;
    seen.add(current.ruleId);
    if (current.supersededBy !== null && current.supersededBy !== undefined) {
      const next = RULE_REGISTRY.get(current.supersededBy);
      if (next) {
        followedFrom = current.ruleId;
        current = next;
        continue;
      }
    }
    if (
      current.scopeMigratedTo !== undefined &&
      current.scopeMigratedTo !== null &&
      current.scopeMigratedTo !== current.scope
    ) {
      for (const r of RULE_REGISTRY_ENTRIES) {
        if (
          r.scope === current.scopeMigratedTo &&
          (r.slug === current.slug || r.slug.includes(current.slug))
        ) {
          followedFrom = current.ruleId;
          current = r;
          break;
        }
      }
      break;
    }
    break;
  }
  return { resolved: current, followed: followedFrom };
}

/**
 * Read the body of a rule using the plugin-overlay-first resolver.
 *
 * sprint-061 A.W1.b: routes through resolveRuleSync() which checks the plugin
 * overlay first, then falls back to ~/.claude/rules/.  When source="not-found"
 * but the registry has the entry, emits a T2 advisory event.
 *
 * Fallback: if both overlay and external are absent, falls back to the legacy
 * direct path (bodyPath field from registry) so existing behaviour is preserved
 * for any rule whose bodyPath is set but whose filename differs from NN-slug.md.
 */
export function readBody(rule: RuleDeclaration): string {
  // Try overlay-first resolution by slug (most precise) then by id.
  const bySlug = resolveRuleSync(rule.slug);
  if (bySlug.source !== "not-found") return bySlug.body;

  const byId = resolveRuleSync(rule.ruleId);
  if (byId.source !== "not-found") return byId.body;

  const directBody = readBodyPathFallback(rule);
  if (directBody !== null) return directBody;

  // Both overlay and external resolution failed — emit drift advisory best-effort.
  void emit({
    type: "validation_phase_completed",
    payload: {
      phase:      "design",
      passed:     false,
      errorClass: "runtime_overlay_drift_detected",
    },
    toolName:  "pm_rule_query",
    cwd:       HOME,
    identity:  "monitor",
    reasoning: `runtime_overlay_drift_detected for rule ${rule.ruleId} (${rule.slug}): both plugin overlay and external ~/.claude/rules/ miss this file. Registry entry exists but body is unreachable. Check runtime-overlay/rules/ and ~/.claude/rules/ for correct file presence.`,
    memoryLayers: ["semantic"],
    refinementTarget: {
      kind:            "other",
      filePathOrRid:   `runtime-overlay/rules/${String(rule.ruleId).padStart(2, "0")}-${rule.slug}.md`,
      description:     "rule body file absent from both plugin overlay and external rules dir",
      confidenceLevel: "high",
    },
  }).catch(() => { /* best-effort */ });

  return `(body file not found: ${rule.bodyPath})`;
}

export function isRetired(rule: RuleDeclaration): boolean {
  return rule.supersededBy !== null && rule.supersededBy !== undefined;
}

export function matchesScope(rule: RuleDeclaration, scope?: string): boolean {
  if (!scope) return true;
  return rule.scope === scope;
}
