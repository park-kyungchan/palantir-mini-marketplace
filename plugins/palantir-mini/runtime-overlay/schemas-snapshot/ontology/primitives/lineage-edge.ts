/**
 * @stable — LineageEdgeDeclaration primitive (prim-logic-05, v1.59.0)
 *
 * Cluster: LINEAGE — BackwardProp substrate; links runtime evidence back to
 * ontology (rule 01 §Propagation). Every events.jsonl row registers ≥1
 * lineage edge.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.2
 *   -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.2
 *   -> ~/.palantir-mini/harness/sprints/sprint-079/spec.md §4.4
 *   -> ~/.claude/schemas/ontology/primitives/lineage-edge.ts (this file)
 *   -> ~/ontology/shared-core/index.ts re-export
 *   -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: LOGIC
 * @owner palantirkc-ontology
 * @purpose LineageEdgeDeclaration — 3-kind lineage/BackwardProp relationship cluster
 */

import type { EdgeRid, EdgeBaseDeclaration } from "./edge-base-type";

export type LineageEdgeRid = EdgeRid;

export type LineageEdgeKind =
  | "correlatesWith"  // event correlates to prompt/sprint/contract    (Event -> PromptEnvelope, Event -> SprintContract)
  | "evaluates"       // grader evaluates artifact                      (Grader -> GeneratedArtifact, EvalRun -> AgentDefinition)
  | "failedBecause";  // event fail caused by upstream failure          (Event -> FailureMode)

export interface LineageEdgeDeclaration extends EdgeBaseDeclaration {
  readonly kind: LineageEdgeKind;
}
