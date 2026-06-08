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
 * Count provenance (catalog §2): instances are RUNTIME-SEEDED per dispatch, but ONE — the
 * standing Lead orchestration-only delegation decision (Lead plans/decomposes/verifies but
 * never makes direct file edits; opus subagents implement) — is stable enough to seed here
 * as BackwardProp evidence. The deliverable is the TYPE registration plus the 1 seeded
 * instance; the paired test asserts the type resolves AND the seed resolves + counts.
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
 * RuntimeDecision instances — the 1 self-directed decision: the standing Lead
 * orchestration-only delegation verdict, seeded as BackwardProp evidence (further dispatch
 * decisions stay runtime-seeded). Carries a kebab-case `decisionId` PK plus the workflow
 * family, the phase, the allowed/forbidden tool sets, and the verdict. The paired test
 * asserts it resolves + counts.
 */
export const RUNTIME_DECISION_INSTANCES: readonly RuntimeDecisionInstance[] = [
  {
    decisionId: "lead-orchestration-only-delegation",
    family: "delegation-recipe",
    phaseId: "dispatch",
    allowedTools: "Task (spawn opus subagents), Read, Grep, Glob, pm_* MCP read handlers",
    forbiddenTools: "Edit, Write, MultiEdit (Lead makes no direct file edits)",
    verdict:
      "Lead orchestrates (plan/decompose/dispatch/verify); opus subagents implement all " +
      "edits/mutation/commit-PR-merge. Correctness over token cost.",
  },
];

// Register the RuntimeDecision ObjectType (the type). The 1 instance above is data the
// self-model exposes + the registration test counts; further decisions are runtime-seeded.
OBJECT_TYPE_REGISTRY.register(RUNTIME_DECISION_OBJECT_TYPE);
