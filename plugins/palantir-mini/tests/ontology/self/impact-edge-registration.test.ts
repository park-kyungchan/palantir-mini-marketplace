// Test: Wave-2 self-Ontology ImpactEdge ObjectType — pm's AST-based downstream-impact
// graph edge registered AS an ObjectType. Count-0 runtime-seeded: the deliverable is the
// TYPE registration (instances are seeded per impact query/graph build from the live
// runtime source, not the snapshot), so this is a registration-resolves test with no
// filesystem drift guard. Importing the module executes its self-registration side
// effect.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  IMPACT_EDGE_OBJECT_TYPE,
  IMPACT_EDGE_OBJECT_TYPE_RID,
  IMPACT_EDGE_INSTANCES,
} from "#schemas/ontology/self/impact-edge.objecttype";

test("self ImpactEdge ObjectType is registered with edgeId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(IMPACT_EDGE_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(IMPACT_EDGE_OBJECT_TYPE);
  expect(got!.apiName).toBe("ImpactEdge");
  expect(got!.primaryKeyProperty).toBe("edgeId");
});

test("ImpactEdge instances are empty (count-0 runtime-seeded)", () => {
  // Instances are seeded per impact query/graph build from the live runtime source, not
  // hard-coded in the snapshot; the type registration above is the Wave-2 deliverable.
  expect(IMPACT_EDGE_INSTANCES.length).toBe(0);
});

test("ImpactEdge declares its catalog key props", () => {
  const propNames = IMPACT_EDGE_OBJECT_TYPE.properties.map(
    (p: { name: string }) => p.name,
  );
  expect(propNames).toContain("edgeId");
  expect(propNames).toContain("fromRid");
  expect(propNames).toContain("toRid");
  expect(propNames).toContain("astEdgeKind");
  expect(propNames).toContain("transitiveDepth");
});
