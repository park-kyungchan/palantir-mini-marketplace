// Test: Wave-2 self-Ontology RuntimeDecision ObjectType — pm's neutral dispatch verdict
// registered AS an ObjectType + 1 self-directed decision (the standing Lead
// orchestration-only delegation verdict, seeded as BackwardProp evidence). Proves the TYPE
// resolves from the registry and that the seed resolves + counts + carries no duplicate
// decisionId (further dispatch decisions are runtime-seeded). Importing the module executes
// its self-registration side effect.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  RUNTIME_DECISION_OBJECT_TYPE,
  RUNTIME_DECISION_OBJECT_TYPE_RID,
  RUNTIME_DECISION_INSTANCES,
  type RuntimeDecisionInstance,
} from "#schemas/ontology/self/runtime-decision.objecttype";

const EXPECTED_RUNTIME_DECISION_COUNT = 1;

test("self RuntimeDecision ObjectType is registered with decisionId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(RUNTIME_DECISION_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(RUNTIME_DECISION_OBJECT_TYPE);
  expect(got!.apiName).toBe("RuntimeDecision");
  expect(got!.primaryKeyProperty).toBe("decisionId");
});

test(`RuntimeDecision seed has ${EXPECTED_RUNTIME_DECISION_COUNT} unique decisionId instance`, () => {
  expect(RUNTIME_DECISION_INSTANCES.length).toBe(EXPECTED_RUNTIME_DECISION_COUNT);
  const ids = RUNTIME_DECISION_INSTANCES.map(
    (i: RuntimeDecisionInstance) => i.decisionId,
  );
  expect(new Set(ids).size).toBe(EXPECTED_RUNTIME_DECISION_COUNT); // no duplicates
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
