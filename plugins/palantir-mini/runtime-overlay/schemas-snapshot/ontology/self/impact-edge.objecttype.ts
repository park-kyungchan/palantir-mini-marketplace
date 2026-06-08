/**
 * palantir-mini SELF-ONTOLOGY — ImpactEdge as a registered ObjectType
 * (Wave 2 ObjectType build, harness redesign self-model). Mirrors the
 * `mcp-tool.objecttype.ts` / `agent.objecttype.ts` idiom: ONE `ImpactEdge`
 * ObjectType (the type) modeling pm's AST-based downstream-impact graph edges.
 *
 * pm's impact graph modeled AS ontology: each edge in the AST-derived
 * downstream-impact graph (`lib/impact-graph/` + `lib/impact-query/`) connects a source
 * RID to a target RID with an AST edge kind and a transitive depth. This file declares
 * the type so the self-model gains the ImpactEdge noun.
 *
 * Count provenance (catalog §2): count 0 — a real surface whose instances are
 * RUNTIME-SEEDED per impact query/graph build, not hard-coded in the snapshot. The
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

/** Stable RID for the self-Ontology ImpactEdge ObjectType. */
export const IMPACT_EDGE_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/impact-edge",
);

/**
 * ImpactEdge modeled as a Palantir ObjectType. `edgeId` is the stable primary key; the
 * remaining properties carry the source/target RIDs the edge connects, the AST edge kind
 * that produced it, and the transitive depth at which it was discovered. Instances are
 * runtime-seeded per impact query, so the registered INSTANCES set below is empty
 * (count-0 runtime-seeded).
 */
export const IMPACT_EDGE_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: IMPACT_EDGE_OBJECT_TYPE_RID,
  apiName: "ImpactEdge",
  name: "ImpactEdge",
  description:
    "palantir-mini AST-based downstream-impact graph edge modeled as an ObjectType: " +
    "one instance per discovered edge (lib/impact-graph + lib/impact-query). edgeId " +
    "identity plus fromRid, toRid, astEdgeKind, and transitiveDepth. Instances are " +
    "runtime-seeded per impact query/graph build, not carried in the snapshot seed.",
  primaryKeyProperty: "edgeId",
  titleProperty: "edgeId",
  properties: [
    { name: "edgeId", type: "string" },
    { name: "fromRid", type: "string", optional: true },
    { name: "toRid", type: "string", optional: true },
    { name: "astEdgeKind", type: "string", optional: true },
    { name: "transitiveDepth", type: "number", optional: true },
  ],
};

/**
 * A registered ImpactEdge instance — stable edge identity plus the source/target RIDs,
 * the AST edge kind, and the transitive depth.
 */
export interface ImpactEdgeInstance {
  readonly edgeId: string;
  readonly fromRid?: string;
  readonly toRid?: string;
  readonly astEdgeKind?: string;
  readonly transitiveDepth?: number;
}

/**
 * ImpactEdge instances — EMPTY (count-0 runtime-seeded). Instances are generated per
 * impact query/graph build from the live runtime source, not hard-coded here; the TYPE
 * registration is the deliverable.
 */
export const IMPACT_EDGE_INSTANCES: readonly ImpactEdgeInstance[] = [];

// Register the ImpactEdge ObjectType (the type). Instances are runtime-seeded per impact
// query; the registration above is the Wave-2 deliverable.
OBJECT_TYPE_REGISTRY.register(IMPACT_EDGE_OBJECT_TYPE);
