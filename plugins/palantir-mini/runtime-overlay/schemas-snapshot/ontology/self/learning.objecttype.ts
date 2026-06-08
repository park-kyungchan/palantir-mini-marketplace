/**
 * palantir-mini SELF-ONTOLOGY — Learning as a registered ObjectType (Wave 2 build).
 * pm's cross-session LEARN store modeled AS ontology: a Learning records a decision with
 * typed evidence refs, the agentic memory layer it maps to, and what it refines (the
 * `lib/` pm-learn-query surface). Mirrors the `mcp-tool.objecttype.ts` idiom: ONE
 * `Learning` ObjectType (the type) is the deliverable here.
 *
 * Count provenance: this is a count-0 (runtime-seeded) ObjectType — concrete learnings
 * are captured per session (pm-learn), not hard-coded into the self-model seed. The TYPE
 * registration is the deliverable; `LEARNING_INSTANCES` is an empty seed and the paired
 * registration test asserts the type resolves from the registry (no filesystem drift
 * guard — there is no live instance source to cross-check).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (Learning, runtime-seeded)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology Learning ObjectType. */
export const LEARNING_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/learning",
);

/**
 * Learning modeled as a Palantir ObjectType. `learningId` is the stable primary key; the
 * stored-fact surface is the LEARN record — `decision`, `evidenceRefs`, `memoryLayer`
 * (working/episodic/semantic/procedural), and `refines`. Concrete learnings are
 * runtime-seeded (captured per session), so the registered INSTANCES below are empty.
 */
export const LEARNING_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: LEARNING_OBJECT_TYPE_RID,
  apiName: "Learning",
  name: "Learning",
  description:
    "palantir-mini cross-session LEARN record modeled as an ObjectType: decision + " +
    "evidenceRefs (typed refs) + memoryLayer (working/episodic/semantic/procedural) + " +
    "refines (the lib/ pm-learn-query surface). Count-0 runtime-seeded — learnings are " +
    "captured per session (pm-learn), not hard-coded; the type registration is the deliverable.",
  primaryKeyProperty: "learningId",
  titleProperty: "learningId",
  properties: [
    { name: "learningId", type: "string" },
    { name: "decision", type: "string" },
    { name: "evidenceRefs", type: "string" },
    { name: "memoryLayer", type: "string" },
    { name: "refines", type: "string" },
  ],
};

/** A registered Learning instance — stable identity plus the LEARN stored facts. */
export interface LearningInstance {
  readonly learningId: string;
  readonly decision: string;
  readonly evidenceRefs: string;
  readonly memoryLayer: string;
  readonly refines: string;
}

/**
 * Learning instances — empty: this ObjectType is runtime-seeded (learnings captured per
 * session), so the self-model seed carries no hard-coded instances. The paired
 * registration test asserts the TYPE resolves from the registry.
 */
export const LEARNING_INSTANCES: readonly LearningInstance[] = [];

// Register the Learning ObjectType (the type). Instances are runtime-seeded; the type
// registration is the deliverable the paired registration test verifies.
OBJECT_TYPE_REGISTRY.register(LEARNING_OBJECT_TYPE);
