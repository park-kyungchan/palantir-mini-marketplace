/**
 * @stable — StructuralEdgeDeclaration primitive (prim-logic-02, v1.59.0)
 *
 * Cluster: STRUCTURAL — file/code/doc structural relationships.
 * Highest-confidence cluster — most edges here are AST-derivable (PR 2.10
 * indexer) or grep-derivable (PR 2.4-2.7).
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.2
 *   -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.2
 *   -> ~/.palantir-mini/harness/sprints/sprint-079/spec.md §4.1
 *   -> ~/.claude/schemas/ontology/primitives/structural-edge.ts (this file)
 *   -> ~/ontology/shared-core/index.ts re-export
 *   -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: LOGIC
 * @owner palantirkc-ontology
 * @purpose StructuralEdgeDeclaration — 6-kind structural relationship cluster
 */

import type { EdgeRid, EdgeBaseDeclaration } from "./edge-base-type";

export type StructuralEdgeRid = EdgeRid;

export type StructuralEdgeKind =
  | "describes"   // doc/research describes a node  (e.g. OfficialResearchDoc -> AIPArchitectureAxis)
  | "implements"  // code implements a contract     (e.g. McpHandler -> McpToolDeclaration)
  | "imports"     // SourceFile imports SourceFile  (AST-derived; PR 2.10 indexer)
  | "reads"       // SourceFile reads SourceFile    (filesystem read at runtime)
  | "writes"      // SourceFile writes SourceFile   (filesystem write at runtime)
  | "emits";      // code emits Event               (events.jsonl producer wiring)

export interface StructuralEdgeDeclaration extends EdgeBaseDeclaration {
  readonly kind: StructuralEdgeKind;
}
