// Tests: Wave-3 self-Ontology ActionType catalog — pm's OWN verbs registered AS Palantir
// ActionType instances (catalog §4: 20 verb rows = 18 Tier-2 function-backed + 2 Tier-1
// declarative). Combined with the pre-existing Executor self ActionType, the self/
// ACTION_TYPE_REGISTRY holds 21 records total. This test pins the full set: every verb
// resolves by RID, no duplicate RIDs, every Tier-2 verb names a non-empty editFunctionName
// (the wrapped Function), the 2 Tier-1 verbs carry NO editFunctionName (structurally — the
// discriminated union forbids it), and every parameter is type-annotated (the ObjectTypes a
// verb references surface as typed params). Importing the self barrel fires all
// registrations via side effect.

import { test, expect } from "bun:test";
import {
  ACTION_TYPE_REGISTRY,
  type ActionTypeDeclaration,
} from "#schemas/ontology/primitives/action-type";
// Importing the self barrel executes action-types.ts + executor.actiontype.ts → registration.
import "#schemas/ontology/self/index";
import {
  SELF_ACTION_TYPES,
  REGISTER_OBJECT_TYPE_ACTION_TYPE,
  REGISTER_LINK_TYPE_ACTION_TYPE,
  REGISTER_ACTION_TYPE_ACTION_TYPE,
  REGISTER_FUNCTION_ACTION_TYPE,
  REGISTER_TIER1_DECLARATIVE_ACTION_ACTION_TYPE,
  COMMIT_EDITS_ACTION_TYPE,
  APPLY_EDIT_FUNCTION_ACTION_TYPE,
  EMIT_EVENT_ACTION_TYPE,
  ROTATE_EVENTS_ACTION_TYPE,
  PROMOTE_VALUE_GRADE_ACTION_TYPE,
  DRAFT_SEMANTIC_INTENT_CONTRACT_ACTION_TYPE,
  APPROVE_DIGITAL_TWIN_CHANGE_CONTRACT_ACTION_TYPE,
  ADVANCE_ONTOLOGY_ENGINEERING_WORKFLOW_ACTION_TYPE,
  ADVANCE_FDE_ONTOLOGY_BUILD_TURN_ACTION_TYPE,
  RECORD_PRE_MUTATION_GOVERNANCE_DECISION_ACTION_TYPE,
  ROUTE_INTENT_DISPATCH_ACTION_TYPE,
  MINT_PROMPT_ENVELOPE_ACTION_TYPE,
  PROMOTE_EVIDENCE_ACTION_TYPE,
  REGISTER_CAPABILITY_TOKEN_ACTION_TYPE,
  EVALUATE_RELEASE_GATE_ACTION_TYPE,
  EXECUTOR_ACTION_TYPE,
} from "#schemas/ontology/self";

// Catalog §4 = 20 verb rows; Executor is the +1 pre-existing self ActionType.
const EXPECTED_CATALOG_VERB_COUNT = 20;
const EXPECTED_SELF_ACTION_TYPE_COUNT = EXPECTED_CATALOG_VERB_COUNT + 1; // + Executor

// The 20 catalog verbs as a flat list (the source of truth for "all resolve" + "no dupes").
const CATALOG_VERBS: readonly ActionTypeDeclaration[] = [
  REGISTER_OBJECT_TYPE_ACTION_TYPE,
  REGISTER_LINK_TYPE_ACTION_TYPE,
  REGISTER_ACTION_TYPE_ACTION_TYPE,
  REGISTER_FUNCTION_ACTION_TYPE,
  REGISTER_TIER1_DECLARATIVE_ACTION_ACTION_TYPE,
  COMMIT_EDITS_ACTION_TYPE,
  APPLY_EDIT_FUNCTION_ACTION_TYPE,
  EMIT_EVENT_ACTION_TYPE,
  ROTATE_EVENTS_ACTION_TYPE,
  PROMOTE_VALUE_GRADE_ACTION_TYPE,
  DRAFT_SEMANTIC_INTENT_CONTRACT_ACTION_TYPE,
  APPROVE_DIGITAL_TWIN_CHANGE_CONTRACT_ACTION_TYPE,
  ADVANCE_ONTOLOGY_ENGINEERING_WORKFLOW_ACTION_TYPE,
  ADVANCE_FDE_ONTOLOGY_BUILD_TURN_ACTION_TYPE,
  RECORD_PRE_MUTATION_GOVERNANCE_DECISION_ACTION_TYPE,
  ROUTE_INTENT_DISPATCH_ACTION_TYPE,
  MINT_PROMPT_ENVELOPE_ACTION_TYPE,
  PROMOTE_EVIDENCE_ACTION_TYPE,
  REGISTER_CAPABILITY_TOKEN_ACTION_TYPE,
  EVALUATE_RELEASE_GATE_ACTION_TYPE,
];

