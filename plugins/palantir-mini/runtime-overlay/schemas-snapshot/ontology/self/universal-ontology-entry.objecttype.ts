/**
 * palantir-mini SELF-ONTOLOGY — UniversalOntologyEntry as a registered ObjectType
 * (Wave 2, harness redesign self-model build). Mirrors the `mcp-tool.objecttype.ts`
 * idiom: ONE `UniversalOntologyEntry` ObjectType (the type) registered into
 * OBJECT_TYPE_REGISTRY at module load.
 *
 * pm's cross-runtime ontology registry surface modeled AS ontology: each captured
 * request becomes a UniversalOntologyEntry that moves through a lifecycle
 * (captured → context-retrieved → … → routed). The live source is
 * `lib/ontology-entry/` — its `UniversalOntologyEntry` interface is the provenance.
 *
 * Count provenance (catalog §2): instanceCount = 0 — a real surface whose instances
 * are RUNTIME-SEEDED per-run (one entry per cross-runtime request), not hard-coded
 * into the self-model. The TYPE registration is the deliverable;
 * `UNIVERSAL_ONTOLOGY_ENTRY_INSTANCES` is the empty seed and the paired test is a
 * registration-resolves check (no filesystem drift guard — no static seed to diff).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology UniversalOntologyEntry ObjectType. */
export const UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/universal-ontology-entry",
);

/**
 * UniversalOntologyEntry modeled as a Palantir ObjectType. `entryId` is the stable
 * primary key; the descriptor properties mirror the cross-runtime registry record
 * (entryRef, currentPath, lifecycleStatus).
 */
export const UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE_RID,
  apiName: "UniversalOntologyEntry",
  name: "UniversalOntologyEntry",
  description:
    "palantir-mini cross-runtime ontology registry entry modeled as an ObjectType: " +
    "one record per captured request, moving through a lifecycle from captured to " +
    "routed. Identity (entryId) plus registry facts (entryRef, currentPath, " +
    "lifecycleStatus); instances are runtime-seeded per request (lib/ontology-entry/), " +
    "not hard-coded in this self-model.",
  primaryKeyProperty: "entryId",
  titleProperty: "entryId",
  properties: [
    { name: "entryId", type: "string" },
    { name: "entryRef", type: "string", optional: true },
    { name: "currentPath", type: "string", optional: true },
    { name: "lifecycleStatus", type: "string", optional: true },
  ],
};

/**
 * A registered UniversalOntologyEntry instance — the cross-runtime registry record
 * (entryId identity plus the lifecycle facts). Instances are runtime-seeded per request.
 */
export interface UniversalOntologyEntryInstance {
  readonly entryId: string;
  readonly entryRef?: string;
  readonly currentPath?: string;
  readonly lifecycleStatus?: string;
}

/**
 * The UniversalOntologyEntry instances — EMPTY by design (catalog §2 count = 0).
 * Entries are created at runtime (one per cross-runtime request) by the ontology-entry
 * surface, so the self-model registers the TYPE and leaves the seed empty; the paired
 * test is a registration-resolves check, not a filesystem drift guard.
 */
export const UNIVERSAL_ONTOLOGY_ENTRY_INSTANCES: readonly UniversalOntologyEntryInstance[] = [];

// Register the UniversalOntologyEntry ObjectType (the type). The instance seed above
// is empty by design — entries are runtime-seeded per request; the type registration
// is the Wave-2 deliverable. This turns OBJECT_TYPE_REGISTRY.register-grep one higher.
OBJECT_TYPE_REGISTRY.register(UNIVERSAL_ONTOLOGY_ENTRY_OBJECT_TYPE);
