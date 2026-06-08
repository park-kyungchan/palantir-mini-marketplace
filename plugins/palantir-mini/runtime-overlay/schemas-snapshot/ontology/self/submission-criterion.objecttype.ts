/**
 * palantir-mini SELF-ONTOLOGY — SubmissionCriterion as a registered ObjectType + its 9
 * instances (Wave 3, harness redesign self-model build). Mirrors the `skill.objecttype.ts`
 * idiom: ONE `SubmissionCriterion` ObjectType (the type) + the 9 commit-gate constraint
 * classes seeded as instances.
 *
 * pm's atomic-commit submission gate modeled AS ontology: the `commit_edits` ActionType
 * runs a pre-flight gate (`lib/actions/commit-edits.ts` → `lib/actions/submission-criteria.ts`)
 * over the 9 Palantir constraint classes from action/mutations.md §ACTION.MU-14..17. Each
 * class is one SubmissionCriterion identity. This file declares the type and seeds the 9
 * classes — the snapshot OWNS the seed (it is the authority), so it does NOT import the
 * actions tree uphill. The paired registration test cross-checks these 9 criterionNames
 * against the LIVE `SubmissionCriterion` discriminated-union `type` members so the
 * self-model fails loud if pm's commit-gate class set drifts.
 *
 * Count provenance (LIVE-verified): the `SubmissionCriterion` union in
 * `lib/actions/submission-criteria.ts` declares EXACTLY 9 `type` members: Range,
 * ArraySize, StringLength, StringRegexMatch, OneOf, ObjectQueryResult,
 * ObjectPropertyValue, GroupMember, Unevaluable. Each instance carries identity
 * (`criterionName` = the class name, the PK) plus stored facts: `criterionClass` (LOGIC
 * vs SECURITY-gate dual modeling — all are LOGIC computational checks consumed by the
 * SECURITY commit gate), `blocking` (whether a failed class denies the commit), and
 * `appliesToTier` (Tier-2 function-backed commits run the gate; Tier-1 declarative do not).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-3 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology SubmissionCriterion ObjectType. */
export const SUBMISSION_CRITERION_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/submission-criterion",
);

/**
 * SubmissionCriterion modeled as a Palantir ObjectType. `criterionName` is the stable
 * primary key (the constraint-class name); `criterionClass`, `blocking`, and
 * `appliesToTier` are stored facts carried on each registered INSTANCE below. The
 * PascalCase apiName mirrors the generated symbol.
 */
export const SUBMISSION_CRITERION_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: SUBMISSION_CRITERION_OBJECT_TYPE_RID,
  apiName: "SubmissionCriterion",
  name: "SubmissionCriterion",
  description:
    "palantir-mini commit-gate submission criteria modeled as an ObjectType: one " +
    "instance per Palantir constraint class in the 9-class commit_edits pre-flight gate " +
    "(action/mutations.md §ACTION.MU-14..17). criterionName identity plus criterionClass " +
    "(LOGIC compute / SECURITY gate), blocking, and appliesToTier; the evaluator logic " +
    "lives in lib/actions/submission-criteria.ts, not here.",
  primaryKeyProperty: "criterionName",
  titleProperty: "criterionName",
  properties: [
    { name: "criterionName", type: "string" },
    { name: "criterionClass", type: '"LOGIC" | "SECURITY"' },
    { name: "blocking", type: "boolean" },
    { name: "appliesToTier", type: '"tier-1" | "tier-2"' },
  ],
};

/**
 * A registered SubmissionCriterion instance — stable class identity (the constraint-class
 * name) plus the three stored facts read off the commit-gate semantics.
 */
export interface SubmissionCriterionInstance {
  readonly criterionName: string;
  readonly criterionClass: "LOGIC" | "SECURITY";
  readonly blocking: boolean;
  readonly appliesToTier: "tier-1" | "tier-2";
}

/**
 * The 9 SubmissionCriterion instances — pm's LIVE commit-gate constraint classes, in
 * `SubmissionCriterion` union declaration order. Snapshot-owned seed (no actions-tree
 * import); the registration test cross-checks this set against the live union `type`
 * members and fails on any drift. All 9 run inside the Tier-2 function-backed commit gate;
 * `Unevaluable` is the explicit deny-class (always blocking when present).
 */
export const SUBMISSION_CRITERION_INSTANCES: readonly SubmissionCriterionInstance[] = [
  { criterionName: "Range", criterionClass: "LOGIC", blocking: true, appliesToTier: "tier-2" },
  { criterionName: "ArraySize", criterionClass: "LOGIC", blocking: true, appliesToTier: "tier-2" },
  { criterionName: "StringLength", criterionClass: "LOGIC", blocking: true, appliesToTier: "tier-2" },
  { criterionName: "StringRegexMatch", criterionClass: "LOGIC", blocking: true, appliesToTier: "tier-2" },
  { criterionName: "OneOf", criterionClass: "LOGIC", blocking: true, appliesToTier: "tier-2" },
  { criterionName: "ObjectQueryResult", criterionClass: "SECURITY", blocking: true, appliesToTier: "tier-2" },
  { criterionName: "ObjectPropertyValue", criterionClass: "LOGIC", blocking: true, appliesToTier: "tier-2" },
  { criterionName: "GroupMember", criterionClass: "SECURITY", blocking: true, appliesToTier: "tier-2" },
  { criterionName: "Unevaluable", criterionClass: "SECURITY", blocking: true, appliesToTier: "tier-2" },
];

// Register the SubmissionCriterion ObjectType (the type). The 9 instances above are data
// the self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(SUBMISSION_CRITERION_OBJECT_TYPE);
