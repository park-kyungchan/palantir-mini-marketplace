// Test: Wave-3 self-Ontology SubmissionCriterion ObjectType — pm's 9-class commit-gate
// constraint classes registered AS an ObjectType + 9 instances. Proves the self-model
// gains the SubmissionCriterion noun and that the seed stays true to the LIVE
// SubmissionCriterion discriminated-union `type` members in
// lib/actions/submission-criteria.ts (drift guard) — a class added/removed without
// updating the seed fails loud here.

import { test, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Direct import executes the instance module → self-registration side effect.
import {
  SUBMISSION_CRITERION_OBJECT_TYPE,
  SUBMISSION_CRITERION_OBJECT_TYPE_RID,
  SUBMISSION_CRITERION_INSTANCES,
} from "#schemas/ontology/self/submission-criterion.objecttype";

const EXPECTED_CRITERION_COUNT = 9;

// Live source declaring the SubmissionCriterion discriminated union.
const SUBMISSION_CRITERIA_SRC = path.join(
  import.meta.dir,
  "../../../lib/actions/submission-criteria.ts",
);

test("self SubmissionCriterion ObjectType is registered with criterionName identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(SUBMISSION_CRITERION_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(SUBMISSION_CRITERION_OBJECT_TYPE);
  expect(got!.apiName).toBe("SubmissionCriterion");
  expect(got!.primaryKeyProperty).toBe("criterionName");
});

test(`SubmissionCriterion seed has ${EXPECTED_CRITERION_COUNT} unique class instances`, () => {
  expect(SUBMISSION_CRITERION_INSTANCES.length).toBe(EXPECTED_CRITERION_COUNT);
  const names = SUBMISSION_CRITERION_INSTANCES.map(
    (i: { criterionName: string }) => i.criterionName,
  );
  expect(new Set(names).size).toBe(EXPECTED_CRITERION_COUNT); // no duplicates
});

test("SubmissionCriterion seed matches the LIVE union `type` members (drift guard)", () => {
  // The snapshot OWNS the seed; this guard reads the live SubmissionCriterion union in
  // submission-criteria.ts and asserts the self-model's 9 criterionNames equal pm's actual
  // commit-gate constraint classes, so adding or removing a `type` member fails loud until
  // submission-criterion.objecttype.ts is updated. Members are the `{ type: "Name"; ... }`
  // discriminants of the exported union.
  const src = fs.readFileSync(SUBMISSION_CRITERIA_SRC, "utf8");
  const unionBlock = src.slice(
    src.indexOf("export type SubmissionCriterion ="),
    src.indexOf("export interface CriterionResult"),
  );
  const liveNames = [...unionBlock.matchAll(/\{\s*type:\s*"([A-Za-z]+)"/g)].map(
    (m: RegExpMatchArray) => m[1]!,
  );
  const liveSet = new Set(liveNames);
  const seedSet = new Set(
    SUBMISSION_CRITERION_INSTANCES.map((i: { criterionName: string }) => i.criterionName),
  );
  expect(liveSet.size).toBe(EXPECTED_CRITERION_COUNT);
  expect([...seedSet].sort()).toEqual([...liveSet].sort());
});

test("SubmissionCriterion seed carries valid criterionClass + appliesToTier facts (fact guard)", () => {
  // Each instance carries stored facts: criterionClass (LOGIC compute vs SECURITY gate),
  // blocking, and appliesToTier. Assert each is one of the allowed values; all 9 run in
  // the Tier-2 function-backed commit gate.
  for (const inst of SUBMISSION_CRITERION_INSTANCES) {
    expect(["LOGIC", "SECURITY"]).toContain(inst.criterionClass);
    expect(["tier-1", "tier-2"]).toContain(inst.appliesToTier);
    expect(typeof inst.blocking).toBe("boolean");
  }
});
