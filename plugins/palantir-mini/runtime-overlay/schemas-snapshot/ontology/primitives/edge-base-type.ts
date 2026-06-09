/**
 * @stable — EdgeBaseDeclaration primitive (prim-logic-01, v1.59.0)
 *
 * Single edge primitive for the Phase 2 ImpactGraph. Declares the branded
 * EdgeRid type + edgeRid factory + the `EdgeKind` cluster discriminator
 * (structural / governance / routing / lineage / refinement / taxonomy).
 * The 6 cluster discriminators are carried directly via the required `kind`
 * field — folding what were previously 6 separate cluster-subtype primitive
 * files into this base.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.2
 *   -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.2
 *   -> ~/.palantir-mini/harness/sprints/sprint-079/spec.md §3
 *   -> ~/.claude/schemas/ontology/primitives/edge-base-type.ts (this file)
 *   -> ~/ontology/shared-core/index.ts re-export
 *   -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * Cross-ref to impact-edge.ts: this primitive does NOT replace ImpactEdgeKind /
 * ImpactEdgeDeclaration. impact-edge.ts stays as-is. EdgeBaseDeclaration is a
 * parallel surface keyed for the canonical-plan node taxonomy.
 *
 * D/L/A domain: LOGIC (apply SH-01 — "delete this base type, do objects still
 * describe reality?" YES → LOGIC)
 * @owner palantirkc-ontology
 * @purpose EdgeBaseDeclaration primitive for the Phase 2 ImpactGraph edge surface
 */

export type EdgeRid = string & { readonly __brand: "EdgeRid" };
export const edgeRid = (s: string): EdgeRid => s as EdgeRid;

/**
 * Cluster discriminator for an edge. The 6 clusters that previously each had a
 * dedicated subtype file (structural-edge / governance-edge / routing-edge /
 * lineage-edge / refinement-edge / taxonomy-edge) are folded into this single
 * literal union; the fine-grained per-cluster sub-kinds are not modeled at the
 * schema layer (no typed consumer reads them).
 */
export const EDGE_KINDS = [
  "lineage",
  "governance",
  "refinement",
  "routing",
  "structural",
  "taxonomy",
] as const;

export type EdgeKind = (typeof EDGE_KINDS)[number];

/**
 * Declaration for a single ImpactGraph edge. `kind` selects the cluster.
 */
export interface EdgeBaseDeclaration {
  readonly rid: EdgeRid;
  /** Cluster discriminator — one of the 6 EdgeKind literals. */
  readonly kind: EdgeKind;
  /** Source node RID — any of the 32 PR 2.1 NodeRid types (use `string` here; cluster types narrow it). */
  readonly fromRid: string;
  /** Target node RID — same. */
  readonly toRid: string;
  /** Confidence in the edge (0..1). 1.0 = statically verified (e.g. AST import); lower = LLM-inferred semantic edge. */
  readonly confidence: number;
  /** Evidence snippet (grep line, AST ref, doc citation, etc.) */
  readonly evidence?: string;
  /** ISO timestamp the edge was registered. */
  readonly registeredAt: string;
  /** ISO timestamp the edge was last confirmed still valid (PR 2.4+ indexers refresh this). */
  readonly verifiedAt?: string;
}
