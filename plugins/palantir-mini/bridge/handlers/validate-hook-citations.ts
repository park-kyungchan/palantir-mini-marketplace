// palantir-mini v4.9.0 — MCP tool handler: validate_hook_citations
// Domain: OPS (Rule 22 hook-citation-validation; W6 P4.1)
//
// Bidirectional citation audit per rule 22 v1.0.0:
//   (a) FORWARD  — scan hooks/*.ts for `rule \d+` patterns, verify each cited
//                  ruleId exists in RULE_REGISTRY_ENTRIES as an active rule.
//   (b) REVERSE  — scan RULE_REGISTRY_ENTRIES hookCitations[], verify each cited
//                  hook *.ts source contains a back-reference to that rule's ruleId.
//
// Authority: ~/.claude/rules/22-hook-citation-validation.md §MCP handler
//            ~/.claude/rules/22-hook-citation-validation.md §Validation trigger

import * as fs from "fs";
import * as path from "path";
import { RULE_REGISTRY_ENTRIES } from "#schemas/src/generated/rule-registry";
import { isRuleRetired, isRuleScopeMigrated } from "#schemas/ontology/primitives/rule";
import { HOOK_INSTANCES } from "#schemas/ontology/self";
import { HOOKS_DIR } from "./pm-rule-audit/types";

// ─── Permanent gap IDs (rule CONTEXT.md §19) — retired with no stub file ────
const PERMANENT_GAPS = new Set([3, 4, 5, 6, 9, 11, 13, 14, 15, 17, 18]);

export interface ValidateHookCitationsResult {
  totalHooks: number;
  totalRules: number;
  forwardMismatches: Array<{ hookFile: string; citedRuleId: number; reason: string }>;
  reverseMismatches: Array<{ ruleId: number; slug: string; citedHook: string; reason: string }>;
  summary: string;
}

/**
 * Extracts all `rule \d+` references from hook source content.
 * Matches: "rule 10", "rule 10 (", "rule10", "byId: 10" patterns used in hooks.
 */
function extractCitedRuleIds(content: string): number[] {
  const ids = new Set<number>();
  // Matches: "rule 10", "rule 10 (events-jsonl)", "rule10"
  for (const m of content.matchAll(/\brule[\s_-]?(\d+)\b/gi)) {
    ids.add(parseInt(m[1]!, 10));
  }
  // Matches: "byId: 10" or "byId:10"
  for (const m of content.matchAll(/\bbyId:\s*(\d+)\b/g)) {
    ids.add(parseInt(m[1]!, 10));
  }
  return [...ids];
}

/**
 * Returns true if the given rule is "active" — i.e. not retired, not scope-migrated,
 * and not a permanent gap ID.
 */
function isActiveGlobalRule(ruleId: number): boolean {
  if (PERMANENT_GAPS.has(ruleId)) return false;
  return RULE_REGISTRY_ENTRIES.some(
    (r) =>
      r.ruleId === ruleId &&
      r.scope === "global" &&
      !isRuleRetired(r) &&
      !isRuleScopeMigrated(r),
  );
}

export default async function validateHookCitations(
  _rawArgs: unknown,
): Promise<ValidateHookCitationsResult> {
  const hooksDir = HOOKS_DIR;

  // ── Discover hook files ───────────────────────────────────────────────────
  if (!fs.existsSync(hooksDir)) {
    return {
      totalHooks: 0,
      totalRules: RULE_REGISTRY_ENTRIES.length,
      forwardMismatches: [],
      reverseMismatches: [],
      summary: `hooks/ directory not found at ${hooksDir}`,
    };
  }

  const hookFiles = fs
    .readdirSync(hooksDir)
    .filter((f) => f.endsWith(".ts"))
    .sort();

  // ── (a) FORWARD: hook source → registry ──────────────────────────────────
  const forwardMismatches: ValidateHookCitationsResult["forwardMismatches"] = [];

  for (const hookFile of hookFiles) {
    const hookPath = path.join(hooksDir, hookFile);
    let content: string;
    try {
      content = fs.readFileSync(hookPath, "utf8");
    } catch {
      continue; // unreadable — skip
    }

    const citedIds = extractCitedRuleIds(content);
    for (const ruleId of citedIds) {
      if (!isActiveGlobalRule(ruleId)) {
        const reason = PERMANENT_GAPS.has(ruleId)
          ? `rule ${ruleId} is a permanent gap ID (retired without replacement per CONTEXT.md §19)`
          : `rule ${ruleId} is not found in the active global registry`;
        forwardMismatches.push({ hookFile, citedRuleId: ruleId, reason });
      }
    }
  }

  // ── (b) REVERSE: registry hookCitations[] → hook source ──────────────────
  const reverseMismatches: ValidateHookCitationsResult["reverseMismatches"] = [];

  // Build map of hook file name (without .ts) → content
  const hookContentCache = new Map<string, string>();
  for (const hookFile of hookFiles) {
    const slug = hookFile.replace(/\.ts$/, "");
    const hookPath = path.join(hooksDir, hookFile);
    try {
      hookContentCache.set(slug, fs.readFileSync(hookPath, "utf8"));
    } catch {
      // unreadable — leave absent from cache
    }
  }

  // SSoT for the wired/unwired axis (self-Ontology seed, drift-guarded by the hook
  // registration test): a rule whose cited hook exists but is UNWIRED in hooks.json
  // promises enforcement that never fires.
  const orphanIds = new Set(
    HOOK_INSTANCES.filter((h) => h.orphanInRegistry).map((h) => h.hookId),
  );

  for (const rule of RULE_REGISTRY_ENTRIES) {
    if (rule.scope !== "global") continue;
    if (isRuleRetired(rule) || isRuleScopeMigrated(rule)) continue;

    for (const citedHook of rule.hookCitations) {
      const hookContent = hookContentCache.get(citedHook);
      if (hookContent === undefined) {
        // Hook file doesn't exist — already caught by checkHookCitations in pm-rule-audit
        // but report here for completeness
        reverseMismatches.push({
          ruleId: rule.ruleId,
          slug: rule.slug,
          citedHook,
          reason: `hook "${citedHook}.ts" does not exist in hooks/`,
        });
        continue;
      }

      if (orphanIds.has(citedHook)) {
        reverseMismatches.push({
          ruleId: rule.ruleId,
          slug: rule.slug,
          citedHook,
          reason: `hook "${citedHook}.ts" exists but is UNWIRED in hooks/hooks.json (orphanInRegistry) — rule promises enforcement that never fires`,
        });
        continue;
      }

      // Verify the hook source back-references this rule
      const backrefsInHook = extractCitedRuleIds(hookContent);
      if (!backrefsInHook.includes(rule.ruleId)) {
        reverseMismatches.push({
          ruleId: rule.ruleId,
          slug: rule.slug,
          citedHook,
          reason: `hook "${citedHook}.ts" does not contain a "rule ${rule.ruleId}" back-reference`,
        });
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = forwardMismatches.length + reverseMismatches.length;
  const summary =
    total === 0
      ? `All hook citations valid: ${hookFiles.length} hooks × ${RULE_REGISTRY_ENTRIES.length} registry entries — 0 mismatches.`
      : `${total} mismatch(es): ${forwardMismatches.length} forward (hook→rule stale) + ${reverseMismatches.length} reverse (rule hookCitations[] missing back-ref).`;

  return {
    totalHooks: hookFiles.length,
    totalRules: RULE_REGISTRY_ENTRIES.length,
    forwardMismatches,
    reverseMismatches,
    summary,
  };
}
