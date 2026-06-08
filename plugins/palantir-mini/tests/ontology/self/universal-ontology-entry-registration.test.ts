// Tests: Wave-2 self-Ontology ObjectType — pm's cross-runtime ontology registry surface
// registered AS a UniversalOntologyEntry ObjectType. Count = 0 (catalog §2 runtime-
// seeded): entries are created per cross-runtime request at runtime, so this is a
// registration-RESOLVES check (the type resolves from the registry) plus an empty-seed
// assertion — NOT a filesystem drift guard (there is no static seed source to diff).

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
// Importing the type module executes it → self-registration side effect.
import {
  UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE,
  UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE_RID,
  UNIVERSAL_ONTOLOGY_ENTRY_INSTANCES,
} from "#schemas/ontology/self/universal-ontology-entry.objecttype";

test("self UniversalOntologyEntry ObjectType is registered with entryId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE);
  expect(got!.apiName).toBe("UniversalOntologyEntry");
  expect(got!.primaryKeyProperty).toBe("entryId");
});

test("UniversalOntologyEntry seed is empty by design (runtime-seeded, catalog count 0)", () => {
  expect(UNIVERSAL_ONTOLOGY_ENTRY_INSTANCES.length).toBe(0);
});
