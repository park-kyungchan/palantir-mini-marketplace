/**
 * @stable — RoutingEdgeDeclaration primitive (prim-logic-04, v1.59.0)
 *
 * Cluster: ROUTING — dispatch wiring; who routes work to whom.
 * Critical for pm_intent_router + pm_lead_brief graph queries
 * (proposal §8 Stage 1-3).
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.2
 *   -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.2
 *   -> ~/.palantir-mini/harness/sprints/sprint-079/spec.md §4.3
 *   -> ~/.claude/schemas/ontology/primitives/routing-edge.ts (this file)
 *   -> ~/ontology/shared-core/index.ts re-export
 *   -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: LOGIC
 * @owner palantirkc-ontology
 * @purpose RoutingEdgeDeclaration — 4-kind dispatch/routing relationship cluster
 */

import type { EdgeRid, EdgeBaseDeclaration } from "./edge-base-type";

export type RoutingEdgeRid = EdgeRid;

export type RoutingEdgeKind =
  | "routesTo"     // BROWSE/INDEX doc routes a query to a target  (ProjectBrowseDoc -> ProjectAuthorityFile)
  | "usesTool"     // agent/skill uses a tool                      (Skill -> Tool, AgentDefinition -> McpHandler)
  | "delegatesTo"  // Lead delegates work to subagent              (AgentDefinition -> AgentDefinition)
  | "spawnsAgent"; // hook/handler spawns a subagent               (Hook -> AgentDefinition)

export interface RoutingEdgeDeclaration extends EdgeBaseDeclaration {
  readonly kind: RoutingEdgeKind;
}
