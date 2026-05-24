// palantir-mini v3.7.0 — lib/semantic-graph/semantic-query/merge-helpers.ts
// Producer-result node + edge merge helpers extracted during A.2 decomposition.

import type { ProducerResult, SemanticNode, SemanticEdge } from "../types";

/** Deduplicates nodes by rid, merging discoveredBy. Last-wins for decl. */
export function mergeNodes(results: ReadonlyArray<ProducerResult>): SemanticNode[] {
  const map = new Map<string, SemanticNode>();
  for (const result of results) {
    for (const node of result.nodes) {
      const key = node.decl.rid as string;
      const existing = map.get(key);
      if (existing) {
        const merged = Array.from(
          new Set([...existing.discoveredBy, ...node.discoveredBy])
        ) as SemanticNode["discoveredBy"][number][];
        map.set(key, { decl: node.decl, discoveredBy: merged });
      } else {
        map.set(key, node);
      }
    }
  }
  return Array.from(map.values());
}

/** Unions edges from all producers without deduplication (per spec). */
export function unionEdges(results: ReadonlyArray<ProducerResult>): SemanticEdge[] {
  const all: SemanticEdge[] = [];
  for (const result of results) {
    for (const edge of result.edges) {
      all.push(edge);
    }
  }
  return all;
}
