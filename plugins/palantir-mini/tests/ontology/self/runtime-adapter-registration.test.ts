// Test: Wave-2 self-Ontology RuntimeAdapter ObjectType — pm's Hands-layer exec-adapters
// registered AS an ObjectType + 3 instances (claude/codex/gemini). Proves the self-model
// gains the RuntimeAdapter noun and that the seed (runtime + supportLevel +
// providerIdentity) stays true to the LIVE lib/runtime/capability-matrix RuntimeId roster
// (drift guard) — a runtime added/removed without updating the seed fails loud here.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import { RUNTIME_CAPABILITY_MATRIX } from "../../../lib/runtime/capability-matrix";
// Importing the instance module executes it → self-registration side effect.
import {
  RUNTIME_ADAPTER_OBJECT_TYPE,
  RUNTIME_ADAPTER_OBJECT_TYPE_RID,
  RUNTIME_ADAPTER_INSTANCES,
} from "#schemas/ontology/self/runtime-adapter.objecttype";

const EXPECTED_RUNTIME_ADAPTER_COUNT = 3;

test("self RuntimeAdapter ObjectType is registered with runtime identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(RUNTIME_ADAPTER_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(RUNTIME_ADAPTER_OBJECT_TYPE);
  expect(got!.apiName).toBe("RuntimeAdapter");
  expect(got!.primaryKeyProperty).toBe("runtime");
});

test(`RuntimeAdapter seed has ${EXPECTED_RUNTIME_ADAPTER_COUNT} unique runtime instances`, () => {
  expect(RUNTIME_ADAPTER_INSTANCES.length).toBe(EXPECTED_RUNTIME_ADAPTER_COUNT);
  const ids = RUNTIME_ADAPTER_INSTANCES.map((i: { runtime: string }) => i.runtime);
  expect(new Set(ids).size).toBe(EXPECTED_RUNTIME_ADAPTER_COUNT); // no duplicates
});

test("RuntimeAdapter seed runtime set matches the LIVE capability-matrix roster (drift guard)", () => {
  // The snapshot OWNS the seed (no lib adapter import as data); this guard reads the live
  // RUNTIME_CAPABILITY_MATRIX RuntimeId keys and asserts the self-model's 3 runtimes equal
  // pm's actual adapter roster, so adding or removing a runtime fails loud until
  // runtime-adapter.objecttype.ts is updated.
  const liveRuntimes = Object.keys(RUNTIME_CAPABILITY_MATRIX);
  const liveSet = new Set(liveRuntimes);
  const seedSet = new Set(RUNTIME_ADAPTER_INSTANCES.map((i: { runtime: string }) => i.runtime));
  expect(liveSet.size).toBe(EXPECTED_RUNTIME_ADAPTER_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});

test("RuntimeAdapter seed carries valid supportLevel + providerIdentity facts", () => {
  // Each instance carries two stored facts: supportLevel (full lib adapter vs
  // matrix-declared) and providerIdentity (the normalized self-attribution value, rule
  // 27). Assert each fact is one of the allowed values and non-empty.
  for (const inst of RUNTIME_ADAPTER_INSTANCES) {
    expect(["full", "matrix-declared"]).toContain(inst.supportLevel);
    expect(inst.providerIdentity.length).toBeGreaterThan(0);
  }
});
