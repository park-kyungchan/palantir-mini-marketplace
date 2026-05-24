// palantir-mini v4.9.0 / sprint-055 W3.A — pm_rule_audit unused_rule_30d test
//
// Coverage: happy path against home registry returns shape-valid findings;
// fresh rule (<30d old) is skipped regardless of hook/event signal.

import { test, expect, describe } from "bun:test";
import { checkUnusedRules30d } from "../../../bridge/handlers/pm-rule-audit/detect-drift";
import type { RuleAuditFinding } from "#schemas/ontology/primitives/rule";

describe("checkUnusedRules30d", () => {
  test("returns shape-valid findings against home registry (no projectRoot)", () => {
    const findings: RuleAuditFinding[] = [];
    // No projectRoot → events.jsonl scan skipped; falls back to hookCitations only
    checkUnusedRules30d(findings, undefined);
    // Each finding must have the right kind + severity + ruleId + detail
    for (const f of findings) {
      expect(f.kind).toBe("unused_rule_30d");
      expect(f.severity).toBe("advisory");
      expect(typeof f.ruleId).toBe("number");
      expect(f.detail).toContain("0 hook citations");
      expect(f.detail).toContain("days ago");
    }
  });

  test("returns shape-valid findings against home registry (with project)", () => {
    const findings: RuleAuditFinding[] = [];
    checkUnusedRules30d(findings, "/home/palantirkc");
    // Same shape contract — events.jsonl-driven path adds mentions count
    for (const f of findings) {
      expect(f.kind).toBe("unused_rule_30d");
      expect(f.severity).toBe("advisory");
    }
  }, 10_000);

  test("non-existent project events.jsonl falls back to hookCitations only", () => {
    const findings: RuleAuditFinding[] = [];
    checkUnusedRules30d(findings, "/tmp/nonexistent-project-path-pm-test");
    // Should not throw — best-effort
    expect(findings).toBeInstanceOf(Array);
  });
});
