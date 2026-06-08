// Tests: Wave-2 self-Ontology ObjectType — pm's Hands-layer executor sandbox surface
// registered AS a ScenarioSandbox ObjectType. Count = 0 (catalog §2 runtime-seeded):
// sandbox sessions are materialized per exec at runtime, so this is a registration-
// RESOLVES check (the type resolves from the registry) plus an empty-seed assertion —
// NOT a filesystem drift guard (there is no static seed source to diff against).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the type module executes it → self-registration side effect.
import {
  SCENARIO_SANDBOX_OBJECT_TYPE,
  SCENARIO_SANDBOX_OBJECT_TYPE_RID,
  SCENARIO_SANDBOX_INSTANCES,
} from "#schemas/ontology/self/scenario-sandbox.objecttype";

test("self ScenarioSandbox ObjectType is registered with sandboxId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(SCENARIO_SANDBOX_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(SCENARIO_SANDBOX_OBJECT_TYPE);
  expect(got!.apiName).toBe("ScenarioSandbox");
  expect(got!.primaryKeyProperty).toBe("sandboxId");
});

test("ScenarioSandbox seed is empty by design (runtime-seeded, catalog count 0)", () => {
  expect(SCENARIO_SANDBOX_INSTANCES.length).toBe(0);
});
