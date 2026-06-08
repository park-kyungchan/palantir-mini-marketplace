// Test: Wave-2 self-Ontology FDEOntologyBuildSession ObjectType — pm's FDE Ontology
// Build session surface registered AS an ObjectType. Count-0 runtime-seeded: sessions are
// created per build, not hard-coded, so this proves the TYPE resolves from the registry
// and the instance seed is empty (no filesystem drift guard — no live instance source).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Direct import executes the instance module → self-registration side effect.
import {
  FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE,
  FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE_RID,
  FDE_ONTOLOGY_BUILD_SESSION_INSTANCES,
} from "#schemas/ontology/self/fde-ontology-build-session.objecttype";

test("self FDEOntologyBuildSession ObjectType is registered with sessionId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE);
  expect(got!.apiName).toBe("FDEOntologyBuildSession");
  expect(got!.primaryKeyProperty).toBe("sessionId");
});

test("FDEOntologyBuildSession is runtime-seeded: instance seed is empty", () => {
  expect(FDE_ONTOLOGY_BUILD_SESSION_INSTANCES.length).toBe(0);
});