test(`SELF_ACTION_TYPES is the 20-verb catalog (catalog §4)`, () => {
  expect(SELF_ACTION_TYPES.length).toBe(EXPECTED_CATALOG_VERB_COUNT);
  // The exported array and the flat catalog list agree (same identities, same order).
  expect([...SELF_ACTION_TYPES]).toEqual([...CATALOG_VERBS]);
});

test(`every catalog verb resolves in ACTION_TYPE_REGISTRY by RID`, () => {
  for (const verb of CATALOG_VERBS) {
    const got = ACTION_TYPE_REGISTRY.get(verb.rid);
    expect(got).toBeDefined();
    expect(got).toBe(verb); // identity, not a copy
  }
});

test(`no duplicate RIDs across the 20 verbs + Executor (21 unique self ActionTypes)`, () => {
  const rids = [...CATALOG_VERBS, EXECUTOR_ACTION_TYPE].map((a) => a.rid);
  expect(rids.length).toBe(EXPECTED_SELF_ACTION_TYPE_COUNT);
  expect(new Set(rids).size).toBe(EXPECTED_SELF_ACTION_TYPE_COUNT);
});

test(`ACTION_TYPE_REGISTRY holds all 21 self ActionTypes (20 catalog + Executor)`, () => {
  // Every self verb + Executor is retrievable; the registry is a superset of these 21.
  const all = [...CATALOG_VERBS, EXECUTOR_ACTION_TYPE];
  for (const a of all) expect(ACTION_TYPE_REGISTRY.get(a.rid)).toBe(a);
  // The registry contains at least these 21 distinct RIDs.
  const registeredRids = new Set(ACTION_TYPE_REGISTRY.list().map((a) => a.rid));
  for (const a of all) expect(registeredRids.has(a.rid)).toBe(true);
});

test(`tier split = 18 Tier-2 + 2 Tier-1 (catalog §4)`, () => {
  const tier2 = CATALOG_VERBS.filter((a) => a.tier === "tier-2");
  const tier1 = CATALOG_VERBS.filter((a) => a.tier === "tier-1");
  expect(tier2.length).toBe(18);
  expect(tier1.length).toBe(2);
});

test(`every Tier-2 verb names a non-empty editFunctionName (the wrapped Function)`, () => {
  for (const verb of CATALOG_VERBS) {
    if (verb.tier !== "tier-2") continue;
    expect(typeof verb.editFunctionName).toBe("string");
    expect(verb.editFunctionName.length).toBeGreaterThan(0);
  }
});

test(`the 2 Tier-1 verbs are pure-CRUD declarative (objectType+field+operation, NO editFunctionName)`, () => {
  const tier1 = CATALOG_VERBS.filter((a) => a.tier === "tier-1");
  expect(tier1.map((a) => a.apiName).sort()).toEqual([
    "PromoteValueGrade",
    "RegisterTier1DeclarativeAction",
  ]);
  for (const verb of tier1) {
    // Narrowed to Tier1DeclarativeAction by the tier discriminant.
    if (verb.tier !== "tier-1") continue;
    expect(typeof verb.objectType).toBe("string");
    expect(verb.objectType.length).toBeGreaterThan(0);
    expect(typeof verb.field).toBe("string");
    expect(["create", "update", "delete"]).toContain(verb.operation);
    // Structurally has no editFunctionName key (the union member lacks it).
    expect("editFunctionName" in verb).toBe(false);
  }
});

test(`every parameter is type-annotated (the referenced ObjectTypes surface as typed params)`, () => {
  for (const verb of CATALOG_VERBS) {
    expect(Array.isArray(verb.parameters)).toBe(true);
    expect(verb.parameters!.length).toBeGreaterThan(0);
    for (const p of verb.parameters!) {
      expect(typeof p.name).toBe("string");
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.type).toBe("string");
      expect(p.type.length).toBeGreaterThan(0); // annotated, never blank
      expect(typeof p.required).toBe("boolean");
    }
  }
});

test(`every verb has a self.ontology action-type RID + a stable apiName`, () => {
  const apiNames = new Set<string>();
  for (const verb of CATALOG_VERBS) {
    expect(verb.rid).toContain("pm.self.ontology/action-type/");
    expect(typeof verb.apiName).toBe("string");
    expect(verb.apiName!.length).toBeGreaterThan(0);
    apiNames.add(verb.apiName!);
  }
  // apiNames are unique across the 20 verbs.
  expect(apiNames.size).toBe(EXPECTED_CATALOG_VERB_COUNT);
});
