/**
 * @stable — TaxonomyEdgeDeclaration primitive (prim-logic-07, v1.59.0)
 *
 * Cluster: TAXONOMY — classification + lifecycle.
 * `belongsToAipAxis` is the canonical-plan §4 row 2.2 hook for AIP-axis
 * impact queries (proposal §11 Phase 2 acceptance: "`impact_query` for AIP
 * axis returns meaningful edges"). `safeToPruneAfterPromotion` is the cleanup
 * signal for rule 26 §Substrate-routing T0/T1 archive policy.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.2
 *   -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.2
 *   -> ~/.palantir-mini/harness/sprints/sprint-079/spec.md §4.6
 *   -> ~/.claude/schemas/ontology/primitives/taxonomy-edge.ts (this file)
 *   -> ~/ontology/shared-core/index.ts re-export
 *   -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: LOGIC
 * @owner palantirkc-ontology
 * @purpose TaxonomyEdgeDeclaration — 2-kind taxonomy/lifecycle relationship cluster
 */

import type { EdgeRid, EdgeBaseDeclaration } from "./edge-base-type";

export type TaxonomyEdgeRid = EdgeRid;

export type TaxonomyEdgeKind =
  | "belongsToAipAxis"            // node belongs to one of 7 AIP architecture axes  (any node -> AIPArchitectureAxis)
  | "safeToPruneAfterPromotion";  // ephemeral node safe to GC after promotion       (UserPrompt -> ContextCapsule, draft -> committed primitive)

export interface TaxonomyEdgeDeclaration extends EdgeBaseDeclaration {
  readonly kind: TaxonomyEdgeKind;
}
