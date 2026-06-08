// Test: Wave-2 self-Ontology ProjectOntologyIndex ObjectType — pm's per-project
// capability + surface index registered AS an ObjectType. Count-0 runtime-seeded: the
// deliverable is the TYPE registration (instances are seeded per project init from the
// live runtime source, not the snapshot), so this is a registration-resolves test with
// no filesystem drift guard. Importing the module executes its self-registration side
// effect.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE,
  PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE_RID,
  PROJECT_ONTOLOGY_INDEX_INSTANCES,
} from "#schemas/ontology/self/project-ontology-index.objecttype";

test("self ProjectOntologyIndex ObjectType is registered with projectRoot identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE);
  expect(got!.apiName).toBe("ProjectOntologyIndex");
  expect(got!.primaryKeyProperty).toBe("projectRoot");
});

test("ProjectOntologyIndex instances are empty (count-0 runtime-seeded)", () => {
  // Instances are seeded per project init from the live runtime source, not hard-coded
  // in the snapshot; the type registration above is the Wave-2 deliverable.
  expect(PROJECT_ONTOLOGY_INDEX_INSTANCES.length).toBe(0);
});

test("ProjectOntologyIndex declares its catalog key props", () => {
  const propNames = PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE.properties.map(
    (p: { name: string }) => p.name,
  );
  expect(propNames).toContain("projectRoot");
  expect(propNames).toContain("ontologyAxes");
  expect(propNames).toContain("surfaceMutationBoundaries");
  expect(propNames).toContain("defaults");
});
