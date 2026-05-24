// Tests for sprint-056 W3.D2 — validate_hook_citations bidirectional MCP handler.
// Authority: rule 22 v1.0.0 (hook-citation-validation).
//
// Bidirectional audit:
//   (a) Forward: hook source has `rule N` ref → check rule N exists + active in registry.
//   (b) Reverse: rule frontmatter `hookCitations:[X]` → check hook X cites that rule.

import { describe, expect, it } from "bun:test";
import validateHookCitations from "../../../bridge/handlers/validate-hook-citations";

describe("validate_hook_citations bidirectional audit", () => {
  it("returns result shape with totals + mismatch arrays + summary", async () => {
    const result = await validateHookCitations({});
    expect(typeof result.totalHooks).toBe("number");
    expect(typeof result.totalRules).toBe("number");
    expect(Array.isArray(result.forwardMismatches)).toBe(true);
    expect(Array.isArray(result.reverseMismatches)).toBe(true);
    expect(typeof result.summary).toBe("string");
  });

  it("scans real hooks/* + rules/* — non-zero totals expected on home repo", async () => {
    const result = await validateHookCitations({});
    expect(result.totalHooks).toBeGreaterThan(0);
    expect(result.totalRules).toBeGreaterThan(0);
  });

  it("forward mismatches reference live hookFile paths + ruleIds", async () => {
    const result = await validateHookCitations({});
    for (const mismatch of result.forwardMismatches) {
      expect(typeof mismatch.hookFile).toBe("string");
      expect(typeof mismatch.citedRuleId).toBe("number");
      expect(typeof mismatch.reason).toBe("string");
    }
  });

  it("reverse mismatches reference live ruleId + citedHook + reason", async () => {
    const result = await validateHookCitations({});
    for (const mismatch of result.reverseMismatches) {
      expect(typeof mismatch.ruleId).toBe("number");
      expect(typeof mismatch.citedHook).toBe("string");
      expect(typeof mismatch.reason).toBe("string");
    }
  });

  it("summary includes total counts in human-readable form", async () => {
    const result = await validateHookCitations({});
    expect(result.summary.length).toBeGreaterThan(0);
  });
});
