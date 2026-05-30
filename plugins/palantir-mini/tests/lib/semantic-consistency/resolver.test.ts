import { describe, expect, test } from "bun:test";
import { resolveSemanticConsistency } from "../../../lib/semantic-consistency/resolver";
import {
  crmBillingSupportCustomerFixture,
  nonApplicableDocsOnlyFixture,
  overloadedCustomerFixture,
  repoSurfaceActionFixture,
} from "../../../lib/semantic-consistency/fixtures";

describe("semantic-consistency resolver", () => {
  test("maps source-scoped approved aliases without conflicts", () => {
    const result = resolveSemanticConsistency(crmBillingSupportCustomerFixture());
    expect(result.deterministic).toBe(true);
    expect(result.llmPromotionUsed).toBe(false);
    expect(result.conflicts).toEqual([]);
    expect(result.unresolvedBlockingConflictRefs).toEqual([]);
    expect(result.mappings.map((mapping) => mapping.mappingKind)).toEqual([
      "alias_match",
      "alias_match",
      "alias_match",
    ]);
    expect(result.canonicalTermRefs).toHaveLength(3);
  });

  test("produces blocking conflict when one source term has multiple approved candidates", () => {
    const result = resolveSemanticConsistency(overloadedCustomerFixture());
    expect(result.mappings[0]?.mappingKind).toBe("ambiguous_conflict");
    expect(result.conflicts).toHaveLength(1);
    expect(result.unresolvedBlockingConflictRefs).toEqual([result.conflicts[0]!.conflictId]);
    expect(result.conflicts[0]?.requiredDecisionQuestion).toContain("Resolve 'customer'");
  });

  test("maps exact canonical display names", () => {
    const result = resolveSemanticConsistency(repoSurfaceActionFixture());
    expect(result.mappings).toHaveLength(1);
    expect(result.mappings[0]?.mappingKind).toBe("canonical_match");
    expect(result.canonicalTermRefs[0]).toMatch(/^term:/);
  });

  test("supports explicit non-applicable evidence for read-only docs work", () => {
    const result = resolveSemanticConsistency(nonApplicableDocsOnlyFixture());
    expect(result.mappings[0]?.mappingKind).toBe("non_applicable");
    expect(result.mappings[0]?.evidenceRefs).toContain("fixture:non-applicable-docs-only");
    expect(result.unresolvedBlockingConflictRefs).toEqual([]);
  });

  test("repeatability proof is byte-identical across repeated runs", () => {
    const input = overloadedCustomerFixture();
    const outputs = Array.from({ length: 5 }, () => resolveSemanticConsistency(input));
    expect(new Set(outputs.map((output) => JSON.stringify(output))).size).toBe(1);
    expect(new Set(outputs.map((output) => output.resultHash)).size).toBe(1);
    expect(outputs[0]?.resolverRunId).toMatch(/^semantic-resolver-run:/);
  });
});
