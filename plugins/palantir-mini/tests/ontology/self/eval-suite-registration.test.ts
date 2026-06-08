// Test: Wave-2 self-Ontology EvalSuite ObjectType — pm's AIP-Evals suite surface
// registered AS an ObjectType + 2 self-directed suite instances (the suites pm runs
// against its OWN self-model + dogfood surfaces, seeded as BackwardProp evidence). Proves
// the TYPE resolves from the registry and that the seed resolves + counts + carries no
// duplicate suiteId (per-task suites stay runtime-seeded; these self-directed ones are
// the authority).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Direct import executes the instance module → self-registration side effect.
import {
  EVAL_SUITE_OBJECT_TYPE,
  EVAL_SUITE_OBJECT_TYPE_RID,
  EVAL_SUITE_INSTANCES,
  type EvalSuiteInstance,
} from "#schemas/ontology/self/eval-suite.objecttype";

const EXPECTED_EVAL_SUITE_COUNT = 2;

test("self EvalSuite ObjectType is registered with suiteId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(EVAL_SUITE_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(EVAL_SUITE_OBJECT_TYPE);
  expect(got!.apiName).toBe("EvalSuite");
  expect(got!.primaryKeyProperty).toBe("suiteId");
});

test(`EvalSuite seed has ${EXPECTED_EVAL_SUITE_COUNT} unique suiteId instances`, () => {
  expect(EVAL_SUITE_INSTANCES.length).toBe(EXPECTED_EVAL_SUITE_COUNT);
  const ids = EVAL_SUITE_INSTANCES.map((i: EvalSuiteInstance) => i.suiteId);
  expect(new Set(ids).size).toBe(EXPECTED_EVAL_SUITE_COUNT); // no duplicates
});

test("EvalSuite seed carries non-empty testCases + target + evaluatorPolicy facts", () => {
  for (const inst of EVAL_SUITE_INSTANCES) {
    expect(inst.suiteId.length).toBeGreaterThan(0);
    expect(inst.testCases.length).toBeGreaterThan(0);
    expect(inst.target.length).toBeGreaterThan(0);
    expect(inst.evaluatorPolicy.length).toBeGreaterThan(0);
  }
});
