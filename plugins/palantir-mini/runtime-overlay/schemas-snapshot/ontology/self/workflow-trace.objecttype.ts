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
 * Count provenance (catalog §2): count 0 — a real surface whose instances are
 * RUNTIME-SEEDED per workflow run, not hard-coded in the snapshot. The deliverable here
 * is the TYPE registration; instances stay empty until a runtime source seeds them. The
 * paired test is a registration-resolves check (no filesystem drift guard, since there is
 * no static seed to cross-check).
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
 * WorkflowTrace instances — EMPTY (count-0 runtime-seeded). Instances are generated per
 * workflow run from the live runtime source, not hard-coded here; the TYPE registration
 * is the deliverable.
 */
export const WORKFLOW_TRACE_INSTANCES: readonly WorkflowTraceInstance[] = [];

// Register the WorkflowTrace ObjectType (the type). Instances are runtime-seeded per
// run; the registration above is the Wave-2 deliverable.
OBJECT_TYPE_REGISTRY.register(WORKFLOW_TRACE_OBJECT_TYPE);
