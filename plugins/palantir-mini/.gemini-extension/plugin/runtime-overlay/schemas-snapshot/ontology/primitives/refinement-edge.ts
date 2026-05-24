/**
 * @stable — RefinementEdgeDeclaration primitive (prim-logic-06, v1.59.0)
 *
 * Cluster: REFINEMENT — BackwardProp refinement substrate; captures the
 * "what was learned and how it changed the ontology" loop. Powers rule 26
 * §C-axis refinement queries + agentic memory layer (semantic / procedural)
 * updates.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.2
 *   -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.2
 *   -> ~/.palantir-mini/harness/sprints/sprint-079/spec.md §4.5
 *   -> ~/.claude/schemas/ontology/primitives/refinement-edge.ts (this file)
 *   -> ~/ontology/shared-core/index.ts re-export
 *   -> ~/.claude/plugins/palantir-mini/lib/ontology-graph/ (PR 2.3 consumer)
 *
 * D/L/A domain: LOGIC
 * @owner palantirkc-ontology
 * @purpose RefinementEdgeDeclaration — 4-kind refinement/learning relationship cluster
 */

import type { EdgeRid, EdgeBaseDeclaration } from "./edge-base-type";

export type RefinementEdgeRid = EdgeRid;

export type RefinementEdgeKind =
  | "mitigates"       // refinement target mitigates failure mode  (Learning -> FailureMode, Rule -> FailureMode)
  | "refines"         // node refines another node                  (Learning -> Rule, Skill -> Skill)
  | "supersedes"      // node supersedes a deprecated node          (Rule -> Rule per supersededBy frontmatter, AgentDefinition -> AgentDefinition)
  | "conflictsWith";  // two nodes have semantic conflict           (Rule -> Rule, ObjectType -> ObjectType)

export interface RefinementEdgeDeclaration extends EdgeBaseDeclaration {
  readonly kind: RefinementEdgeKind;
}
