// Test: Wave-2 self-Ontology WorkflowTrace ObjectType — pm's per-run workflow lineage
// record registered AS an ObjectType + 1 self-directed trace (this self-Ontology
// instance-coverage buildout, seeded as BackwardProp evidence). Proves the TYPE resolves
// from the registry and that the seed resolves + counts + carries no duplicate traceId
// (further traces are runtime-seeded per run). Importing the module executes its
// self-registration side effect.

import { test, expect } from "bun:test";
import { OBJECT_TYPE_REGISTRY } from "#schemas/ontology/primitives/object-type";
import {
  WORKFLOW_TRACE_OBJECT_TYPE,
  WORKFLOW_TRACE_OBJECT_TYPE_RID,
  WORKFLOW_TRACE_INSTANCES,
  type WorkflowTraceInstance,
} from "#schemas/ontology/self/workflow-trace.objecttype";

const EXPECTED_WORKFLOW_TRACE_COUNT = 1;

test("self WorkflowTrace ObjectType is registered with traceId identity", () => {
  const got = OBJECT_TYPE_REGISTRY.get(WORKFLOW_TRACE_OBJECT_TYPE_RID);
  expect(got).toBeDefined();
  expect(got).toBe(WORKFLOW_TRACE_OBJECT_TYPE);
  expect(got!.apiName).toBe("WorkflowTrace");
  expect(got!.primaryKeyProperty).toBe("traceId");
});

test(`WorkflowTrace seed has ${EXPECTED_WORKFLOW_TRACE_COUNT} unique traceId instance`, () => {
  expect(WORKFLOW_TRACE_INSTANCES.length).toBe(EXPECTED_WORKFLOW_TRACE_COUNT);
  const ids = WORKFLOW_TRACE_INSTANCES.map((i: WorkflowTraceInstance) => i.traceId);
  expect(new Set(ids).size).toBe(EXPECTED_WORKFLOW_TRACE_COUNT); // no duplicates
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
