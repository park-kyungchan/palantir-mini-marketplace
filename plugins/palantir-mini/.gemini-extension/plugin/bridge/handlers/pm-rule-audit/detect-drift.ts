// palantir-mini v4.9.0 — pm-rule-audit sibling: drift + recycled-id + unused-30d detection.

import * as fs from "fs";
import * as path from "path";
import { RULE_REGISTRY_ENTRIES } from "#schemas/src/generated/rule-registry";
import {
  isRuleRetired,
  isRuleScopeMigrated,
  type RuleAuditFinding,
  type RuleDeclaration,
} from "#schemas/ontology/primitives/rule";
import { readEvents } from "../../../lib/event-log/read";
import { MEMORY_MD, RULES_DIR } from "./types";

export function checkFileCountDrift(findings: RuleAuditFinding[]): void {
  if (!fs.existsSync(RULES_DIR)) return;
  const diskFiles = fs
    .readdirSync(RULES_DIR)
    .filter((f) => f.endsWith(".md") && /^\d{2}-/.test(f));
  // Compare disk to ACTIVE rules only — retired stubs + scope-migrated entries
  // remain in registry for historical traceability (rule 08 codegen authority +
  // CONTEXT.md §4 numbered-ID stability) but their .md files are intentionally
  // absent post-§12-license consolidation.
  const activeRegistered = RULE_REGISTRY_ENTRIES.filter(
    (r) =>
      r.scope === "global" &&
      r.ruleId >= 1 &&
      !isRuleRetired(r) &&
      !isRuleScopeMigrated(r),
  ).length;
  if (diskFiles.length !== activeRegistered) {
    findings.push({
      kind: "drift:file-count",
      severity: "warn",
      detail: `global numbered rule files on disk: ${diskFiles.length}; active registered: ${activeRegistered}`,
      measured: diskFiles.length,
      ceiling: activeRegistered,
    });
  }
}

export function checkMemoryCounter(findings: RuleAuditFinding[]): void {
  if (!fs.existsSync(MEMORY_MD)) return;
  const content = fs.readFileSync(MEMORY_MD, "utf8");
  const match = content.match(/rules\/:\s*(\d+)\s*files?,\s*[~]?(\d+)\s*lines?/i);
  if (!match) return;
  const claimedFiles = parseInt(match[1] ?? "0", 10);
  const claimedLoc = parseInt(match[2] ?? "0", 10);
  // Compare MEMORY.md claim to ACTIVE rules only (retired stubs + scope-migrated
  // entries don't have on-disk files post-§12-license consolidation).
  const activeRegistered = RULE_REGISTRY_ENTRIES.filter(
    (r) =>
      r.scope === "global" && !isRuleRetired(r) && !isRuleScopeMigrated(r),
  ).length;
  if (Math.abs(claimedFiles - activeRegistered) > 2) {
    findings.push({
      kind: "drift:memory-counter",
      severity: "advisory",
      detail: `MEMORY.md claims rules/: ${claimedFiles} files ~${claimedLoc} LOC; active registered: ${activeRegistered}`,
      measured: claimedFiles,
      ceiling: activeRegistered,
    });
  }
}

export function checkRecycledIds(findings: RuleAuditFinding[]): void {
  const seen = new Map<string, RuleDeclaration>();
  for (const r of RULE_REGISTRY_ENTRIES) {
    const key = `${r.scope}:${r.ruleId}`;
    const prior = seen.get(key);
    if (prior) {
      findings.push({
        kind: "recycled-rule-id",
        severity: "block",
        ruleId: r.ruleId,
        detail: `ruleId ${r.ruleId} in scope ${r.scope} registered twice (slugs: ${prior.slug} + ${r.slug})`,
      });
    }
    seen.set(key, r);
  }
}

/**
 * sprint-055 W3.A — flag rules likely unused over a rolling 30-day window.
 *
 * Without native rule-fetch event tracking (no `pm_rule_query_invoked` event
 * type as of v4.9.0), this check uses two proxy signals:
 *   1. **hookCitations empty**: a rule cited by 0 hooks isn't being enforced
 *      live, so likely no active fetch.
 *   2. **lastModified > 30 days**: a rule that hasn't been touched in 30+
 *      days is unlikely to be receiving live attention.
 *   3. **events.jsonl scan (best-effort)**: count occurrences of the rule's
 *      slug in event payloads/reasoning over the window. >0 = active.
 *
 * Severity is `advisory` — humans should review before retirement. Skips
 * rules retired or scope-migrated. Skips rules <30d old.
 */
const UNUSED_RULE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function checkUnusedRules30d(findings: RuleAuditFinding[], projectRoot?: string): void {
  const now = Date.now();
  const windowStart = now - UNUSED_RULE_WINDOW_MS;

  // Best-effort events scan — group rule slug → count of payload mentions
  const slugMentions = new Map<string, number>();
  if (projectRoot) {
    const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
    if (fs.existsSync(eventsPath)) {
      try {
        const events = readEvents(eventsPath);
        for (const ev of events) {
          const when = (ev as { when?: string }).when;
          const whenMs = typeof when === "string" ? Date.parse(when) : NaN;
          if (!Number.isFinite(whenMs) || whenMs < windowStart) continue;
          const blob = JSON.stringify(ev);
          for (const r of RULE_REGISTRY_ENTRIES) {
            if (r.scope !== "global") continue;
            // Match `rule N` (with word boundary) OR slug literal
            const ruleNumPattern = new RegExp(`\\brule[\\s_-]?${r.ruleId}\\b`, "i");
            const slugPattern = new RegExp(`\\b${r.slug}\\b`, "i");
            if (ruleNumPattern.test(blob) || slugPattern.test(blob)) {
              slugMentions.set(r.slug, (slugMentions.get(r.slug) ?? 0) + 1);
            }
          }
        }
      } catch {
        // best-effort; absence of events doesn't block the audit
      }
    }
  }

  for (const r of RULE_REGISTRY_ENTRIES) {
    if (r.scope !== "global") continue;
    if (isRuleRetired(r) || isRuleScopeMigrated(r)) continue;

    const lastModMs = r.lastModified ? Date.parse(r.lastModified) : NaN;
    if (!Number.isFinite(lastModMs)) continue;

    // Skip rules <30 days old — too fresh to flag
    if (now - lastModMs < UNUSED_RULE_WINDOW_MS) continue;

    const eventMentions = slugMentions.get(r.slug) ?? 0;
    const hookCount = (r.hookCitations ?? []).length;

    // Flag only when BOTH signals are zero/empty
    if (eventMentions === 0 && hookCount === 0) {
      const ageDays = Math.floor((now - lastModMs) / (24 * 60 * 60 * 1000));
      findings.push({
        kind: "unused_rule_30d",
        severity: "advisory",
        ruleId: r.ruleId,
        detail: `rule ${r.ruleId} (${r.slug}) — 0 hook citations + 0 events.jsonl mentions over 30d window; lastModified ${ageDays} days ago. Retirement candidate (review via /palantir-mini:pm-rule-memory-prune).`,
      });
    }
  }
}
