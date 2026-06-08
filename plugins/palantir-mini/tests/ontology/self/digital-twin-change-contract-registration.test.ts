// Test: Wave-2 self-Ontology DigitalTwinChangeContract ObjectType — pm's approved
// mutation-boundary surface registered AS an ObjectType. DTC instances are runtime-seeded
// per front-door run (one DTC derived+approved each time an approved SIC authorizes a
// mutation boundary), so the build-time seed is EMPTY and the type registration is the
// deliverable. This is a registration-resolves test (no filesystem drift guard — there is
// no static source to drift against).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the instance module executes it → self-registration side effect.
import {
  DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE,
  DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID,
  DIGITAL_TWIN_CHANGE_CONTRACT_INSTANCES,
} from "#schemas/ontology/self/digital-twin-change-contract.objecttype";

test("self DigitalTwinChangeContract ObjectType is registered with dtcId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE);
  expect(got!.apiName).toBe("DigitalTwinChangeContract");
  expect(got!.primaryKeyProperty).toBe("dtcId");
});

test("DigitalTwinChangeContract seed is empty (runtime-seeded per front-door run)", () => {
  // DTCs are derived+approved at runtime from approved SICs, not a static filesystem
  // surface, so the build-time seed carries 0 instances. The type registration above is
  // the deliverable; instances populate at runtime.
  expect(DIGITAL_TWIN_CHANGE_CONTRACT_INSTANCES.length).toBe(0);
});
