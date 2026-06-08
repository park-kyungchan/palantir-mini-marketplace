// Test: Wave-2 self-Ontology EditFunction ObjectType — pm's Tier-2
// compute-to-OntologyEdit[] spec registered AS an ObjectType. Count-0 runtime-seeded:
// the deliverable is the TYPE registration (instances are seeded from the live Tier-2
// function registry, not the snapshot), so this is a registration-resolves test with no
// filesystem drift guard. Importing the module executes its self-registration side
// effect.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  EDIT_FUNCTION_OBJECT_TYPE,
  EDIT_FUNCTION_OBJECT_TYPE_RID,
  EDIT_FUNCTION_INSTANCES,
} from "#schemas/ontology/self/edit-function.objecttype";

test("self EditFunction ObjectType is registered with editFunctionName identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(EDIT_FUNCTION_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(EDIT_FUNCTION_OBJECT_TYPE);
  expect(got!.apiName).toBe("EditFunction");
  expect(got!.primaryKeyProperty).toBe("editFunctionName");
});

test("EditFunction instances are empty (count-0 runtime-seeded)", () => {
  // Instances are seeded from the live Tier-2 function registry, not hard-coded in the
  // snapshot; the type registration above is the Wave-2 deliverable.
  expect(EDIT_FUNCTION_INSTANCES.length).toBe(0);
});

test("EditFunction declares its catalog key props", () => {
  const propNames = EDIT_FUNCTION_OBJECT_TYPE.properties.map(
    (p: { name: string }) => p.name,
  );
  expect(propNames).toContain("editFunctionName");
  expect(propNames).toContain("computesEdits");
  expect(propNames).toContain("noCommit");
  expect(propNames).toContain("wrappedByActionType");
});
