/**
 * palantir-mini SELF-ONTOLOGY — GradingRubric as a registered ObjectType + its 2
 * instances (Wave 3, harness redesign self-model build). Mirrors the `skill.objecttype.ts`
 * idiom: ONE `GradingRubric` ObjectType (the type) + pm's two runtime-neutral grading
 * rubrics seeded as instances.
 *
 * pm's AIP-Evals-style grading surface modeled AS ontology: pm ships two grading-rubric
 * families — the concrete 17-criterion FDE Ontology Build Readiness rubric
 * (`lib/fde-build/rubric-grader.ts` → `FDE_GRADING_RUBRIC`) and the runtime-neutral
 * outcome rubric engine (`lib/grader/grade-outcome.ts`, backing `grade_outcome_with_rubric`).
 * Each is one GradingRubric identity. This file declares the type and seeds the 2 rubrics
 * — the snapshot OWNS the seed (it is the authority), so it does NOT import the grader
 * tree uphill. The paired registration test asserts the ObjectType registers and the 2
 * rubricIds are present + unique (the FDE rubric's criterion count is a fixed fact; the
 * outcome engine accepts a caller-supplied rubric, so its criterionCount is 0 = variable).
 *
 * Count provenance (LIVE-verified): catalog §2 GradingRubric = 2 (lib/grader + lib/fde-build).
 * Each instance carries identity (`rubricId` = the rubric RID, the PK) plus stored facts:
 * `domain` (the rubric's applies-to scope), `criterionCount` (17 for the fixed FDE rubric;
 * 0 for the variable runtime-neutral outcome engine), and `source` (the backing lib path).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-3 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology GradingRubric ObjectType. */
export const GRADING_RUBRIC_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/grading-rubric",
);

/**
 * GradingRubric modeled as a Palantir ObjectType. `rubricId` is the stable primary key
 * (the rubric RID); `domain`, `criterionCount`, and `source` are stored facts carried on
 * each registered INSTANCE below. The PascalCase apiName mirrors the generated symbol.
 */
export const GRADING_RUBRIC_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: GRADING_RUBRIC_OBJECT_TYPE_RID,
  apiName: "GradingRubric",
  name: "GradingRubric",
  description:
    "palantir-mini AIP-Evals-style grading surface modeled as an ObjectType: one " +
    "instance per runtime-neutral grading rubric (the 17-criterion FDE Ontology Build " +
    "Readiness rubric in lib/fde-build + the runtime-neutral outcome rubric engine in " +
    "lib/grader). rubricId identity plus domain, criterionCount (0 = caller-supplied), " +
    "and source; the criteria + aggregator live in the grading-rubric.ts primitive, not here.",
  primaryKeyProperty: "rubricId",
  titleProperty: "rubricId",
  properties: [
    { name: "rubricId", type: "string" },
    { name: "domain", type: "string" },
    { name: "criterionCount", type: "number" },
    { name: "source", type: "string" },
  ],
};

/**
 * A registered GradingRubric instance — stable rubric identity (the rubric RID) plus the
 * three stored facts read off the backing grader.
 */
export interface GradingRubricInstance {
  readonly rubricId: string;
  readonly domain: string;
  readonly criterionCount: number;
  readonly source: string;
}

/**
 * The 2 GradingRubric instances — pm's LIVE grading-rubric families. Snapshot-owned seed
 * (no grader-tree import); the registration test asserts both rubricIds are present + unique.
 * The FDE rubric is the concrete canonical rubric (rubric:fde-readiness/v1, 17 criteria,
 * ontology domain); the runtime-neutral outcome rubric is the generic engine that scores
 * any caller-supplied rubric (criterionCount 0 = variable, "any" domain).
 */
export const GRADING_RUBRIC_INSTANCES: readonly GradingRubricInstance[] = [
  {
    rubricId: "rubric:fde-readiness/v1",
    domain: "ontology",
    criterionCount: 17,
    source: "lib/fde-build/rubric-grader.ts",
  },
  {
    rubricId: "rubric:runtime-neutral-outcome",
    domain: "any",
    criterionCount: 0,
    source: "lib/grader/grade-outcome.ts",
  },
];

// Register the GradingRubric ObjectType (the type). The 2 instances above are data the
// self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(GRADING_RUBRIC_OBJECT_TYPE);
