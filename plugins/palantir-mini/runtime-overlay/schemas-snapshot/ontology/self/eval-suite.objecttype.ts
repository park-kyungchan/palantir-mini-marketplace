/**
 * palantir-mini SELF-ONTOLOGY — EvalSuite as a registered ObjectType (Wave 2 build).
 * pm's AIP-Evals surface modeled AS ontology: an EvalSuite bundles test cases, a target
 * artifact, and an evaluator policy (the `lib/grader/` + `primitives/aip-evaluation.ts`
 * surface). Mirrors the `mcp-tool.objecttype.ts` idiom: ONE `EvalSuite` ObjectType (the
 * type) is the deliverable here.
 *
 * Count provenance: this is a count-0 (runtime-seeded) ObjectType — concrete suites are
 * authored/run per task (pm-eval-suite-author / -run), not hard-coded into the self-model
 * seed. The TYPE registration is the deliverable; `EVAL_SUITE_INSTANCES` is an empty
 * seed and the paired registration test asserts the type resolves from the registry
 * (no filesystem drift guard — there is no live instance source to cross-check).
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
    "evaluatorPolicy (the lib/grader/ + aip-evaluation.ts surface). Count-0 runtime-" +
    "seeded — concrete suites are authored/run per task (pm-eval-suite-author/-run), " +
    "not hard-coded; the type registration is the deliverable.",
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
 * EvalSuite instances — empty: this ObjectType is runtime-seeded (suites authored/run
 * per task), so the self-model seed carries no hard-coded instances. The paired
 * registration test asserts the TYPE resolves from the registry.
 */
export const EVAL_SUITE_INSTANCES: readonly EvalSuiteInstance[] = [];

// Register the EvalSuite ObjectType (the type). Instances are runtime-seeded; the type
// registration is the deliverable the paired registration test verifies.
OBJECT_TYPE_REGISTRY.register(EVAL_SUITE_OBJECT_TYPE);
