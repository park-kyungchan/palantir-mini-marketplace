/**
 * palantir-mini SELF-ONTOLOGY — WorkflowTrace as a registered ObjectType
 * (Wave 2 ObjectType build, harness redesign self-model). Mirrors the
 * `mcp-tool.objecttype.ts` / `agent.objecttype.ts` idiom: ONE `WorkflowTrace`
 * ObjectType (the type) modeling pm's per-run workflow lineage record.
 *
 * pm's workflow lineage modeled AS ontology: each run through the ontology workflow
 * machine (`lib/ontology-workflow/`) emits a trace record holding the workflow family,
 * the phases it advanced through, the event envelope refs it produced, and a final
 * verdict. This file declares the type so the self-model gains the WorkflowTrace noun.
 *
 * Count provenance (catalog §2): instances are RUNTIME-SEEDED per workflow run, but ONE
 * trace — this self-Ontology instance-coverage buildout itself — is stable enough to seed
 * here as BackwardProp evidence (the workflow that produced these seeded instances IS a
 * trace). The deliverable is the TYPE registration plus the 1 seeded instance; the paired
 * test asserts the type resolves AND the seed resolves + counts + carries no duplicate ids.
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology WorkflowTrace ObjectType. */
export const WORKFLOW_TRACE_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/workflow-trace",
);

/**
 * WorkflowTrace modeled as a Palantir ObjectType. `traceId` is the stable primary key;
 * the remaining properties carry the workflow family, the phases the run advanced
 * through, the event envelope refs it emitted, and the run verdict. Instances are
 * runtime-seeded per run, so the registered INSTANCES set below is empty (count-0
 * runtime-seeded).
 */
export const WORKFLOW_TRACE_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: WORKFLOW_TRACE_OBJECT_TYPE_RID,
  apiName: "WorkflowTrace",
  name: "WorkflowTrace",
  description:
    "palantir-mini per-run workflow lineage record modeled as an ObjectType: one " +
    "instance per workflow run (lib/ontology-workflow). traceId identity plus " +
    "workflowFamily, phases, envelopeRefs, and verdict. Instances are runtime-seeded " +
    "per run, not carried in the snapshot seed.",
  primaryKeyProperty: "traceId",
  titleProperty: "traceId",
  properties: [
    { name: "traceId", type: "string" },
    { name: "workflowFamily", type: "string", optional: true },
    { name: "phases", type: "string", optional: true },
    { name: "envelopeRefs", type: "string", optional: true },
    { name: "verdict", type: "string", optional: true },
  ],
};

/**
 * A registered WorkflowTrace instance — stable trace identity plus the workflow family,
 * the phases advanced, the emitted envelope refs, and the run verdict.
 */
export interface WorkflowTraceInstance {
  readonly traceId: string;
  readonly workflowFamily?: string;
  readonly phases?: string;
  readonly envelopeRefs?: string;
  readonly verdict?: string;
}

/**
 * WorkflowTrace instances — the 1 self-directed trace: this self-Ontology instance-coverage
 * buildout, seeded as BackwardProp evidence (further traces stay runtime-seeded per run).
 * Carries a kebab-case `traceId` PK plus the workflow family, the phases advanced, the
 * emitted envelope refs, and the run verdict. The paired test asserts it resolves + counts.
 */
export const WORKFLOW_TRACE_INSTANCES: readonly WorkflowTraceInstance[] = [
  {
    traceId: "self-ontology-instance-coverage-buildout",
    workflowFamily: "self-ontology-build",
    phases: "understand -> seed-instances -> tsc-verify -> test-verify",
    envelopeRefs: "session/2026-06-08 + self-ontology Wave 6/7",
    verdict: "count-0 ObjectTypes seeded with concrete pm instances; tsc + tests green",
  },
];

// Register the WorkflowTrace ObjectType (the type). The 1 instance above is data the
// self-model exposes + the registration test counts; further traces are runtime-seeded.
OBJECT_TYPE_REGISTRY.register(WORKFLOW_TRACE_OBJECT_TYPE);
