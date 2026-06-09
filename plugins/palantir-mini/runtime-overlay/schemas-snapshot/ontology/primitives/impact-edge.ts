/**
 * palantir-mini — ImpactEdge primitive (prim-learn-12)
 *
 * === CONTEXT ENGINEERING SUBSTRATE ===
 *
 * Typed edges in the cross-project impact graph. Every ForwardProp /
 * BackwardProp relationship between files, symbols, primitives, docs,
 * tests, and codegen outputs registers as an ImpactEdge. This is the
 * substrate the `impact_query` MCP handler walks to answer the core
 * Context Engineering question:
 *
 *   "If I edit X, what propagates?"
 *
 * Without this primitive, impact analysis is a grep + intuition exercise.
 * With it, the answer is a deterministic graph walk.
 *
 * Authority chain:
 *   research/palantir/ -> rules/03-forward-backward-propagation.md
 *   -> schemas/ontology/primitives/impact-edge.ts (this file)
 *   -> palantir-mini/lib/impact/graph.ts
 *   -> MCP handler impact_query
 *
 * Branded RID pattern (zero runtime cost):
 *   type ImpactEdgeRid = string & { __brand: "ImpactEdgeRid" };
 *
 * This file is STABLE CONTRACT. Do not change without a migration plan.
  * @owner palantirkc-ontology
 * @purpose ImpactEdge primitive (prim-learn-12)
 */

export type ImpactEdgeRid = string & { readonly __brand: "ImpactEdgeRid" };

export const impactEdgeRid = (s: string): ImpactEdgeRid => s as ImpactEdgeRid;

export type ImpactEdgeKind =
  | "forwardProp"
  | "backwardProp"
  | "codegen"
  | "import"
  | "semantic"
  | "test-covers"
  | "doc-references";

export interface ImpactEdgeDeclaration {
  readonly rid: ImpactEdgeRid;
  /** Source file / symbol / primitive RID */
  readonly fromRid: string;
  /** Target file / symbol / primitive RID */
  readonly toRid: string;
  readonly edgeKind: ImpactEdgeKind;
  /** Confidence in the edge (0..1). 1.0 = statically verified import. */
  readonly confidence: number;
  /** Evidence snippet (grep line, AST ref, etc.) */
  readonly evidence?: string;
  /** ISO timestamp the edge was registered */
  readonly registeredAt: string;
  /** ISO timestamp the edge was last confirmed still valid */
  readonly verifiedAt?: string;
}

export interface ImpactGraphNode {
  readonly rid: string;
  readonly depth: number;
}

export interface ImpactGraph {
  readonly root: string;
  readonly nodes: ReadonlyArray<ImpactGraphNode>;
  readonly edges: ReadonlyArray<ImpactEdgeDeclaration>;
}

export interface EdgeEventEmitter {
  (eventType: "impact_edge_registered", payload: ImpactEdgeDeclaration): void;
}

/**
 * Registry + graph walker. v0 stores edges in plain Maps keyed by source
 * and target RIDs for O(1) forward/backward queries.
 */
export class ImpactEdgeRegistry {
  private readonly byRid = new Map<ImpactEdgeRid, ImpactEdgeDeclaration>();
  private readonly forward = new Map<string, ImpactEdgeDeclaration[]>();
  private readonly backward = new Map<string, ImpactEdgeDeclaration[]>();

  register(edge: ImpactEdgeDeclaration, emit?: EdgeEventEmitter): void {
    this.byRid.set(edge.rid, edge);
    const fwd = this.forward.get(edge.fromRid) ?? [];
    fwd.push(edge);
    this.forward.set(edge.fromRid, fwd);
    const bwd = this.backward.get(edge.toRid) ?? [];
    bwd.push(edge);
    this.backward.set(edge.toRid, bwd);
    emit?.("impact_edge_registered", edge);
  }

  get(rid: ImpactEdgeRid): ImpactEdgeDeclaration | undefined {
    return this.byRid.get(rid);
  }

  list(): ImpactEdgeDeclaration[] {
    return [...this.byRid.values()];
  }

  /** Outbound edges from a source RID (what does X propagate to?). */
  queryForward(fromRid: string): ReadonlyArray<ImpactEdgeDeclaration> {
    return this.forward.get(fromRid) ?? [];
  }

  /** Inbound edges to a target RID (what propagates into X?). */
  queryBackward(toRid: string): ReadonlyArray<ImpactEdgeDeclaration> {
    return this.backward.get(toRid) ?? [];
  }

  /**
   * Transitive walk from `fromRid` up to `maxDepth`. Returns the full
   * reachable subgraph as nodes + edges. Cycles are broken by a visited
   * set keyed by RID.
   */
  walkTransitive(fromRid: string, maxDepth: number): ImpactGraph {
    const visited = new Set<string>([fromRid]);
    const nodes: ImpactGraphNode[] = [{ rid: fromRid, depth: 0 }];
    const edges: ImpactEdgeDeclaration[] = [];
    const frontier: Array<{ rid: string; depth: number }> = [
      { rid: fromRid, depth: 0 },
    ];
    while (frontier.length > 0) {
      const next = frontier.shift();
      if (!next) break;
      if (next.depth >= maxDepth) continue;
      const outbound = this.forward.get(next.rid) ?? [];
      for (const edge of outbound) {
        edges.push(edge);
        if (!visited.has(edge.toRid)) {
          visited.add(edge.toRid);
          const childDepth = next.depth + 1;
          nodes.push({ rid: edge.toRid, depth: childDepth });
          frontier.push({ rid: edge.toRid, depth: childDepth });
        }
      }
    }
    return { root: fromRid, nodes, edges };
  }
}

export const IMPACT_EDGE_REGISTRY = new ImpactEdgeRegistry();
