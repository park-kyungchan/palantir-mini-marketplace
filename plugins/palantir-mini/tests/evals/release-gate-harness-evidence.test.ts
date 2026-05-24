import { describe, expect, test } from "bun:test";
import suiteDeclaration from "../../eval-suites/release-gate-harness-evidence.json";

const CASE_IDS = [
  "testcase:release-eval-artifact-mapping",
  "testcase:release-adversarial-verifier-evidence",
  "testcase:release-outcome-replay-evidence",
];

describe("Release Gate Harness Evidence eval suite", () => {
  test("suite declaration maps PR-H release gates to local evidence concepts", () => {
    expect(suiteDeclaration.suite.suiteId).toBe("suite:release-gate-harness-evidence");
    expect(suiteDeclaration.suite.target.rid).toBe(
      "local-function:palantir-mini.pm-plugin-self-check-release",
    );
    expect(suiteDeclaration.suite.testCaseIds).toEqual(CASE_IDS);
    expect(suiteDeclaration.testCases.map((testCase) => testCase.testCaseId)).toEqual(CASE_IDS);
    expect(suiteDeclaration.suite.evaluatorPolicy.requireHumanReviewForMutation).toBe(true);
    expect(suiteDeclaration.suite.evaluatorPolicy.requiredMetrics).toEqual([
      "missing_eval_artifact_count",
      "missing_adversarial_verifier_category_count",
      "missing_outcome_replay_count",
    ]);
  });
});

