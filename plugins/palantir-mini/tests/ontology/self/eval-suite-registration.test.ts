// Test: Wave-2 self-Ontology EvalSuite ObjectType — pm's AIP-Evals suite surface
// registered AS an ObjectType. Count-0 runtime-seeded: concrete suites are authored/run
// per task, not hard-coded, so this proves the TYPE resolves from the registry and the
// instance seed is empty (no filesystem drift guard — there is no live instance source).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Direct import executes the instance module → self-registration side effect.
import {
  EVAL_SUITE_OBJECT_TYPE,
  EVAL_SUITE_OBJECT_TYPE_RID,
  EVAL_SUITE_INSTANCES,
} from "#schemas/ontology/self/eval-suite.objecttype";

test("self EvalSuite ObjectType is registered with suiteId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(EVAL_SUITE_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(EVAL_SUITE_OBJECT_TYPE);
  expect(got!.apiName).toBe("EvalSuite");
  expect(got!.primaryKeyProperty).toBe("suiteId");
});

test("EvalSuite is runtime-seeded: instance seed is empty", () => {
  expect(EVAL_SUITE_INSTANCES.length).toBe(0);
});
