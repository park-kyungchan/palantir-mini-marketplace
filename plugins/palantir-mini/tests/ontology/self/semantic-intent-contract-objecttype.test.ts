// Tests: M-SELF deliverable #1 — pm's SemanticIntentContract registered AS a typed
// Palantir ObjectType instance. Proves the self-Ontology is un-latent: importing the
// self/ barrel self-registers the instance, so OBJECT_TYPE_REGISTRY.get(rid) resolves
// (register-grep over the snapshot was 0 before this; see pm-self-ontology-milestone).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import { STRUCT_REGISTRY } from "#schemas/ontology/primitives/struct";
import type { SicAxisKey } from "#schemas/ontology/primitives/semantic-intent-contract";
// Importing the barrel executes the instance module → self-registration side effect.
import {
  SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE,
  SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID,
  SIC_AXIS_STRUCT,
  SIC_AXIS_STRUCT_RID,
} from "#schemas/ontology/self";

const AXIS_KEYS: readonly SicAxisKey[] = [
  "data",
  "logic",
  "action",
  "governance",
  "context",
  "successEval",
  "constraintsNonGoals",
  "actors",
  "memoryPrior",
];

test("self ObjectType is registered in OBJECT_TYPE_REGISTRY (register-grep > 0)", () => {
  const got = OBJECT_TYPE_REGISTRY.get(SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE);
  expect(got!.apiName).toBe("SemanticIntentContract");
});

test("self ObjectType has correct identity contract", () => {
  expect(SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE.primaryKeyProperty).toBe("contractId");
  expect(SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE.titleProperty).toBe("confirmedIntent");
});

test("all 9 understand-phase axes are modeled as Struct Properties", () => {
  const byName = new Map(
    SEMANTIC_INTENT_CONTRACT_OBJECT_TYPE.properties.map((p) => [p.name, p]),
  );
  for (const axis of AXIS_KEYS) {
    const prop = byName.get(axis);
    expect(prop).toBeDefined();
    // Axes resolve to the registered SicAxis Struct via the "Struct" PropertyTypeName.
    expect(prop!.type).toBe("Struct");
  }
  // The primary key is also a stored property.
  expect(byName.has("contractId")).toBe(true);
});

test("SicAxis Struct is registered in STRUCT_REGISTRY (axis Properties resolve)", () => {
  const got = STRUCT_REGISTRY.get(SIC_AXIS_STRUCT_RID);
  expect(got).toBeDefined();
  expect(got).toBe(SIC_AXIS_STRUCT);
  const fieldNames = new Set(SIC_AXIS_STRUCT.fields.map((f) => f.name));
  expect(fieldNames).toEqual(new Set(["summary", "refs", "status"]));
});
