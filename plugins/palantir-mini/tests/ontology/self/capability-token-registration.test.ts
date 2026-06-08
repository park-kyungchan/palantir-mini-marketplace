// Test: Wave-3 self-Ontology CapabilityToken ObjectType — pm's L2 RBAC capability grants
// registered AS an ObjectType + 3 instances (ship-merge / schema-write / ontology-register).
// Proves the self-model gains the CapabilityToken noun and that the seed stays true to the
// LIVE lib/rbac/l2-check.ts L2_GATED_ACTIONS tuple (drift guard) — an L2-gated action
// added/removed without updating the seed fails loud here.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import { L2_GATED_ACTIONS } from "../../../lib/rbac/l2-check";
// Direct import executes the instance module → self-registration side effect.
import {
  CAPABILITY_TOKEN_OBJECT_TYPE,
  CAPABILITY_TOKEN_OBJECT_TYPE_RID,
  CAPABILITY_TOKEN_INSTANCES,
} from "#schemas/ontology/self/capability-token.objecttype";

const EXPECTED_TOKEN_COUNT = 3;

test("self CapabilityToken ObjectType is registered with tokenId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(CAPABILITY_TOKEN_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(CAPABILITY_TOKEN_OBJECT_TYPE);
  expect(got!.apiName).toBe("CapabilityToken");
  expect(got!.primaryKeyProperty).toBe("tokenId");
});

test(`CapabilityToken seed has ${EXPECTED_TOKEN_COUNT} unique token instances`, () => {
  expect(CAPABILITY_TOKEN_INSTANCES.length).toBe(EXPECTED_TOKEN_COUNT);
  const ids = CAPABILITY_TOKEN_INSTANCES.map((i: { tokenId: string }) => i.tokenId);
  expect(new Set(ids).size).toBe(EXPECTED_TOKEN_COUNT); // no duplicates
});

test("CapabilityToken seed tokenId set matches the LIVE L2_GATED_ACTIONS tuple (drift guard)", () => {
  // The snapshot OWNS the seed; this guard reads the live L2_GATED_ACTIONS tuple and
  // asserts the self-model's 3 tokenIds equal pm's actual L2-gated grant surface, so
  // adding or removing an L2-gated action fails loud until capability-token.objecttype.ts
  // is updated.
  const liveSet = new Set<string>(L2_GATED_ACTIONS);
  const seedSet = new Set(CAPABILITY_TOKEN_INSTANCES.map((i: { tokenId: string }) => i.tokenId));
  expect(liveSet.size).toBe(EXPECTED_TOKEN_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});

test("CapabilityToken seed carries L2 rbacLevel + grantedAction == scope facts (fact guard)", () => {
  // Each instance carries stored facts: scope (the capability name), rbacLevel (all L2 —
  // L3 is the orthogonal marking gate, not a capability-grant token), and grantedAction.
  // For these 3 L2 grants the grantedAction and scope both equal the gated-action tokenId.
  for (const inst of CAPABILITY_TOKEN_INSTANCES) {
    expect(inst.rbacLevel).toBe("L2");
    expect(inst.scope).toBe(inst.tokenId);
    expect(inst.grantedAction).toBe(inst.tokenId);
  }
});
