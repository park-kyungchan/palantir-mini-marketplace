/**
 * @stable — EdgeBaseDeclaration primitive (prim-logic-01, v1.59.0)
 *
 * Base shape inherited by every cluster's EdgeDeclaration.
 * Declares the branded EdgeRid type + edgeRid factory shared across all 6
 * Phase 2 ImpactGraph edge clusters (structural / governance / routing /
 * lineage / refinement / taxonomy). Every cluster adds its own
 * `kind: <discriminator>` literal-union on top of this base.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.2
 *   -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.2
 *   -> ~/.palantir-mini/harness/sprints/sprint-079/spec.md §3
 *   -> ~/.claude/schemas/ontology/primitives/edge-base-type.ts (this file)
 *   -> ~/ontology/shared-core/index.ts re-export
 *   -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * Cross-ref to impact-edge.ts: this PR does NOT replace ImpactEdgeKind /
 * ImpactEdgeDeclaration. impact-edge.ts stays as-is (PR 2.15 will deprecate
 * or merge later). The new EdgeBaseDeclaration is a parallel surface keyed
 * for the canonical-plan node taxonomy.
 *
 * D/L/A domain: LOGIC (apply SH-01 — "delete this base type, do objects still
 * describe reality?" YES → LOGIC)
 * @owner palantirkc-ontology
 * @purpose EdgeBaseDeclaration base primitive for Phase 2 ImpactGraph edge clusters
 */

export type EdgeRid = string & { readonly __brand: "EdgeRid" };
export const edgeRid = (s: string): EdgeRid => s as EdgeRid;

/**
 * Base shape inherited by every cluster's EdgeDeclaration.
 * Every cluster adds its own `kind: <discriminator>` literal-union.
 */
export interface EdgeBaseDeclaration {
  readonly rid: EdgeRid;
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
