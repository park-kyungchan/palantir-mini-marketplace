/**
 * palantir-mini SELF-ONTOLOGY — EvalSuite as a registered ObjectType (Wave 2 build).
 * pm's AIP-Evals surface modeled AS ontology: an EvalSuite bundles test cases, a target
 * artifact, and an evaluator policy (the `lib/grader/` + `primitives/aip-evaluation.ts`
 * surface). Mirrors the `mcp-tool.objecttype.ts` idiom: ONE `EvalSuite` ObjectType (the
 * type) is the deliverable here.
 *
 * Count provenance: most concrete suites are authored/run per task (pm-eval-suite-author /
 * -run), not hard-coded into the self-model seed. But two SELF-DIRECTED suites — the suites
 * pm runs against its OWN self-model + dogfood surfaces — are stable enough to seed here as
 * BackwardProp evidence. The TYPE registration plus the 2 seeded `EVAL_SUITE_INSTANCES` are
 * the deliverable; the paired registration test asserts the type resolves AND the 2
 * instances resolve + count + carry no duplicate ids (the seed IS the authority for these
 * self-directed suites — further per-task suites stay runtime-seeded).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (EvalSuite, runtime-seeded)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology EvalSuite ObjectType. */
export const EVAL_SUITE_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/eval-suite",
);

/**
 * EvalSuite modeled as a Palantir ObjectType. `suiteId` is the stable primary key; the
 * stored-fact surface is the AIP-Evals triple — `testCases`, `target`, and
 * `evaluatorPolicy`. Concrete suites are runtime-seeded (authored/run per task), so the
 * registered INSTANCES below are empty; the type registration is the self-model surface.
 */
export const EVAL_SUITE_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: EVAL_SUITE_OBJECT_TYPE_RID,
  apiName: "EvalSuite",
  name: "EvalSuite",
  description:
    "palantir-mini AIP-Evals suite modeled as an ObjectType: testCases + target + " +
    "evaluatorPolicy (the lib/grader/ + aip-evaluation.ts surface). Runtime-seeded for " +
    "per-task suites (pm-eval-suite-author/-run); the seed carries 2 self-directed suites " +
    "(self-ontology-registration + dogfood) pm runs against its own self-model surfaces.",
  primaryKeyProperty: "suiteId",
  titleProperty: "suiteId",
  properties: [
    { name: "suiteId", type: "string" },
    { name: "testCases", type: "string" },
    { name: "target", type: "string" },
    { name: "evaluatorPolicy", type: "string" },
  ],
};

/** A registered EvalSuite instance — stable suite identity plus the AIP-Evals triple. */
export interface EvalSuiteInstance {
  readonly suiteId: string;
  readonly testCases: string;
  readonly target: string;
  readonly evaluatorPolicy: string;
}

/**
 * EvalSuite instances — the 2 self-directed suites pm runs against its OWN surfaces,
 * seeded here as stable BackwardProp evidence (per-task suites stay runtime-seeded). Each
 * carries a kebab-case `suiteId` PK, a `testCases` summary, the `target` artifact it
 * grades, and the `evaluatorPolicy`. The paired registration test asserts these 2 resolve,
 * count, and carry no duplicate ids.
 */
export const EVAL_SUITE_INSTANCES: readonly EvalSuiteInstance[] = [
  {
    suiteId: "self-ontology-registration-suite",
    testCases:
      "per-layer registration-resolves + drift tests across the self-model registries " +
      "(ObjectType/LinkType/ActionType/Function + per-instance count assertions)",
    target: "the self-model registries (schemas-snapshot/ontology/self/** registrations)",
    evaluatorPolicy:
      "deterministic registry-resolves + instance-count assertions (bun:test), no LLM judge",
  },
  {
    suiteId: "dogfood-suite",
    testCases:
      "run propagation_audit_forward + the ONTOLOGY_DTC_BUILD_SEQUENCE end-to-end over " +
      "pm itself; assert each layer transition resolves and the build sequence completes",
    target: "propagation_audit_forward + ONTOLOGY_DTC_BUILD_SEQUENCE over the pm project",
    evaluatorPolicy:
      "deterministic chain-intact + sequence-completes assertions, no LLM judge",
  },
];

// Register the EvalSuite ObjectType (the type). The 2 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(EVAL_SUITE_OBJECT_TYPE);
