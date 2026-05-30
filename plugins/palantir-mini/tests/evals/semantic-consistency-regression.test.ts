import { describe, expect, test } from "bun:test";
import suiteDeclaration from "../../eval-suites/semantic-consistency-regression.json";
import { fixtureOutputs } from "../../lib/semantic-consistency/fixtures";

const CASE_IDS = [
  "testcase:semantic-source-scoped-aliases",
  "testcase:semantic-overloaded-term-conflict",
  "testcase:semantic-non-applicable-evidence",
];

describe("Semantic Consistency Regression eval suite declaration", () => {
  test("suite declaration maps deterministic resolver fixtures to required metrics", () => {
    expect(suiteDeclaration.suite.suiteId).toBe("suite:semantic-consistency-regression");
    expect(suiteDeclaration.suite.target.rid).toBe("local-function:palantir-mini.resolveSemanticConsistency");
    expect(suiteDeclaration.suite.testCaseIds).toEqual(CASE_IDS);
    expect(suiteDeclaration.testCases.map((testCase) => testCase.testCaseId)).toEqual(CASE_IDS);
    expect(suiteDeclaration.suite.evaluatorPolicy.requiredMetrics).toEqual([
      "deterministic_mapping_count",
      "unresolved_blocking_conflict_count",
      "non_applicable_mapping_count",
    ]);
  });

  test("fixture outputs cover source-scoped, conflict, and non-applicable behavior", () => {
    const outputs = fixtureOutputs();

    expect(outputs.customer.deterministic).toBe(true);
    expect(outputs.customer.llmPromotionUsed).toBe(false);
    expect(outputs.customer.mappings.every((mapping) => mapping.mappingKind === "alias_match")).toBe(true);
    expect(outputs.customer.unresolvedBlockingConflictRefs).toEqual([]);

    expect(outputs.overloaded.conflicts.length).toBe(1);
    expect(outputs.overloaded.unresolvedBlockingConflictRefs).toEqual(
      outputs.overloaded.conflicts.map((conflict) => conflict.conflictId),
    );

    expect(outputs.docsOnly.mappings.every((mapping) => mapping.mappingKind === "non_applicable")).toBe(true);
    expect(outputs.docsOnly.unresolvedBlockingConflictRefs).toEqual([]);
  });
});
