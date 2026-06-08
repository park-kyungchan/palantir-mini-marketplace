/**
 * palantir-mini SELF-ONTOLOGY — FDEOntologyBuildSession as a registered ObjectType
 * (Wave 2 build). pm's FDE Ontology Build session modeled AS ontology: a session runs
 * the 9 level builders, tracks readiness, runs a naming audit, and yields a grade report
 * (the `lib/fde-build/` + `lib/fde-ontology-engineering/` surface). Mirrors the
 * `mcp-tool.objecttype.ts` idiom: ONE `FDEOntologyBuildSession` ObjectType (the type) is
 * the deliverable here.
 *
 * Count provenance: this is a count-0 (runtime-seeded) ObjectType — concrete sessions are
 * created per build (pm-fde-session-preview / -grade), not hard-coded into the self-model
 * seed. The TYPE registration is the deliverable; `FDE_ONTOLOGY_BUILD_SESSION_INSTANCES`
 * is an empty seed and the paired registration test asserts the type resolves from the
 * registry (no filesystem drift guard — there is no live instance source to cross-check).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (FDEOntologyBuildSession, runtime-seeded)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology FDEOntologyBuildSession ObjectType. */
export const FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/fde-ontology-build-session",
);

/**
 * FDEOntologyBuildSession modeled as a Palantir ObjectType. `sessionId` is the stable
 * primary key; the stored-fact surface is the build state — `levelBuilders` (the 9
 * builders), `readiness`, `namingAudit`, and `gradeReport`. Concrete sessions are
 * runtime-seeded (created per build), so the registered INSTANCES below are empty.
 */
export const FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE_RID,
  apiName: "FDEOntologyBuildSession",
  name: "FDEOntologyBuildSession",
  description:
    "palantir-mini FDE Ontology Build session modeled as an ObjectType: levelBuilders " +
    "(the 9 builders) + readiness + namingAudit + gradeReport (the lib/fde-build/ + " +
    "lib/fde-ontology-engineering/ surface). Count-0 runtime-seeded — sessions are " +
    "created per build (pm-fde-session-preview/-grade), not hard-coded; the type " +
    "registration is the deliverable.",
  primaryKeyProperty: "sessionId",
  titleProperty: "sessionId",
  properties: [
    { name: "sessionId", type: "string" },
    { name: "levelBuilders", type: "string" },
    { name: "readiness", type: "string" },
    { name: "namingAudit", type: "string" },
    { name: "gradeReport", type: "string" },
  ],
};

/** A registered FDEOntologyBuildSession instance — identity plus the build stored facts. */
export interface FdeOntologyBuildSessionInstance {
  readonly sessionId: string;
  readonly levelBuilders: string;
  readonly readiness: string;
  readonly namingAudit: string;
  readonly gradeReport: string;
}

/**
 * FDEOntologyBuildSession instances — empty: this ObjectType is runtime-seeded (sessions
 * created per build), so the self-model seed carries no hard-coded instances. The paired
 * registration test asserts the TYPE resolves from the registry.
 */
export const FDE_ONTOLOGY_BUILD_SESSION_INSTANCES: readonly FdeOntologyBuildSessionInstance[] =
  [];

// Register the FDEOntologyBuildSession ObjectType (the type). Instances are runtime-
// seeded; the type registration is the deliverable the paired registration test verifies.
OBJECT_TYPE_REGISTRY.register(FDE_ONTOLOGY_BUILD_SESSION_OBJECT_TYPE);
