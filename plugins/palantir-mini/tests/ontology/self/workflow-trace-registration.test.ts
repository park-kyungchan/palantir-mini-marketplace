// Test: Wave-2 self-Ontology WorkflowTrace ObjectType — pm's per-run workflow lineage
// record registered AS an ObjectType. Count-0 runtime-seeded: the deliverable is the
// TYPE registration (instances are seeded per workflow run from the live runtime source,
// not the snapshot), so this is a registration-resolves test with no filesystem drift
// guard. Importing the module executes its self-registration side effect.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  WORKFLOW_TRACE_OBJECT_TYPE,
  WORKFLOW_TRACE_OBJECT_TYPE_RID,
  WORKFLOW_TRACE_INSTANCES,
} from "#schemas/ontology/self/workflow-trace.objecttype";

test("self WorkflowTrace ObjectType is registered with traceId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(WORKFLOW_TRACE_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(WORKFLOW_TRACE_OBJECT_TYPE);
  expect(got!.apiName).toBe("WorkflowTrace");
  expect(got!.primaryKeyProperty).toBe("traceId");
});

test("WorkflowTrace instances are empty (count-0 runtime-seeded)", () => {
  // Instances are seeded per workflow run from the live runtime source, not hard-coded
  // in the snapshot; the type registration above is the Wave-2 deliverable.
  expect(WORKFLOW_TRACE_INSTANCES.length).toBe(0);
});

test("WorkflowTrace declares its catalog key props", () => {
  const propNames = WORKFLOW_TRACE_OBJECT_TYPE.properties.map(
    (p: { name: string }) => p.name,
  );
  expect(propNames).toContain("traceId");
  expect(propNames).toContain("workflowFamily");
  expect(propNames).toContain("phases");
  expect(propNames).toContain("envelopeRefs");
  expect(propNames).toContain("verdict");
});
