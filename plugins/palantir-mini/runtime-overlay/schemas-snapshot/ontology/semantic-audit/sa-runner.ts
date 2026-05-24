/**
 * Semantic Audit — bun:test Runner
 *
 * Split from legacy semantic-audit.ts v1.13.1 (D3, 2026-04-19).
 * Wraps `auditSemantics` with bun:test describe/test blocks for CLI reports.
 *
 * Consumers MUST import from the parent barrel: `from "../semantic-audit"`.
 */

import { describe, test, expect } from "bun:test";
import type { OntologyExports } from "../types";
import { auditSemantics } from "./sa-core";


export function runSemanticAudit(exports: OntologyExports): void {
  const report = auditSemantics(exports);

  describe("Semantic Audit — Twin Maturity Assessment", () => {
    test(`Twin Maturity: Stage ${report.twinMaturityStage} (${report.twinMaturityName})`, () => {
      console.log(`\n  Twin Maturity Stage: ${report.twinMaturityStage}/5 — ${report.twinMaturityName}`);
      console.log(`  Evidence: ${report.twinMaturityEvidence}`);
      console.log(`  Coverage: ${report.coveragePercent}%`);
      expect(report.twinMaturityStage).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Semantic Audit — Section Coverage", () => {
    for (const section of report.sections) {
      test(`${section.section}: ${section.coverage}`, () => {
        console.log(`  ${section.coverage === "implemented" ? "\u2705" : section.coverage === "partial" ? "\u26A0\uFE0F" : "\u274C"} ${section.section}`);
        console.log(`    Evidence: ${section.evidence}`);
        if (section.coverage !== "implemented") {
          console.log(`    Why: ${section.whyItMatters}`);
        }
        // All sections pass — this is informational, not error-based
        expect(section.coverage).toBeDefined();
      });
    }
  });

  describe("Semantic Audit — Upgrade Recommendations", () => {
    if (report.upgradeRecommendations.length === 0) {
      test("no upgrades needed — full semantic compliance", () => {
        expect(report.upgradeRecommendations).toHaveLength(0);
      });
    } else {
      for (const rec of report.upgradeRecommendations) {
        test(`[${rec.priority?.toUpperCase()}] ${rec.section}`, () => {
          console.log(`  [${rec.priority?.toUpperCase()}] ${rec.section}`);
          console.log(`    Action: ${rec.upgradeAction}`);
          expect(rec.upgradeAction).toBeTruthy();
        });
      }
    }
  });
}
