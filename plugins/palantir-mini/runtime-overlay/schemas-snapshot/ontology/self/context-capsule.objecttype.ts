/**
 * palantir-mini SELF-ONTOLOGY — ContextCapsule as a registered ObjectType (Wave 2 build).
 * pm's context-engineering handoff unit modeled AS ontology: a ContextCapsule is a
 * <=500-token packaged retrieval/handoff unit of a given kind, carrying a token budget
 * and overlay refs (the `lib/context/` + `lib/context-engineering/` surface). Mirrors the
 * `mcp-tool.objecttype.ts` idiom: ONE `ContextCapsule` ObjectType (the type) is the
 * deliverable here.
 *
 * Count provenance: this is a count-0 (runtime-seeded) ObjectType — concrete capsules are
 * packaged per retrieval/handoff at runtime, not hard-coded into the self-model seed. The
 * TYPE registration is the deliverable; `CONTEXT_CAPSULE_INSTANCES` is an empty seed and
 * the paired registration test asserts the type resolves from the registry (no filesystem
 * drift guard — there is no live instance source to cross-check).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (ContextCapsule, runtime-seeded)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology ContextCapsule ObjectType. */
export const CONTEXT_CAPSULE_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/context-capsule",
);

/**
 * ContextCapsule modeled as a Palantir ObjectType. `capsuleId` is the stable primary key;
 * the stored-fact surface is the packaging shape — `capsuleKind`, `tokenBudget`, and
 * `overlayRefs`. Concrete capsules are runtime-seeded (packaged per retrieval/handoff),
 * so the registered INSTANCES below are empty.
 */
export const CONTEXT_CAPSULE_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: CONTEXT_CAPSULE_OBJECT_TYPE_RID,
  apiName: "ContextCapsule",
  name: "ContextCapsule",
  description:
    "palantir-mini context-engineering handoff unit modeled as an ObjectType: a <=500-" +
    "token packaged retrieval/handoff unit — capsuleKind + tokenBudget + overlayRefs " +
    "(the lib/context/ + lib/context-engineering/ surface). Count-0 runtime-seeded — " +
    "capsules are packaged per retrieval/handoff, not hard-coded; the type registration " +
    "is the deliverable.",
  primaryKeyProperty: "capsuleId",
  titleProperty: "capsuleId",
  properties: [
    { name: "capsuleId", type: "string" },
    { name: "capsuleKind", type: "string" },
    { name: "tokenBudget", type: "number" },
    { name: "overlayRefs", type: "string" },
  ],
};

/** A registered ContextCapsule instance — identity plus the packaging stored facts. */
export interface ContextCapsuleInstance {
  readonly capsuleId: string;
  readonly capsuleKind: string;
  readonly tokenBudget: number;
  readonly overlayRefs: string;
}

/**
 * ContextCapsule instances — empty: this ObjectType is runtime-seeded (capsules packaged
 * per retrieval/handoff), so the self-model seed carries no hard-coded instances. The
 * paired registration test asserts the TYPE resolves from the registry.
 */
export const CONTEXT_CAPSULE_INSTANCES: readonly ContextCapsuleInstance[] = [];

// Register the ContextCapsule ObjectType (the type). Instances are runtime-seeded; the
// type registration is the deliverable the paired registration test verifies.
OBJECT_TYPE_REGISTRY.register(CONTEXT_CAPSULE_OBJECT_TYPE);
