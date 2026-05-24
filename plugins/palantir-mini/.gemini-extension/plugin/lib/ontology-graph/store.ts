/**
 * lib/ontology-graph/store.ts — In-memory OntologyGraphStore implementation
 * (PR 2.3 sprint-080).
 *
 * @stable
 *
 * Authority chain:
 *   ~/.claude/schemas/ontology/primitives/project-ontology-index.ts
 *     → ~/ontology/shared-core/index.ts
 *     → lib/ontology-graph/types.ts (NodeRecord, EdgeRecord, TypedGraphSubgraph)
 *     → this file (store factory + interface)
 *     → PR 2.4+ indexers (consumers that populate the store from project fragments)
 *
 * D/L/A domain: LOGIC — passive in-memory data structure.
 *   NO event emission (lineage is indexer concern, PR 2.4+).
 *   NO disk I/O (persistence is ProjectOntologyIndex loader's concern, PR 2.14).
 *   NO Convex (deferred to Sprint X5).
 *
 * Backend: 4 internal Maps (byNodeRid, byEdgeRid, fromAdjacency, toAdjacency).
 * walkTransitive uses BFS with optional edgeKindFilter.
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.1.0 (sprint-080 PR 2.3)
 */

import type {
  NodeRid,
  EdgeRid,
  NodeRecord,
  EdgeRecord,
  TypedGraphSubgraph,
} from "./types";

// ─── OntologyGraphStore interface ────────────────────────────────────────────

/**
 * In-memory typed graph store. Consumers create via `createOntologyGraphStore()`.
 * TNode and TEdge default to `unknown`; specialize with concrete unions once
 * the shared-core snapshot is refreshed to include PR 2.1 + PR 2.2 primitives.
 */
export interface OntologyGraphStore<TNode = unknown, TEdge = unknown> {
  /**
   * Add a node to the store. If a node with the same RID already exists,
   * it is overwritten (idempotent upsert).
   */
  addNode(node: NodeRecord<TNode>): void;

  /**
   * Add an edge to the store. Both fromRid and toRid MUST already exist as
   * nodes — throws if either endpoint is missing.
   */
  addEdge(edge: EdgeRecord<TEdge>): void;

  /** Return the node with the given RID, or undefined if absent. */
  getNode(rid: NodeRid): NodeRecord<TNode> | undefined;

  /**
   * Return all nodes whose `kind` discriminator matches the given string.
   * Linear scan over the node map — sufficient for PR 2.3's substrate size;
   * PR 2.14 may add a reverse kind-index.
   */
  getNodesByKind(kind: string): ReadonlyArray<NodeRecord<TNode>>;

  /** Return the edge with the given RID, or undefined if absent. */
  getEdge(rid: EdgeRid): EdgeRecord<TEdge> | undefined;

  /** Return all edges whose `fromRid` is the given node RID. */
  getEdgesFrom(fromRid: NodeRid): ReadonlyArray<EdgeRecord<TEdge>>;

  /** Return all edges whose `toRid` is the given node RID. */
  getEdgesTo(toRid: NodeRid): ReadonlyArray<EdgeRecord<TEdge>>;

