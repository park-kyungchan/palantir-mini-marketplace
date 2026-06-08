// Test: Wave-3 self-Ontology GradingRubric ObjectType — pm's two runtime-neutral grading
// rubrics registered AS an ObjectType + 2 instances (the 17-criterion FDE Ontology Build
// Readiness rubric + the runtime-neutral outcome rubric engine). Proves the self-model
// gains the GradingRubric noun; the FDE instance's criterionCount is cross-checked against
// the LIVE FDE_GRADING_RUBRIC (drift guard), while the outcome engine is identity-only
// (variable, caller-supplied criteria → no fixed-count drift guard).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import { FDE_GRADING_RUBRIC } from "#schemas/ontology/primitives/fde-grading-rubric";
// Direct import executes the instance module → self-registration side effect.
import {
  GRADING_RUBRIC_OBJECT_TYPE,
  GRADING_RUBRIC_OBJECT_TYPE_RID,
  GRADING_RUBRIC_INSTANCES,
} from "#schemas/ontology/self/grading-rubric.objecttype";

const EXPECTED_RUBRIC_COUNT = 2;
const FDE_RUBRIC_ID = "rubric:fde-readiness/v1";

test("self GradingRubric ObjectType is registered with rubricId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(GRADING_RUBRIC_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(GRADING_RUBRIC_OBJECT_TYPE);
  expect(got!.apiName).toBe("GradingRubric");
  expect(got!.primaryKeyProperty).toBe("rubricId");
});

test(`GradingRubric seed has ${EXPECTED_RUBRIC_COUNT} unique rubric instances`, () => {
  expect(GRADING_RUBRIC_INSTANCES.length).toBe(EXPECTED_RUBRIC_COUNT);
  const ids = GRADING_RUBRIC_INSTANCES.map((i: { rubricId: string }) => i.rubricId);
  expect(new Set(ids).size).toBe(EXPECTED_RUBRIC_COUNT); // no duplicates
});

test("GradingRubric seed includes the FDE rubric with a LIVE-matching criterionCount (drift guard)", () => {
  // The snapshot OWNS the seed; this guard reads the live FDE_GRADING_RUBRIC and asserts
  // the FDE instance's criterionCount equals the live rubric's criterionRids length, so a
  // criterion added/removed from the FDE rubric fails loud until grading-rubric.objecttype.ts
  // is updated.
  const fde = GRADING_RUBRIC_INSTANCES.find(
    (i: { rubricId: string }) => i.rubricId === FDE_RUBRIC_ID,
  );
  expect(fde).toBeDefined();
  expect(fde!.domain).toBe("ontology");
  expect(fde!.criterionCount).toBe(FDE_GRADING_RUBRIC.criterionRids.length);
});

test("GradingRubric seed includes the runtime-neutral outcome rubric (identity-only)", () => {
  // The second rubric is the generic outcome engine (lib/grader/grade-outcome.ts) that
  // scores any caller-supplied rubric — no fixed criterion set, so criterionCount is 0
  // (variable) and domain is "any". Identity + facts only, no live-count drift guard.
  const outcome = GRADING_RUBRIC_INSTANCES.find(
    (i: { rubricId: string }) => i.rubricId === "rubric:runtime-neutral-outcome",
  );
  expect(outcome).toBeDefined();
  expect(outcome!.domain).toBe("any");
  expect(outcome!.criterionCount).toBe(0);
  expect(outcome!.source).toBe("lib/grader/grade-outcome.ts");
});
