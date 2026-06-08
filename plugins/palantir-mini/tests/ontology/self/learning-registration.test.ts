// Test: Wave-2 self-Ontology Learning ObjectType — pm's cross-session LEARN store
// registered AS an ObjectType. Count-0 runtime-seeded: learnings are captured per
// session, not hard-coded, so this proves the TYPE resolves from the registry and the
// instance seed is empty (no filesystem drift guard — there is no live instance source).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Direct import executes the instance module → self-registration side effect.
import {
  LEARNING_OBJECT_TYPE,
  LEARNING_OBJECT_TYPE_RID,
  LEARNING_INSTANCES,
} from "#schemas/ontology/self/learning.objecttype";

test("self Learning ObjectType is registered with learningId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(LEARNING_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(LEARNING_OBJECT_TYPE);
  expect(got!.apiName).toBe("Learning");
  expect(got!.primaryKeyProperty).toBe("learningId");
});

test("Learning is runtime-seeded: instance seed is empty", () => {
  expect(LEARNING_INSTANCES.length).toBe(0);
});
