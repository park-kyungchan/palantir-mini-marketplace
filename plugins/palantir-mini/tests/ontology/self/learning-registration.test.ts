// Test: Wave-2 self-Ontology Learning ObjectType — pm's cross-session LEARN store
// registered AS an ObjectType + 8 session bottleneck-learning instances (BackwardProp
// seed, user directive 2026-06-08 "bottleneck -> register in Ontology"). Proves the TYPE
// resolves from the registry and that the seed resolves + counts + carries no duplicate
// learningId (the seed IS the authority — no filesystem drift guard, since learnings are
// captured per session, not derived from a static source).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Direct import executes the instance module → self-registration side effect.
import {
  LEARNING_OBJECT_TYPE,
  LEARNING_OBJECT_TYPE_RID,
  LEARNING_INSTANCES,
  type LearningInstance,
} from "#schemas/ontology/self/learning.objecttype";

const EXPECTED_LEARNING_COUNT = 8;

test("self Learning ObjectType is registered with learningId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(LEARNING_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(LEARNING_OBJECT_TYPE);
  expect(got!.apiName).toBe("Learning");
  expect(got!.primaryKeyProperty).toBe("learningId");
});

test(`Learning seed has ${EXPECTED_LEARNING_COUNT} unique learningId instances`, () => {
  expect(LEARNING_INSTANCES.length).toBe(EXPECTED_LEARNING_COUNT);
  const ids = LEARNING_INSTANCES.map((i: LearningInstance) => i.learningId);
  expect(new Set(ids).size).toBe(EXPECTED_LEARNING_COUNT); // no duplicates
});

test("Learning seed carries non-empty decision + evidenceRefs + valid memoryLayer/refines facts", () => {
  // Each instance is a LEARN record: a one-line decision, a session/PR evidenceRefs string,
  // the agentic memoryLayer it maps to, and what it refines. Assert each stored fact is
  // non-empty and the enumerated facts fall in their allowed value sets.
  for (const inst of LEARNING_INSTANCES) {
    expect(inst.learningId.length).toBeGreaterThan(0);
    expect(inst.decision.length).toBeGreaterThan(0);
    expect(inst.evidenceRefs.length).toBeGreaterThan(0);
    expect(["working", "episodic", "semantic", "procedural"]).toContain(inst.memoryLayer);
    expect(["process", "tooling", "understanding"]).toContain(inst.refines);
  }
});
