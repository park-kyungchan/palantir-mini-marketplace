// Test: Wave-2 self-Ontology CapabilityContract ObjectType — pm's runtime-neutral
// capability/binding contracts registered AS an ObjectType + 19 instances (9 neutral
// contract type names + 10 workflow families). Proves the self-model gains the
// CapabilityContract noun and that the seed stays true to the LIVE core/contracts
// NEUTRAL_CONTRACT_TYPE_NAMES + WORKFLOW_FAMILIES arrays (drift guard).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  NEUTRAL_CONTRACT_TYPE_NAMES,
  WORKFLOW_FAMILIES,
} from "../../../core/contracts/workflow-family-enforcement";
// Direct import executes the instance module → self-registration side effect.
import {
  CAPABILITY_CONTRACT_OBJECT_TYPE,
  CAPABILITY_CONTRACT_OBJECT_TYPE_RID,
  CAPABILITY_CONTRACT_INSTANCES,
} from "#schemas/ontology/self/capability-contract.objecttype";

const EXPECTED_CONTRACT_COUNT = 19; // 9 neutral contract type names + 10 workflow families

test("self CapabilityContract ObjectType is registered with contractName identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(CAPABILITY_CONTRACT_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(CAPABILITY_CONTRACT_OBJECT_TYPE);
  expect(got!.apiName).toBe("CapabilityContract");
  expect(got!.primaryKeyProperty).toBe("contractName");
});

test(`CapabilityContract seed has ${EXPECTED_CONTRACT_COUNT} unique contract instances`, () => {
  expect(CAPABILITY_CONTRACT_INSTANCES.length).toBe(EXPECTED_CONTRACT_COUNT);
  const names = CAPABILITY_CONTRACT_INSTANCES.map(
    (i: { contractName: string }) => i.contractName,
  );
  expect(new Set(names).size).toBe(EXPECTED_CONTRACT_COUNT); // no duplicates
});

test("CapabilityContract seed matches the LIVE core/contracts arrays (drift guard)", () => {
  // The snapshot OWNS the seed; this guard reads the live NEUTRAL_CONTRACT_TYPE_NAMES +
  // WORKFLOW_FAMILIES arrays and asserts the self-model's 19 contractNames equal pm's
  // actual contract surface, so adding or removing a neutral contract type or a workflow
  // family fails loud until capability-contract.objecttype.ts is updated.
  const liveNames = [...NEUTRAL_CONTRACT_TYPE_NAMES, ...WORKFLOW_FAMILIES];
  const liveSet = new Set(liveNames);
  const seedSet = new Set(
    CAPABILITY_CONTRACT_INSTANCES.map((i: { contractName: string }) => i.contractName),
  );
  expect(liveSet.size).toBe(EXPECTED_CONTRACT_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});

test("CapabilityContract seed surfaceKind partitions neutral vs family correctly (fact guard)", () => {
  // Each instance's surfaceKind must match which live array it came from: the 9 neutral
  // contract type names are "neutral-contract"; the 10 workflow families are
  // "workflow-family" with family === contractName.
  const neutralSet = new Set<string>(NEUTRAL_CONTRACT_TYPE_NAMES);
  const familySet = new Set<string>(WORKFLOW_FAMILIES);
  for (const inst of CAPABILITY_CONTRACT_INSTANCES) {
    if (neutralSet.has(inst.contractName)) {
      expect(inst.surfaceKind).toBe("neutral-contract");
      expect(inst.family).toBe("neutral");
    } else {
      expect(familySet.has(inst.contractName)).toBe(true);
      expect(inst.surfaceKind).toBe("workflow-family");
      expect(inst.family).toBe(inst.contractName);
    }
  }
});
