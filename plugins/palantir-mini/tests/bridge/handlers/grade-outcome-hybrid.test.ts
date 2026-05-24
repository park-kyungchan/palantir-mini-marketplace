/**
 * palantir-mini v3.3.0 — grade_outcome_with_rubric hybrid combinator tests
 * Split from grade-outcome-with-rubric.test.ts (B.2 N1-LARGE wave 1).
 *
 * Covers: min/avg/weighted/all-pass combinators (pass/fail/mixed),
 * nested hybrid 2-deep, cycle detection, missing sub-rid, weight normalization,
 * subCriteria alias regression. All sub-criteria use rubricDomain="rule" to avoid model spawn.
 */

import { test, expect, describe, afterEach } from "bun:test";
import gradeOutcomeWithRubric from "../../../bridge/handlers/grade-outcome-with-rubric";
import {
  makeTmpDir,
  writeArtifact,
  cleanupTmpDirs,
  setIsolatedEventsFile,
  makeRule,
  makeHybrid,
} from "./grade-outcome/fixtures";

setIsolatedEventsFile("grade-hybrid");

afterEach(() => cleanupTmpDirs());

describe("grade_outcome_with_rubric — hybrid combinator", () => {
  test("min combinator: all-pass subs → parent pass, score=min", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-min-allpass",
        criteria: [
          makeRule("sub-1", 0.3, "hello"),
          makeRule("sub-2", 0.3, "world"),
          makeRule("sub-3", 0.2, "hello"),
          makeHybrid("parent", "min", ["sub-1", "sub-2", "sub-3"]),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("pass");
    expect(parent.score).toBe(1);
    expect(parent.rubricDomain).toBe("hybrid");
  });

  test("min combinator: one fail sub → parent fail, score=0 (min)", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-min-onefail",
        criteria: [
          makeRule("sub-pass", 0.5, "hello"),
          makeRule("sub-fail", 0.3, "NOTPRESENT"),
          makeHybrid("parent", "min", ["sub-pass", "sub-fail"]),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("fail");
    expect(parent.score).toBe(0);
  });

  test("min combinator: mixed pass/fail → parent fail, score=min", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-min-mixed",
        criteria: [
          makeRule("sub-a", 0.4, "hello"),
          makeRule("sub-b", 0.4, "MISSING"),
          makeHybrid("parent", "min", ["sub-a", "sub-b"]),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("fail");
    expect(parent.score).toBe(0);
  });

  test("avg combinator: all pass → parent pass, score=mean", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-avg-allpass",
        criteria: [
          makeRule("s1", 0.4, "hello"),
          makeRule("s2", 0.4, "world"),
          makeHybrid("parent", "avg", ["s1", "s2"]),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("pass");
    expect(parent.score).toBe(1);
  });

  test("avg combinator: all fail → parent fail", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-avg-allfail",
        criteria: [
          makeRule("f1", 0.4, "MISSING"),
          makeRule("f2", 0.4, "ALSO_MISSING"),
          makeHybrid("parent", "avg", ["f1", "f2"]),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("fail");
    expect(parent.score).toBe(0);
  });

  test("avg combinator: mixed; score vs threshold → pass when above", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    // 2 pass, 1 fail → avg = 2/3 ≈ 0.67; threshold=0.5 → pass
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-avg-mixed",
        criteria: [
          makeRule("p1", 0.3, "hello"),
          makeRule("p2", 0.3, "world"),
          makeRule("f1", 0.2, "MISSING"),
          makeHybrid("parent", "avg", ["p1", "p2", "f1"]),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("pass");
    expect(parent.score).toBeCloseTo(2 / 3, 5);
  });

  test("weighted combinator: normalized weights → weighted score", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-weighted-norm",
        criteria: [
          makeRule("wa", 0.3, "hello"),
          makeRule("wb", 0.4, "world"),
          makeRule("wc", 0.3, "hello"),
          makeHybrid("parent", "weighted", ["wa", "wb", "wc"], 0),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("pass");
    expect(parent.score).toBeCloseTo(1, 5);
  });

  test("weighted combinator: zero-sum weights → falls back to avg", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-weighted-zero",
        criteria: [
          makeRule("z1", 0, "hello"),
          makeRule("z2", 0, "world"),
          makeHybrid("parent", "weighted", ["z1", "z2"], 1.0),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("pass");
    expect(parent.score).toBe(1);
  });

  test("all-pass combinator: all subs pass → score=maxForScale, passFail=pass", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-allpass-pass",
        criteria: [
          makeRule("ap1", 0.4, "hello"),
          makeRule("ap2", 0.4, "world"),
          makeHybrid("parent", "all-pass", ["ap1", "ap2"]),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("pass");
    expect(parent.score).toBe(1);
  });

  test("all-pass combinator: one sub fail → score=0, passFail=fail", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-allpass-fail",
        criteria: [
          makeRule("ap-pass", 0.4, "hello"),
          makeRule("ap-fail", 0.4, "NOTHERE"),
          makeHybrid("parent", "all-pass", ["ap-pass", "ap-fail"]),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("fail");
    expect(parent.score).toBe(0);
  });

  test("nested hybrid 2-deep: parent hybrid → child hybrid → rule leafs", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-nested-2deep",
        criteria: [
          makeRule("leaf-1", 0.25, "hello"),
          makeRule("leaf-2", 0.25, "world"),
          makeHybrid("child-hybrid", "avg", ["leaf-1", "leaf-2"], 0.5),
          makeHybrid("parent-hybrid", "min", ["child-hybrid"], 0),
        ],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent-hybrid")!;
    expect(parent.passFail).toBe("pass");
    expect(parent.score).toBe(1);
    expect(parent.rubricDomain).toBe("hybrid");
  });

  test("cycle detection: hybrid referencing itself via sub → throws", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    let threw = false;
    try {
      await gradeOutcomeWithRubric({
        artifactPath,
        rubric: {
          rubricId: "test-cycle",
          criteria: [makeHybrid("parent-cycle", "avg", ["parent-cycle"], 1.0)],
        },
      });
    } catch (e) {
      threw = true;
      expect((e as Error).message).toContain("cycle detected");
    }
    expect(threw).toBe(true);
  });

  test("missing sub-criterion rid → returns needs_human_review (no throw)", async () => {
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const result = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "test-missing-rid",
        criteria: [makeHybrid("parent", "avg", ["DOES_NOT_EXIST"], 1.0)],
      },
    });
    const parent = result.perCriterion.find((c) => c.criterionId === "parent")!;
    expect(parent.passFail).toBe("needs_human_review");
    expect(result.humanReviewRequired).toBeGreaterThan(0);
  });

  test("accepts `subCriteria` alias alongside `subCriteriaRids` (B-29 regression)", async () => {
    // harness-h4 canary (2026-04-24): Planner-authored rubric passed
    // `craft.subCriteria: [3 items]` but v2.12.0 dispatcher read only
    // `subCriteriaRids`, reporting `over 0 subs` and score 0.00. v2.13.2
    // accepts both field names so existing rubrics dogfood correctly.
    const artifactPath = writeArtifact(makeTmpDir(), "hello world");
    const baseSubs = [makeRule("alias-s1", 0.4, "hello"), makeRule("alias-s2", 0.4, "world")];

    const canonical = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "alias-canonical",
        criteria: [...baseSubs, makeHybrid("parent", "avg", ["alias-s1", "alias-s2"])],
      },
    });

    const alias = await gradeOutcomeWithRubric({
      artifactPath,
      rubric: {
        rubricId: "alias-shortform",
        criteria: [
          ...baseSubs,
          {
            criterionId: "parent",
            title: "parent hybrid alias",
            rubricDomain: "hybrid",
            passFailLogic: { threshold: 0.5, scale: "0-1", combinator: "avg" },
            weightInRubric: 0.2,
            // alias name — pre-patch dispatcher would have seen 0 subs
            subCriteria: ["alias-s1", "alias-s2"],
          } as any,
        ],
      },
    });

    const pCanonical = canonical.perCriterion.find((c) => c.criterionId === "parent")!;
    const pAlias = alias.perCriterion.find((c) => c.criterionId === "parent")!;

    expect(pCanonical.score).toBe(pAlias.score);
    expect(pCanonical.passFail).toBe(pAlias.passFail);
    expect(pAlias.reasoning).toContain("over 2 subs");
    expect(pAlias.passFail).toBe("pass");
  });
});
