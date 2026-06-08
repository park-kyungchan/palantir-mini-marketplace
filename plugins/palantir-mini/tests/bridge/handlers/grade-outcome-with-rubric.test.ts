/**
 * palantir-mini — grade_outcome_with_rubric (W3e-1) tests.
 *
 * Covers the pure core (lib/grader/grade-outcome.ts) over all supported domains
 * with stub evaluators, the handler input validation, and the registration
 * load-gates (category + capability + HANDLER_MODULES) via a module-load smoke.
 */

import { test, expect, describe } from "bun:test";
import handler from "../../../bridge/handlers/grade-outcome-with-rubric";
import {
  gradeOutcome,
  type OutcomeRubricInput,
} from "../../../lib/grader/grade-outcome";
import { TOOLS, HANDLER_MODULES } from "../../../bridge/mcp-server";

const fixedNow = (() => {
  let t = 0;
  return () => (t += 1);
})();

describe("gradeOutcome pure core", () => {
  test("rule domain — regex match over evidence", async () => {
    const rubric: OutcomeRubricInput = {
      rubricId: "r:rule-regex",
      criteria: [
        {
          criterionId: "c:has-foo",
          rubricDomain: "rule",
          weightInRubric: 1,
          passFailLogic: { threshold: 1, scale: "pass-fail" },
          validationExpression: "foo",
        },
      ],
    };
    const pass = await gradeOutcome({ rubric, evidence: { note: "foobar" }, now: fixedNow });
    expect(pass.passedCriteria).toBe(1);
    expect(pass.failedCriteria).toBe(0);
    expect(pass.perCriterion[0]!.score).toBe(1);

    const fail = await gradeOutcome({ rubric, evidence: { note: "baz" }, now: fixedNow });
    expect(fail.passedCriteria).toBe(0);
    expect(fail.failedCriteria).toBe(1);
  });

  test("rule domain — minimal JSONSchema required keys", async () => {
    const rubric: OutcomeRubricInput = {
      rubricId: "r:rule-schema",
      criteria: [
        {
          criterionId: "c:requires-x",
          rubricDomain: "rule",
          weightInRubric: 1,
          passFailLogic: { threshold: 1, scale: "pass-fail" },
          validationExpression: '{"required":["x"]}',
        },
      ],
    };
    expect((await gradeOutcome({ rubric, evidence: { x: 1 }, now: fixedNow })).passedCriteria).toBe(1);
    expect((await gradeOutcome({ rubric, evidence: { y: 1 }, now: fixedNow })).failedCriteria).toBe(1);
  });

  test("code domain — uses injected codeEvaluator; absent => score 0", async () => {
    const rubric: OutcomeRubricInput = {
      rubricId: "r:code",
      criteria: [
        {
          criterionId: "c:build",
          rubricDomain: "code",
          weightInRubric: 1,
          passFailLogic: { threshold: 1, scale: "pass-fail" },
          validationExpression: "true",
        },
      ],
    };
    const withEval = await gradeOutcome({
      rubric,
      codeEvaluator: () => ({ passed: true, reasoning: "stub ok" }),
      now: fixedNow,
    });
    expect(withEval.passedCriteria).toBe(1);

    const noEval = await gradeOutcome({ rubric, now: fixedNow });
    expect(noEval.failedCriteria).toBe(1);
    expect(noEval.perCriterion[0]!.reasoning).toContain("codeEvaluator not provided");
  });

  test("model domain — injected modelGrader normalizes to 0..1", async () => {
    const rubric: OutcomeRubricInput = {
      rubricId: "r:model",
      criteria: [
        {
          criterionId: "c:quality",
          rubricDomain: "model",
          weightInRubric: 1,
          passFailLogic: { threshold: 6, scale: "0-10" },
          scoringPrompt: "score the artifact",
        },
      ],
    };
    const r = await gradeOutcome({
      rubric,
      modelGrader: async () => ({ score: 8, reasoning: "good" }),
      now: fixedNow,
    });
    expect(r.perCriterion[0]!.score).toBeCloseTo(0.8, 5);
    expect(r.perCriterion[0]!.passed).toBe(true); // 8 >= threshold 6
    expect(r.overallScore).toBeCloseTo(0.8, 5);
  });

  test("human domain — counts as humanReviewRequired, not pass/fail", async () => {
    const rubric: OutcomeRubricInput = {
      rubricId: "r:human",
      criteria: [
        {
          criterionId: "c:manual",
          rubricDomain: "human",
          weightInRubric: 1,
          passFailLogic: { threshold: 1, scale: "pass-fail" },
        },
      ],
    };
    const r = await gradeOutcome({ rubric, now: fixedNow });
    expect(r.humanReviewRequired).toBe(1);
    expect(r.passedCriteria).toBe(0);
    expect(r.failedCriteria).toBe(0);
  });

  test("hybrid domain — all-pass combinator over inline subCriteria", async () => {
    const rubric: OutcomeRubricInput = {
      rubricId: "r:hybrid",
      criteria: [
        {
          criterionId: "c:hybrid",
          rubricDomain: "hybrid",
          weightInRubric: 1,
          passFailLogic: { threshold: 1, scale: "pass-fail", combinator: "all-pass" },
          subCriteria: [
            {
              criterionId: "c:sub-pass",
              rubricDomain: "rule",
              weightInRubric: 0.5,
              passFailLogic: { threshold: 1, scale: "pass-fail" },
              validationExpression: "foo",
            },
            {
              criterionId: "c:sub-fail",
              rubricDomain: "rule",
              weightInRubric: 0.5,
              passFailLogic: { threshold: 1, scale: "pass-fail" },
              validationExpression: "absent-token",
            },
          ],
        },
      ],
    };
    const r = await gradeOutcome({ rubric, evidence: { note: "foo" }, now: fixedNow });
    expect(r.perCriterion[0]!.passed).toBe(false); // all-pass: one sub failed
  });

  test("subCriteria short-form alias is accepted", async () => {
    const rubric: OutcomeRubricInput = {
      rubricId: "r:alias",
      criteria: [
        {
          criterionId: "c:hybrid-alias",
          rubricDomain: "hybrid",
          weightInRubric: 1,
          passFailLogic: { threshold: 0.5, scale: "0-1", combinator: "avg" },
          subCriteria: [
            {
              criterionId: "c:s1",
              rubricDomain: "rule",
              weightInRubric: 1,
              passFailLogic: { threshold: 1, scale: "pass-fail" },
              validationExpression: "foo",
            },
          ],
        },
      ],
    };
    const r = await gradeOutcome({ rubric, evidence: { note: "foo" }, now: fixedNow });
    expect(r.perCriterion[0]!.passed).toBe(true);
  });

  test("simulator/visual domains are skipped (unsupported, score 0)", async () => {
    const rubric: OutcomeRubricInput = {
      rubricId: "r:unsupported",
      criteria: [
        {
          criterionId: "c:sim",
          rubricDomain: "simulator",
          weightInRubric: 1,
          passFailLogic: { threshold: 1, scale: "pass-fail" },
        },
      ],
    };
    const r = await gradeOutcome({ rubric, now: fixedNow });
    expect(r.perCriterion[0]!.score).toBe(0);
    expect(r.perCriterion[0]!.reasoning).toContain("not supported");
  });

  test("aggregate shape + weighted maxPossibleScore", async () => {
    const rubric: OutcomeRubricInput = {
      rubricId: "r:agg",
      criteria: [
        {
          criterionId: "c:a",
          rubricDomain: "rule",
          weightInRubric: 0.6,
          passFailLogic: { threshold: 1, scale: "pass-fail" },
          validationExpression: "foo",
        },
        {
          criterionId: "c:b",
          rubricDomain: "rule",
          weightInRubric: 0.4,
          passFailLogic: { threshold: 1, scale: "pass-fail" },
          validationExpression: "absent",
        },
      ],
    };
    const r = await gradeOutcome({ rubric, evidence: { note: "foo" }, now: fixedNow });
    expect(r.maxPossibleScore).toBeCloseTo(1.0, 5);
    expect(r.overallScore).toBeCloseTo(0.6, 5); // only c:a passes (weight 0.6)
    expect(r.perCriterion).toHaveLength(2);
    expect(r.rubricId).toBe("r:agg");
  });
});

describe("grade_outcome_with_rubric handler", () => {
  test("missing artifactPath throws", async () => {
    await expect(handler({ rubric: { rubricId: "x", criteria: [] } })).rejects.toThrow(
      /artifactPath/,
    );
  });

  test("missing rubric AND rubricId throws", async () => {
    await expect(handler({ artifactPath: "out.txt" })).rejects.toThrow(/rubric/);
  });
});

describe("registration load-gates", () => {
  test("both tools are registered with handler modules (module-load did not throw)", () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toContain("grade_outcome_with_rubric");
    expect(names).toContain("pm_grader_dispatch");
    expect(HANDLER_MODULES["grade_outcome_with_rubric"]).toBe("./handlers/grade-outcome-with-rubric");
    expect(HANDLER_MODULES["pm_grader_dispatch"]).toBe("./handlers/pm-grader-dispatch");
  });
});
