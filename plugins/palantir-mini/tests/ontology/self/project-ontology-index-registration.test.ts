// Test: Wave-2 self-Ontology ProjectOntologyIndex ObjectType — pm's per-project
// capability + surface index registered AS an ObjectType + 1 self-directed index (the
// palantir-mini plugin itself, seeded as BackwardProp evidence). Proves the TYPE resolves
// from the registry and that the seed resolves + counts + carries no duplicate projectRoot
// (further indexes are runtime-seeded per project init). Importing the module executes its
// self-registration side effect.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE,
  PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE_RID,
  PROJECT_ONTOLOGY_INDEX_INSTANCES,
  type ProjectOntologyIndexInstance,
} from "#schemas/ontology/self/project-ontology-index.objecttype";

const EXPECTED_PROJECT_ONTOLOGY_INDEX_COUNT = 1;

test("self ProjectOntologyIndex ObjectType is registered with projectRoot identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE);
  expect(got!.apiName).toBe("ProjectOntologyIndex");
  expect(got!.primaryKeyProperty).toBe("projectRoot");
});

test(`ProjectOntologyIndex seed has ${EXPECTED_PROJECT_ONTOLOGY_INDEX_COUNT} unique projectRoot instance`, () => {
  expect(PROJECT_ONTOLOGY_INDEX_INSTANCES.length).toBe(
    EXPECTED_PROJECT_ONTOLOGY_INDEX_COUNT,
  );
  const ids = PROJECT_ONTOLOGY_INDEX_INSTANCES.map(
    (i: ProjectOntologyIndexInstance) => i.projectRoot,
  );
  expect(new Set(ids).size).toBe(EXPECTED_PROJECT_ONTOLOGY_INDEX_COUNT); // no duplicates
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
