/**
 * palantir-mini v3.3.0 — grade_outcome_with_rubric MCP handler smoke tests.
 *
 * Hybrid combinator tests moved to grade-outcome-hybrid.test.ts (B.2 N1-LARGE wave 1).
 * Model-env validation in grade-outcome-model-env.test.ts. This file keeps lightweight
 * cross-domain integration tests that exercise the public default-export contract.
 */

import { test, expect, describe, afterEach } from "bun:test";
import gradeOutcomeWithRubric from "../../../bridge/handlers/grade-outcome-with-rubric";
import {
  makeTmpDir,
  writeArtifact,
  cleanupTmpDirs,
  setIsolatedEventsFile,
  makeRule,
} from "./grade-outcome/fixtures";

setIsolatedEventsFile("grade-smoke");

afterEach(() => cleanupTmpDirs());

describe("grade_outcome_with_rubric — public API smoke", () => {
  test("rule-domain only rubric → overallScore + perCriterion length match", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "smoke-rule",
        criteria: [
          makeRule("c1", 0.5, "hello"),
          makeRule("c2", 0.5, "world"),
        ],
      },
    });
    expect(result.rubricId).toBe("smoke-rule");
    expect(result.perCriterion.length).toBe(2);
    expect(result.passedCriteria).toBe(2);
    expect(result.failedCriteria).toBe(0);
    expect(result.overallScore).toBeCloseTo(1.0, 5);
  });

  test("missing artifactPath → throws", async () => {
    await expect(
      gradeOutcomeWithRubric({ rubric: { rubricId: "x", criteria: [] } }),
    ).rejects.toThrow(/artifactPath/);
  });

  test("missing rubric → throws", async () => {
    await expect(
      gradeOutcomeWithRubric({ artifactPath: "/tmp/x" }),
    ).rejects.toThrow(/rubric/);
  });

  test("human-domain criterion → counts toward humanReviewRequired", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "smoke-human",
        criteria: [
          {
            criterionId: "needs-human",
            title: "needs human",
            rubricDomain: "human",
            passFailLogic: { threshold: 0.5, scale: "0-1" },
            weightInRubric: 1.0,
          },
        ],
      },
    });
    expect(result.humanReviewRequired).toBe(1);
    expect(result.perCriterion[0]!.passFail).toBe("needs_human_review");
  });

  test("weightSumCheck reflects sum of all criterion weights", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "smoke-weights",
        criteria: [
          makeRule("w1", 0.3, "hello"),
          makeRule("w2", 0.7, "world"),
        ],
      },
    });
    expect(result.weightSumCheck).toBeCloseTo(1.0, 5);
  });
});
