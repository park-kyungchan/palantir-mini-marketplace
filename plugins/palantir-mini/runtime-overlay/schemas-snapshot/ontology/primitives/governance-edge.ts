/**
 * @stable — GovernanceEdgeDeclaration primitive (prim-logic-03, v1.59.0)
 *
 * Cluster: GOVERNANCE — control-plane wiring; what enforces what.
 * PR 2.6 (hooks indexer) + PR 2.7 (rules indexer) populate these edges.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.2
 *   -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.2
 *   -> ~/.palantir-mini/harness/sprints/sprint-079/spec.md §4.2
 *   -> ~/.claude/schemas/ontology/primitives/governance-edge.ts (this file)
 *   -> ~/ontology/shared-core/index.ts re-export
 *   -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: LOGIC
 * @owner palantirkc-ontology
 * @purpose GovernanceEdgeDeclaration — 3-kind governance relationship cluster
 */

import type { EdgeRid, EdgeBaseDeclaration } from "./edge-base-type";

export type GovernanceEdgeRid = EdgeRid;

export type GovernanceEdgeKind =
  | "validates"             // hook/rule validates a node            (Hook -> Rule, Test -> SourceFile)
  | "gates"                 // hook/rule gates a workflow step       (Rule -> WorkflowStep, Hook -> Commit)
  | "requiresApprovalFrom"; // node needs human/agent approval       (DigitalTwinChangeContract -> AgentDefinition or "human")

export interface GovernanceEdgeDeclaration extends EdgeBaseDeclaration {
  readonly kind: GovernanceEdgeKind;
}
