/**
 * palantir-mini SELF-ONTOLOGY — ProjectOntologyIndex as a registered ObjectType
 * (Wave 2 ObjectType build, harness redesign self-model). Mirrors the
 * `mcp-tool.objecttype.ts` / `agent.objecttype.ts` idiom: ONE
 * `ProjectOntologyIndex` ObjectType (the type) modeling pm's per-project
 * capability + surface index.
 *
 * pm's per-project ontology surface modeled AS ontology: each project root pm is
 * initialized for (`lib/project-scope/` + `lib/ontology-entry/`) carries an index of
 * its ontology axes, surface mutation boundaries, and defaults. This file declares the
 * type so the self-model gains the ProjectOntologyIndex noun.
 *
 * Count provenance (catalog §2): count 0 — a real surface whose instances are
 * RUNTIME-SEEDED per project root at init time, not hard-coded in the snapshot. The
 * deliverable here is the TYPE registration; instances stay empty until a runtime source
 * seeds them. The paired test is a registration-resolves check (no filesystem drift
 * guard, since there is no static seed to cross-check).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology ProjectOntologyIndex ObjectType. */
export const PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/project-ontology-index",
);

/**
 * ProjectOntologyIndex modeled as a Palantir ObjectType. `projectRoot` is the stable
 * primary key (the absolute project root path); the remaining properties capture the
 * per-project ontology axes, the surface mutation boundaries pm enforces, and the
 * project defaults. Instances are runtime-seeded per init, so the registered
 * INSTANCES set below is empty (count-0 runtime-seeded).
 */
export const PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE_RID,
  apiName: "ProjectOntologyIndex",
  name: "ProjectOntologyIndex",
  description:
    "palantir-mini per-project capability + surface index modeled as an ObjectType: " +
    "one instance per initialized project root (lib/project-scope + lib/ontology-entry). " +
    "projectRoot identity plus ontologyAxes, surfaceMutationBoundaries, and defaults. " +
    "Instances are runtime-seeded per project init, not carried in the snapshot seed.",
  primaryKeyProperty: "projectRoot",
  titleProperty: "projectRoot",
  properties: [
    { name: "projectRoot", type: "string" },
    { name: "ontologyAxes", type: "string", optional: true },
    { name: "surfaceMutationBoundaries", type: "string", optional: true },
    { name: "defaults", type: "string", optional: true },
  ],
};

/**
 * A registered ProjectOntologyIndex instance — stable project identity (the absolute
 * project root) plus the per-project index facts.
 */
export interface ProjectOntologyIndexInstance {
  readonly projectRoot: string;
  readonly ontologyAxes?: string;
  readonly surfaceMutationBoundaries?: string;
  readonly defaults?: string;
}

/**
 * ProjectOntologyIndex instances — EMPTY (count-0 runtime-seeded). Instances are
 * generated per project root at init time from the live runtime source, not hard-coded
 * here; the TYPE registration is the deliverable.
 */
export const PROJECT_ONTOLOGY_INDEX_INSTANCES: readonly ProjectOntologyIndexInstance[] =
  [];

// Register the ProjectOntologyIndex ObjectType (the type). Instances are runtime-seeded
// per project init; the registration above is the Wave-2 deliverable.
OBJECT_TYPE_REGISTRY.register(PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE);
