/**
 * @stable — WorkflowLineageGraph primitive (prim-data-24, v1.40.0)
 *
 * Typed graph snapshot for Palantir's Workflow Lineage application
 * (formerly Workflow Builder). Captures node/edge structure across
 * data-source, transform, action, and agent surfaces — the substrate
 * Workflow Lineage renders to "view all usages downstream including
 * dependent actions and Workshop applications" (Palantir docs §A).
 *
 * D/L/A domain: DATA (the graph is a stored fact: nodes + edges captured
 * at a point in time). Pairs with SourceExecutor (prim-action-08) which
 * supplies the typed handle for executor nodes.
 *
 * Authority chain:
 *   research/palantir-foundry/aip/
 *     workflow-lineage-and-aip-observability-2026-03-03.md
 *     ↓
 *   schemas/ontology/primitives/source-executor.ts (sibling)
 *     ↓
 *   schemas/ontology/primitives/workflow-lineage-graph.ts (this file)
 *     ↓
 *   shared-core re-export
 *
 * Rule cross-refs: rule 10 v2.1.0 §The 5 dimensions (lineage events feed
 * graph reconstruction).
 *
 * @owner palantirkc-ontology
 * @purpose Typed Workflow Lineage graph snapshot (nodes + edges + trace window)
 */

export type WorkflowLineageGraphRid = string & {
  readonly __brand: "WorkflowLineageGraphRid";
};

export const workflowLineageGraphRid = (s: string): WorkflowLineageGraphRid =>
  s as WorkflowLineageGraphRid;

/**
 * Node kinds visible in Workflow Lineage:
 *   data-source — Pipeline Builder dataset / raw input.
 *   transform   — Foundry transform (Python / TS).
 *   action      — Tier-1 or Tier-2 action invocation.
 *   agent       — AIP Agent or AI FDE invocation.
 */
export type WorkflowLineageNodeKind =
  | "data-source"
  | "transform"
  | "action"
  | "agent";

export interface WorkflowLineageNode {
  readonly nodeId: string;
  readonly kind: WorkflowLineageNodeKind;
  /**
   * When the node represents an executor (transform / action / agent),
   * this is the SourceExecutor.executorRid so consumers can look up the
   * full typed declaration. Optional for data-source nodes which are not
   * executors.
   */
  readonly sourceExecutorRid?: string;
  /** ISO timestamp the node was captured into the graph snapshot. */
  readonly capturedAt: string;
}

/**
 * Edge kinds — Palantir docs verbatim "outputs / inputs / triggers /
 * Workshop widget/variable provenance". We collapse these to 4 canonical
 * directional kinds:
 *   feeds    — data flows from `from` to `to` (dataset → transform).
 *   triggers — `from` execution causes `to` to fire (event-driven).
 *   produces — `from` execution writes `to` (action → object instance).
 *   calls    — `from` invokes `to` synchronously (agent → tool).
 */
export type WorkflowLineageEdgeKind = "feeds" | "triggers" | "produces" | "calls";

export interface WorkflowLineageEdge {
  readonly from: string;
  readonly to: string;
  readonly edgeKind: WorkflowLineageEdgeKind;
}

export interface WorkflowLineageGraph {
  readonly graphId: WorkflowLineageGraphRid;
  /**
   * Trace window (days) — graph reflects executions and dependencies seen
   * within the last `traceWindowDays`. Mirrors AIP observability 7-day
   * default; longer windows are valid but increase render cost.
   */
  readonly traceWindowDays: number;
  readonly nodes: ReadonlyArray<WorkflowLineageNode>;
  readonly edges: ReadonlyArray<WorkflowLineageEdge>;
}

export const WORKFLOW_LINEAGE_NODE_KINDS: readonly WorkflowLineageNodeKind[] = [
  "data-source",
  "transform",
  "action",
  "agent",
] as const;

export const WORKFLOW_LINEAGE_EDGE_KINDS: readonly WorkflowLineageEdgeKind[] = [
  "feeds",
  "triggers",
  "produces",
  "calls",
] as const;

export function isWorkflowLineageNodeKind(s: string): s is WorkflowLineageNodeKind {
  return (WORKFLOW_LINEAGE_NODE_KINDS as readonly string[]).includes(s);
}

export function isWorkflowLineageEdgeKind(s: string): s is WorkflowLineageEdgeKind {
  return (WORKFLOW_LINEAGE_EDGE_KINDS as readonly string[]).includes(s);
}

export function isWorkflowLineageNode(x: unknown): x is WorkflowLineageNode {
  if (typeof x !== "object" || x === null) return false;
  const n = x as WorkflowLineageNode;
  return (
    typeof n.nodeId === "string" &&
    n.nodeId.length > 0 &&
    typeof n.kind === "string" &&
    isWorkflowLineageNodeKind(n.kind) &&
    (n.sourceExecutorRid === undefined || typeof n.sourceExecutorRid === "string") &&
    typeof n.capturedAt === "string" &&
    n.capturedAt.length > 0
  );
}

export function isWorkflowLineageEdge(x: unknown): x is WorkflowLineageEdge {
  if (typeof x !== "object" || x === null) return false;
  const e = x as WorkflowLineageEdge;
  return (
    typeof e.from === "string" &&
    e.from.length > 0 &&
    typeof e.to === "string" &&
    e.to.length > 0 &&
    typeof e.edgeKind === "string" &&
    isWorkflowLineageEdgeKind(e.edgeKind)
  );
}

export function isWorkflowLineageGraph(x: unknown): x is WorkflowLineageGraph {
  if (typeof x !== "object" || x === null) return false;
  const g = x as WorkflowLineageGraph;
  return (
    typeof g.graphId === "string" &&
    g.graphId.length > 0 &&
    typeof g.traceWindowDays === "number" &&
    Number.isFinite(g.traceWindowDays) &&
    g.traceWindowDays >= 0 &&
    Array.isArray(g.nodes) &&
    g.nodes.every(isWorkflowLineageNode) &&
    Array.isArray(g.edges) &&
    g.edges.every(isWorkflowLineageEdge)
  );
}

export class WorkflowLineageGraphRegistry {
  private readonly graphs = new Map<WorkflowLineageGraphRid, WorkflowLineageGraph>();

  register(decl: WorkflowLineageGraph): void {
    this.graphs.set(decl.graphId, decl);
  }

  get(rid: WorkflowLineageGraphRid): WorkflowLineageGraph | undefined {
    return this.graphs.get(rid);
  }

  list(): WorkflowLineageGraph[] {
    return [...this.graphs.values()];
  }
}

export const WORKFLOW_LINEAGE_GRAPH_REGISTRY = new WorkflowLineageGraphRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "equivalent",
  foundryType: "WorkflowLineageGraph",
};
export { categoryFoundryEquivalent as workflowLineageGraphFoundryEquivalent };
