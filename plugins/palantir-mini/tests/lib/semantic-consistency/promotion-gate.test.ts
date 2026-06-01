import { describe, expect, test } from "bun:test";
import { resolveSemanticConsistency } from "../../../lib/semantic-consistency/resolver";
import {
  crmBillingSupportCustomerFixture,
  overloadedCustomerFixture,
} from "../../../lib/semantic-consistency/fixtures";
import {
  assessSemanticConsistencyPromotionGate,
} from "../../../lib/semantic-consistency/promotion-gate";

describe("semantic consistency promotion gate", () => {
  test("allows ontology-affecting promotion only with attached deterministic resolver evidence", () => {
    const resolverOutput = resolveSemanticConsistency(crmBillingSupportCustomerFixture());

    const result = assessSemanticConsistencyPromotionGate({
      subject: "sic-dtc-pair",
      ontologyAffecting: true,
      semanticConsistencyResult: resolverOutput,
      attachedResolverRunRefs: [resolverOutput.resolverRunId],
    });

    expect(result.required).toBe(true);
    expect(result.promotionAllowed).toBe(true);
    expect(result.reasonCodes).toEqual(["SEMANTIC_CONSISTENCY_READY"]);
    expect(result.resolverRunRef).toBe(resolverOutput.resolverRunId);
    expect(result.llmPromotionUsed).toBe(false);
  });

  test("blocks ontology-affecting promotion when resolver output is missing", () => {
    const result = assessSemanticConsistencyPromotionGate({
      subject: "semantic-intent-contract",
      ontologyAffecting: true,
    });

    expect(result.promotionAllowed).toBe(false);
    expect(result.reasonCodes).toEqual(["SEMANTIC_CONSISTENCY_RESULT_MISSING"]);
    expect(result.findings[0]?.field).toBe("semanticConsistencyResult");
  });

  test("blocks unresolved semantic conflicts before promotion", () => {
    const resolverOutput = resolveSemanticConsistency(overloadedCustomerFixture());

    const result = assessSemanticConsistencyPromotionGate({
      subject: "sic-dtc-pair",
      ontologyAffecting: true,
      semanticConsistencyResult: resolverOutput,
      attachedResolverRunRefs: [resolverOutput.resolverRunId],
    });

    expect(result.promotionAllowed).toBe(false);
    expect(result.reasonCodes).toContain("SEMANTIC_CONSISTENCY_UNRESOLVED_BLOCKING_CONFLICT");
    const firstConflictRef = resolverOutput.unresolvedBlockingConflictRefs[0];
    expect(firstConflictRef).toBeDefined();
    if (firstConflictRef === undefined) {
      throw new Error("Expected overloaded customer fixture to produce an unresolved conflict ref.");
    }
    expect(result.evidenceRefs).toContain(firstConflictRef);
  });

  test("blocks resolver evidence that is not attached to the approved contracts", () => {
    const resolverOutput = resolveSemanticConsistency(crmBillingSupportCustomerFixture());

    const result = assessSemanticConsistencyPromotionGate({
      subject: "digital-twin-change-contract",
      ontologyAffecting: true,
      semanticConsistencyResult: resolverOutput,
      attachedResolverRunRefs: ["semantic-resolver-run:other"],
    });

    expect(result.promotionAllowed).toBe(false);
    expect(result.reasonCodes).toEqual(["SEMANTIC_CONSISTENCY_RESOLVER_RUN_REF_MISMATCH"]);
  });

  test("does not require resolver evidence for non-ontology-affecting work", () => {
    const result = assessSemanticConsistencyPromotionGate({
      subject: "handler",
      ontologyAffecting: false,
    });

    expect(result.required).toBe(false);
    expect(result.promotionAllowed).toBe(true);
    expect(result.reasonCodes).toEqual(["SEMANTIC_CONSISTENCY_NOT_REQUIRED"]);
  });
});
