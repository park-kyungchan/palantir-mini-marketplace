/**
 * palantir-mini SELF-ONTOLOGY — RuntimeDecision as a registered ObjectType
 * (Wave 2 ObjectType build, harness redesign self-model). Mirrors the
 * `mcp-tool.objecttype.ts` / `agent.objecttype.ts` idiom: ONE `RuntimeDecision`
 * ObjectType (the type) modeling pm's neutral dispatch verdict, projected per-runtime.
 *
 * pm's dispatch routing modeled AS ontology: the intent router produces ONE
 * runtime-neutral decision (`core/contracts/aip-fde-local-surface.ts` +
 * `lib/delegation-recipe/`) carrying the workflow family, the phase, the allowed and
 * forbidden tool sets, and a verdict; per-runtime projections derive from that one
 * neutral decision (runtime-neutrality keystone). This file declares the type so the
 * self-model gains the RuntimeDecision noun.
 *
 * Count provenance (catalog §2): count 0 — a real surface whose instances are
 * RUNTIME-SEEDED per dispatch, not hard-coded in the snapshot. The deliverable here is
 * the TYPE registration; instances stay empty until a runtime source seeds them. The
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

/** Stable RID for the self-Ontology RuntimeDecision ObjectType. */
export const RUNTIME_DECISION_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/runtime-decision",
);

/**
 * RuntimeDecision modeled as a Palantir ObjectType. `decisionId` is the stable primary
 * key; the remaining properties carry the workflow family, the phase id, the allowed and
 * forbidden tool sets the decision scopes, and the dispatch verdict. Instances are
 * runtime-seeded per dispatch, so the registered INSTANCES set below is empty (count-0
 * runtime-seeded).
 */
export const RUNTIME_DECISION_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: RUNTIME_DECISION_OBJECT_TYPE_RID,
  apiName: "RuntimeDecision",
  name: "RuntimeDecision",
  description:
    "palantir-mini neutral dispatch verdict modeled as an ObjectType: one instance per " +
    "dispatch decision (core/contracts/aip-fde-local-surface + lib/delegation-recipe), " +
    "projected per-runtime from ONE neutral decision. decisionId identity plus family, " +
    "phaseId, allowedTools, forbiddenTools, and verdict. Instances are runtime-seeded " +
    "per dispatch, not carried in the snapshot seed.",
  primaryKeyProperty: "decisionId",
  titleProperty: "decisionId",
  properties: [
    { name: "decisionId", type: "string" },
    { name: "family", type: "string", optional: true },
    { name: "phaseId", type: "string", optional: true },
    { name: "allowedTools", type: "string", optional: true },
    { name: "forbiddenTools", type: "string", optional: true },
    { name: "verdict", type: "string", optional: true },
  ],
};

/**
 * A registered RuntimeDecision instance — stable decision identity plus the workflow
 * family, the phase id, the allowed/forbidden tool sets, and the dispatch verdict.
 */
export interface RuntimeDecisionInstance {
  readonly decisionId: string;
  readonly family?: string;
  readonly phaseId?: string;
  readonly allowedTools?: string;
  readonly forbiddenTools?: string;
  readonly verdict?: string;
}

/**
 * RuntimeDecision instances — EMPTY (count-0 runtime-seeded). Instances are generated
 * per dispatch from the live runtime source, not hard-coded here; the TYPE registration
 * is the deliverable.
 */
export const RUNTIME_DECISION_INSTANCES: readonly RuntimeDecisionInstance[] = [];

// Register the RuntimeDecision ObjectType (the type). Instances are runtime-seeded per
// dispatch; the registration above is the Wave-2 deliverable.
OBJECT_TYPE_REGISTRY.register(RUNTIME_DECISION_OBJECT_TYPE);
