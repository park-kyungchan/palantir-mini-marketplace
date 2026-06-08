// Test: Wave-2 self-Ontology RuntimeDecision ObjectType — pm's neutral dispatch verdict
// registered AS an ObjectType. Count-0 runtime-seeded: the deliverable is the TYPE
// registration (instances are seeded per dispatch from the live runtime source, not the
// snapshot), so this is a registration-resolves test with no filesystem drift guard.
// Importing the module executes its self-registration side effect.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  RUNTIME_DECISION_OBJECT_TYPE,
  RUNTIME_DECISION_OBJECT_TYPE_RID,
  RUNTIME_DECISION_INSTANCES,
} from "#schemas/ontology/self/runtime-decision.objecttype";

test("self RuntimeDecision ObjectType is registered with decisionId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(RUNTIME_DECISION_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(RUNTIME_DECISION_OBJECT_TYPE);
  expect(got!.apiName).toBe("RuntimeDecision");
  expect(got!.primaryKeyProperty).toBe("decisionId");
});

test("RuntimeDecision instances are empty (count-0 runtime-seeded)", () => {
  // Instances are seeded per dispatch from the live runtime source, not hard-coded in
  // the snapshot; the type registration above is the Wave-2 deliverable.
  expect(RUNTIME_DECISION_INSTANCES.length).toBe(0);
});

test("RuntimeDecision declares its catalog key props", () => {
  const propNames = RUNTIME_DECISION_OBJECT_TYPE.properties.map(
    (p: { name: string }) => p.name,
  );
  expect(propNames).toContain("decisionId");
  expect(propNames).toContain("family");
  expect(propNames).toContain("phaseId");
  expect(propNames).toContain("allowedTools");
  expect(propNames).toContain("forbiddenTools");
  expect(propNames).toContain("verdict");
});
