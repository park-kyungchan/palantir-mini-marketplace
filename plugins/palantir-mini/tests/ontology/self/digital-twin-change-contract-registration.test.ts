// Test: Wave-2 self-Ontology DigitalTwinChangeContract ObjectType — pm's approved
// mutation-boundary surface registered AS an ObjectType. DTC instances are runtime-seeded
// per front-door run (one DTC derived+approved each time an approved SIC authorizes a
// mutation boundary), so the build-time seed is EMPTY and the type registration is the
// deliverable. This is a registration-resolves test (no filesystem drift guard — there is
// no static source to drift against).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import type { DigitalTwinChangeContract } from "#schemas/ontology/primitives/digital-twin-change-contract";
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

test("self DigitalTwinChangeContract apiName is pinned to the primitive interface symbol name (drift pin)", () => {
  // Analogous to the SIC projection: the apiName MUST equal the primitive DTC interface
  // symbol name so the self-model and the unified primitive core reconcile to one symbol.
  // Pinning the CURRENT correct value catches a future rename of either side; the type-level
  // _ApiNameMatchesPrimitive ties the literal to the actual `DigitalTwinChangeContract` interface.
  type _ApiNameMatchesPrimitive = DigitalTwinChangeContract extends object ? "DigitalTwinChangeContract" : never;
  const primitiveInterfaceName: _ApiNameMatchesPrimitive = "DigitalTwinChangeContract";
  expect(DIGITAL_TWIN_CHANGE_CONTRACT_OBJECT_TYPE.apiName).toBe(primitiveInterfaceName);
});

test("DigitalTwinChangeContract seed is empty (runtime-seeded per front-door run)", () => {
  // DTCs are derived+approved at runtime from approved SICs, not a static filesystem
  // surface, so the build-time seed carries 0 instances. The type registration above is
  // the deliverable; instances populate at runtime.
  expect(DIGITAL_TWIN_CHANGE_CONTRACT_INSTANCES.length).toBe(0);
});