  /**
   * BFS traversal from `fromRid` following outbound edges.
   * - Deduplicates visited nodes.
   * - Stops at `maxDepth` hops from the root.
   * - When `edgeKindFilter` is provided, only traverses edges whose `kind`
   *   is in the filter list (other edges are still included in the subgraph
   *   if their endpoints are otherwise reachable, but are NOT used as
   *   traversal vectors — i.e. the BFS skips filtered-out edge kinds).
   */
  walkTransitive(
    fromRid: NodeRid,
    maxDepth: number,
    edgeKindFilter?: ReadonlyArray<string>,
  ): TypedGraphSubgraph<TNode, TEdge>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

/**
 * Create a new empty OntologyGraphStore, optionally pre-populated from a
 * ProjectOntologyIndex snapshot. This is the only way to construct a store;
 * no class constructor is exposed.
 *
 * @param snapshot — optional initial nodes + edges (e.g. from ProjectOntologyIndex.nodes/edges).
 *   Nodes are loaded before edges so endpoint validation succeeds.
 */
export function createOntologyGraphStore<TNode = unknown, TEdge = unknown>(
  snapshot?: {
    readonly nodes?: ReadonlyArray<NodeRecord<TNode>>;
    readonly edges?: ReadonlyArray<EdgeRecord<TEdge>>;
  },
): OntologyGraphStore<TNode, TEdge> {
  // ── Internal state (4 maps) ───────────────────────────────────────────────

  const byNodeRid = new Map<string, NodeRecord<TNode>>();
  const byEdgeRid = new Map<string, EdgeRecord<TEdge>>();

  /**
   * fromAdjacency: NodeRid string → Set of EdgeRid strings for outbound edges.
   * Populated by addEdge; used by getEdgesFrom + walkTransitive.
   */
  const fromAdjacency = new Map<string, Set<string>>();

  /**
   * toAdjacency: NodeRid string → Set of EdgeRid strings for inbound edges.
   * Populated by addEdge; used by getEdgesTo.
   */
  const toAdjacency = new Map<string, Set<string>>();

  // ── Internal helpers ─────────────────────────────────────────────────────

  function ensureFromSet(rid: string): Set<string> {
    let s = fromAdjacency.get(rid);
    if (s === undefined) {
      s = new Set<string>();
      fromAdjacency.set(rid, s);
    }
    return s;
  }

  function ensureToSet(rid: string): Set<string> {
    let s = toAdjacency.get(rid);
    if (s === undefined) {
      s = new Set<string>();
      toAdjacency.set(rid, s);
    }
    return s;
  }

  // ── Store implementation ─────────────────────────────────────────────────

  const store: OntologyGraphStore<TNode, TEdge> = {
    addNode(node: NodeRecord<TNode>): void {
      byNodeRid.set(node.rid, node);
    },

    addEdge(edge: EdgeRecord<TEdge>): void {
      if (!byNodeRid.has(edge.fromRid)) {
        throw new Error(
          `OntologyGraphStore.addEdge: fromRid "${edge.fromRid}" not found — add the node first`,
        );
      }
      if (!byNodeRid.has(edge.toRid)) {
        throw new Error(
          `OntologyGraphStore.addEdge: toRid "${edge.toRid}" not found — add the node first`,
        );
      }
      byEdgeRid.set(edge.rid, edge);
      ensureFromSet(edge.fromRid).add(edge.rid);
      ensureToSet(edge.toRid).add(edge.rid);
    },

    getNode(rid: NodeRid): NodeRecord<TNode> | undefined {
      return byNodeRid.get(rid);
    },

    getNodesByKind(kind: string): ReadonlyArray<NodeRecord<TNode>> {
      const result: NodeRecord<TNode>[] = [];
      for (const node of byNodeRid.values()) {
        if (node.kind === kind) result.push(node);
      }
      return result;
    },

    getEdge(rid: EdgeRid): EdgeRecord<TEdge> | undefined {
      return byEdgeRid.get(rid);
    },

    getEdgesFrom(fromRid: NodeRid): ReadonlyArray<EdgeRecord<TEdge>> {
      const rids = fromAdjacency.get(fromRid);
      if (rids === undefined) return [];
      const result: EdgeRecord<TEdge>[] = [];
      for (const eid of rids) {
        const edge = byEdgeRid.get(eid);
        if (edge !== undefined) result.push(edge);
      }
      return result;
    },

    getEdgesTo(toRid: NodeRid): ReadonlyArray<EdgeRecord<TEdge>> {
      const rids = toAdjacency.get(toRid);
      if (rids === undefined) return [];
      const result: EdgeRecord<TEdge>[] = [];
      for (const eid of rids) {
        const edge = byEdgeRid.get(eid);
        if (edge !== undefined) result.push(edge);
      }
      return result;
    },

    walkTransitive(
      fromRid: NodeRid,
      maxDepth: number,
      edgeKindFilter?: ReadonlyArray<string>,
    ): TypedGraphSubgraph<TNode, TEdge> {
      const visitedNodeRids = new Set<string>();
      const visitedEdgeRids = new Set<string>();
      const resultNodes: NodeRecord<TNode>[] = [];
      const resultEdges: EdgeRecord<TEdge>[] = [];

      // BFS queue: each entry is { rid, depth }
      const queue: Array<{ rid: string; depth: number }> = [{ rid: fromRid, depth: 0 }];

      const rootNode = byNodeRid.get(fromRid);
      if (rootNode === undefined) {
        return { root: fromRid, nodes: [], edges: [] };
      }

      visitedNodeRids.add(fromRid);
      resultNodes.push(rootNode);

      while (queue.length > 0) {
        const item = queue.shift();
        if (item === undefined) break;
        const { rid, depth } = item;

        if (depth >= maxDepth) continue;

        // Follow outbound edges from this node
        const outboundRids = fromAdjacency.get(rid);
        if (outboundRids === undefined) continue;

        for (const edgeRid of outboundRids) {
          const edge = byEdgeRid.get(edgeRid);
          if (edge === undefined) continue;

          // Apply edgeKindFilter: skip this edge as a traversal vector if filtered out
          const passesFilter =
            edgeKindFilter === undefined || edgeKindFilter.includes(edge.kind);

          // Always collect the edge if the toRid node is reachable (even via filter)
          // BFS only follows the traversal vector when the edge passes the filter
          if (!passesFilter) continue;

          // Record edge (dedup)
          if (!visitedEdgeRids.has(edgeRid)) {
            visitedEdgeRids.add(edgeRid);
            resultEdges.push(edge);
          }

          // Enqueue toRid node if not yet visited
          if (!visitedNodeRids.has(edge.toRid)) {
            visitedNodeRids.add(edge.toRid);
            const toNode = byNodeRid.get(edge.toRid);
            if (toNode !== undefined) {
              resultNodes.push(toNode);
              queue.push({ rid: edge.toRid, depth: depth + 1 });
            }
          }
        }
      }

      return {
        root: fromRid,
        nodes: resultNodes,
        edges: resultEdges,
      };
    },
  };

  // ── Pre-populate from snapshot (nodes first, then edges) ─────────────────

  if (snapshot?.nodes !== undefined) {
    for (const node of snapshot.nodes) {
      store.addNode(node);
    }
  }
  if (snapshot?.edges !== undefined) {
    for (const edge of snapshot.edges) {
      store.addEdge(edge);
    }
  }

  return store;
}
