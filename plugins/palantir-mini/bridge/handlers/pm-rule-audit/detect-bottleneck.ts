// palantir-mini v3.4.0 — pm-rule-audit sibling: T1 + T2 bottleneck detection.

import * as fs from "fs";
import * as path from "path";
import { RULE_REGISTRY_ENTRIES } from "#schemas/src/generated/rule-registry";
import type { RuleAuditFinding } from "#schemas/ontology/primitives/rule";
import { CEILINGS, HOME, RULES_DIR, countBodyLines, countLines } from "./types";
import { OVERLAY_RULES_DIR } from "../../../lib/runtime-overlay/resolve-rule";

/**
 * Body-LOC measurement reads the plugin-resident overlay (the real rule bodies) so
 * ceiling checks measure substance, not the external `~/.claude/rules/` stubs. Falls
 * back to RULES_DIR when an overlay file is absent (keeps the advisory non-blocking).
 */
function bodyDir(): string {
  return fs.existsSync(OVERLAY_RULES_DIR) ? OVERLAY_RULES_DIR : RULES_DIR;
}

export function checkT1Bottleneck(findings: RuleAuditFinding[]): void {
  const dir = bodyDir();
  const core = path.join(dir, "CORE.md");
  const context = path.join(dir, "CONTEXT.md");
  const browse = path.join(dir, "BROWSE.md");

  const coreLoc = countLines(core);
  const contextLoc = countLines(context);
  const browseLoc = countLines(browse);
  const total = coreLoc + contextLoc + browseLoc;

  if (coreLoc > CEILINGS.t1CoreHard) {
    findings.push({
      kind: "bottleneck:t1-file",
      severity: "warn",
      detail: `CORE.md ${coreLoc} LOC exceeds T1 hard ceiling ${CEILINGS.t1CoreHard}`,
      measured: coreLoc,
      ceiling: CEILINGS.t1CoreHard,
    });
  }
  if (contextLoc > CEILINGS.t1ContextHard) {
    findings.push({
      kind: "bottleneck:t1-file",
      severity: "warn",
      detail: `CONTEXT.md ${contextLoc} LOC exceeds T1 hard ceiling ${CEILINGS.t1ContextHard}`,
      measured: contextLoc,
      ceiling: CEILINGS.t1ContextHard,
    });
  }
  if (browseLoc > CEILINGS.t1BrowseHard) {
    findings.push({
      kind: "bottleneck:t1-file",
      severity: "advisory",
      detail: `BROWSE.md ${browseLoc} LOC exceeds T1 soft ceiling ${CEILINGS.t1BrowseHard}`,
      measured: browseLoc,
      ceiling: CEILINGS.t1BrowseHard,
    });
  }
  if (total > CEILINGS.t1TotalHard) {
    findings.push({
      kind: "bottleneck:t1-total",
      severity: "warn",
      detail: `T1 total ${total} LOC exceeds ceiling ${CEILINGS.t1TotalHard}`,
      measured: total,
      ceiling: CEILINGS.t1TotalHard,
    });
  }
}

export function checkT2Bottleneck(findings: RuleAuditFinding[]): void {
  // Per-rule ceiling honors `bodyLocCeiling` frontmatter exception (consolidation hubs).
  // Catalog total ceiling = sum of per-rule effective ceilings (default 30, or rule's bodyLocCeiling).
  // This prevents consolidation-hub LOC from inflating "total" warnings.
  let t2Total = 0;
  let t2TotalEffectiveCeiling = 0;
  const dir = bodyDir();
  for (const r of RULE_REGISTRY_ENTRIES) {
    if (r.scope !== "global" || r.tier === "T1") continue;
    // Prefer the overlay body (real substance) by NN-slug filename; fall back to the
    // registry bodyPath (external stub) when the overlay file is absent.
    const overlayFile = path.join(
      dir,
      `${String(r.ruleId).padStart(2, "0")}-${r.slug}.md`,
    );
    const abs = fs.existsSync(overlayFile)
      ? overlayFile
      : path.isAbsolute(r.bodyPath)
        ? r.bodyPath
        : path.join(HOME, r.bodyPath);
    const bodyLoc = countBodyLines(abs);
    t2Total += bodyLoc;
    const effectiveCeiling = (r as { bodyLocCeiling?: number }).bodyLocCeiling ?? CEILINGS.t2PerRuleHard;
    t2TotalEffectiveCeiling += effectiveCeiling;
    if (bodyLoc > effectiveCeiling) {
      findings.push({
        kind: "bottleneck:t2-file",
        severity: "advisory",
        ruleId: r.ruleId,
        detail: `rule ${r.ruleId} (${r.slug}) body ${bodyLoc} LOC exceeds effective ceiling ${effectiveCeiling} (frontmatter-stripped)`,
        measured: bodyLoc,
        ceiling: effectiveCeiling,
      });
    }
  }
  // Use max(static t2TotalHard, sum of effective ceilings) so consolidation-hub exceptions don't inflate the cap.
  const dynamicTotalCeiling = Math.max(CEILINGS.t2TotalHard, t2TotalEffectiveCeiling);
  if (t2Total > dynamicTotalCeiling) {
    findings.push({
      kind: "bottleneck:t2-total",
      severity: "warn",
      detail: `T2 catalog total body ${t2Total} LOC exceeds dynamic ceiling ${dynamicTotalCeiling} (sum of per-rule effective ceilings)`,
      measured: t2Total,
      ceiling: dynamicTotalCeiling,
    });
  }
}
