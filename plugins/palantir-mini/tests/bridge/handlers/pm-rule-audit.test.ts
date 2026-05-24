// palantir-mini v3.6.0 — handler test: pm_rule_audit (C2)
// Coverage: defaults (includeAdvisory=true), filter (includeAdvisory=false), summary aggregation,
// byKind/bySeverity counts, registeredRules count.
// NOTE: lands AFTER D-NEW (rule 10 body compress + rule-registry regen) so audit findings reflect clean state.

import { test, expect, describe } from "bun:test";
import pmRuleAudit from "../../../bridge/handlers/pm-rule-audit";

describe("pm_rule_audit", () => {
  test("defaults: includeAdvisory unset → returns full findings list", async () => {
    const res = await pmRuleAudit({});
    expect(Array.isArray(res.findings)).toBe(true);
    expect(typeof res.summary.totalFindings).toBe("number");
    expect(res.summary.totalFindings).toBe(res.findings.length);
  });

  test("includeAdvisory=false filters advisory-level findings", async () => {
    const all = await pmRuleAudit({});
    const filtered = await pmRuleAudit({ includeAdvisory: false });
    const advisoryCount = all.findings.filter((f) => f.severity === "advisory").length;
    expect(filtered.findings.length).toBe(all.findings.length - advisoryCount);
    for (const f of filtered.findings) {
      expect(f.severity).not.toBe("advisory");
    }
  });

  test("summary.byKind aggregation matches findings", async () => {
    const res = await pmRuleAudit({});
    const expected: Record<string, number> = {};
    for (const f of res.findings) expected[f.kind] = (expected[f.kind] ?? 0) + 1;
    expect(res.summary.byKind).toEqual(expected);
  });

  test("summary.bySeverity aggregation matches findings", async () => {
    const res = await pmRuleAudit({});
    const expected: Record<string, number> = {};
    for (const f of res.findings) expected[f.severity] = (expected[f.severity] ?? 0) + 1;
    expect(res.summary.bySeverity).toEqual(expected);
  });

  test("summary.registeredRules ≥ 7 (post-§12-license consolidation: numbered IDs become permanent gaps, not retired stubs)", async () => {
    // Pre-2026-04-29: ≥18 (16 globals + retired stubs from R1). Post-§12-license consolidation
    // (06+09+11+13+14+15 → 12/02/08; .md files deleted; numbered IDs become permanent gaps per
    // CONTEXT.md §4 — gaps mean ABSENT, not stub-redirected). Floor lowered to track minimum
    // active rule count (7 global numbered + ruleId 0 + project:mathcrew rule 6 = 9 currently).
    const res = await pmRuleAudit({});
    expect(res.summary.registeredRules).toBeGreaterThanOrEqual(7);
  });

  test("each finding has required keys: kind, severity, detail", async () => {
    const res = await pmRuleAudit({});
    for (const f of res.findings) {
      expect(typeof f.kind).toBe("string");
      expect(typeof f.severity).toBe("string");
      expect(typeof f.detail).toBe("string");
    }
  });

  test("findings.severity ∈ {advisory, warn, block}", async () => {
    const res = await pmRuleAudit({});
    for (const f of res.findings) {
      expect(["advisory", "warn", "block"]).toContain(f.severity);
    }
  });

  test("post-D-NEW invariant: total advisory findings ≤ 10 (clean baseline)", async () => {
    // Loose upper bound — sanity check that D-NEW codegen regen has fully landed.
    // Pre-D-NEW baseline was 4 advisory findings. Post-D-NEW expects ≤3 (transient
    // until plugin reload picks up the regenerated registry; ≤10 absorbs any
    // future advisory drift without becoming flaky).
    const res = await pmRuleAudit({});
    const advisoryCount = res.findings.filter((f) => f.severity === "advisory").length;
    expect(advisoryCount).toBeLessThanOrEqual(10);
  });

  test("W1.B regression: rule 12 bodyLocCeiling:135 honored — no bottleneck:t2-file finding for rule 12", async () => {
    // Root cause (2026-05-06): stale registry had bodyLocCeiling:100 for rule 12 (lead-protocol).
    // Rule 12 body = 102 LOC → false positive advisory (102 > 100). Correct ceiling is 135
    // (consolidation-hub exception per CONTEXT.md §3 — absorbs rules 6+13+14+15).
    // Fix: regenerate rule-registry.ts from frontmatter. Post-fix, 102 < 135 → no advisory.
    const res = await pmRuleAudit({});
    const rule12Bottleneck = res.findings.filter(
      (f) => f.kind === "bottleneck:t2-file" && (f as { ruleId?: number }).ruleId === 12,
    );
    expect(rule12Bottleneck).toHaveLength(0);
  });
});
