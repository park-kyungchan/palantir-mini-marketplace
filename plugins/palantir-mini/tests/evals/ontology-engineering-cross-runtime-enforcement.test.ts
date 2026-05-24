import { describe, expect, test } from "bun:test";
import suiteDeclaration from "../../eval-suites/ontology-engineering-cross-runtime-enforcement.json";

const CASE_IDS = [
  "testcase:ontology-workflow-no-runtime-question-ui",
  "testcase:ontology-workflow-approved-refs-require-fde-provenance",
  "testcase:ontology-workflow-same-turn-contract-for-claude-codex",
  "testcase:ontology-workflow-mutation-authorized-only-after-sic-dtc",
  "testcase:ontology-workflow-pretool-hook-blocks-violations",
];

describe("Ontology Engineering Cross-Runtime Enforcement eval suite declaration", () => {
  test("suite declaration maps workflow enforcement to deterministic local evidence", () => {
    expect(suiteDeclaration.suite.suiteId)
      .toBe("suite:ontology-engineering-cross-runtime-enforcement");
    expect(suiteDeclaration.suite.target.rid)
      .toBe("mcp-tool:palantir-mini.pm-ontology-engineering-workflow");
    expect(suiteDeclaration.suite.testCaseIds).toEqual(CASE_IDS);
    expect(suiteDeclaration.testCases.map((testCase) => testCase.testCaseId))
      .toEqual(CASE_IDS);
    expect(suiteDeclaration.suite.evaluatorPolicy.requireHumanReviewForMutation).toBe(true);
    expect(suiteDeclaration.suite.evaluatorPolicy.requiredMetrics).toEqual([
      "legacy_runtime_ui_field_count",
      "fde_provenance_block_count",
      "cross_runtime_shape_match_count",
      "mutation_authorization_guard_count",
      "pretool_hook_block_count",
    ]);
  });
});
