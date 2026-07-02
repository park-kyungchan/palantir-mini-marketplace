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
 * Count provenance (catalog §2): instances are RUNTIME-SEEDED per project root at init
 * time, but ONE — the palantir-mini plugin itself, the project this self-model lives in —
 * is stable enough to seed here as BackwardProp evidence (pm IS a project ontology index).
 * The deliverable is the TYPE registration plus the 1 seeded instance; the paired test
 * asserts the type resolves AND the seed resolves + counts + carries no duplicate ids.
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
 * ProjectOntologyIndex instances — the 1 self-directed index: the palantir-mini plugin
 * itself (the project this self-model lives in), seeded as BackwardProp evidence (further
 * indexes stay runtime-seeded per project init). Carries the absolute `projectRoot` PK plus
 * the ontology axes, the surface mutation boundaries pm enforces, and the project defaults.
 * The paired test asserts it resolves + counts.
 */
export const PROJECT_ONTOLOGY_INDEX_INSTANCES: readonly ProjectOntologyIndexInstance[] =
  [
    {
      projectRoot: "~/palantir-mini-marketplace/plugins/palantir-mini",
      ontologyAxes:
        "self-ontology (ObjectType/LinkType/ActionType/Function) + rules overlay + " +
        "events.jsonl lineage substrate",
      surfaceMutationBoundaries:
        "agent file-ownership table (rule 07) + pre-mutation governance gate; " +
        "src/generated/** is pm-codegen-only",
      defaults: "TypeScript + Bun; ontology-first propagation; append-only events.jsonl",
    },
  ];

// Register the ProjectOntologyIndex ObjectType (the type). The 1 instance above is data
// the self-model exposes + the registration test counts; further indexes are runtime-seeded.
OBJECT_TYPE_REGISTRY.register(PROJECT_ONTOLOGY_INDEX_OBJECT_TYPE);
