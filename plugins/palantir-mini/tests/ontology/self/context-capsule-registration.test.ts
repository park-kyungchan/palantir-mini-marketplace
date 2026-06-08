// Test: Wave-2 self-Ontology ContextCapsule ObjectType — pm's context-engineering
// handoff unit registered AS an ObjectType. Count-0 runtime-seeded: capsules are packaged
// per retrieval/handoff, not hard-coded, so this proves the TYPE resolves from the
// registry and the instance seed is empty (no filesystem drift guard — no live source).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Direct import executes the instance module → self-registration side effect.
import {
  CONTEXT_CAPSULE_OBJECT_TYPE,
  CONTEXT_CAPSULE_OBJECT_TYPE_RID,
  CONTEXT_CAPSULE_INSTANCES,
} from "#schemas/ontology/self/context-capsule.objecttype";

test("self ContextCapsule ObjectType is registered with capsuleId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(CONTEXT_CAPSULE_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(CONTEXT_CAPSULE_OBJECT_TYPE);
  expect(got!.apiName).toBe("ContextCapsule");
  expect(got!.primaryKeyProperty).toBe("capsuleId");
});

test("ContextCapsule is runtime-seeded: instance seed is empty", () => {
  expect(CONTEXT_CAPSULE_INSTANCES.length).toBe(0);
});
