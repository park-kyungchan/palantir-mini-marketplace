// palantir-mini v3.7.0 — lib/impact-graph/sqlite-cache/walk-helpers.ts
// Transitive BFS walk helpers (forward + backward).
// Extracted from sqlite-cache.ts during A.2 decomposition.

import type { StoredEdge } from "../types";

/** Minimal source contract — implemented by ImpactGraphSqliteCache. */
export interface WalkSource {
  queryByFromRid(rid: string): StoredEdge[];
  queryByToRid(rid: string):   StoredEdge[];
}

/** Transitive BFS following outbound edges up to maxDepth. */
export function transitiveForward(cache: WalkSource, startRid: string, maxDepth: number = 3): StoredEdge[] {
  const visited = new Set<string>([startRid]);
  const result: StoredEdge[] = [];
  let frontier: string[] = [startRid];
  let depth = 0;

  while (frontier.length > 0 && depth < maxDepth) {
    const nextFrontier: string[] = [];
    for (const rid of frontier) {
      const edges = cache.queryByFromRid(rid);
      for (const e of edges) {
        result.push(e);
        if (!visited.has(e.toRid)) {
          visited.add(e.toRid);
          nextFrontier.push(e.toRid);
        }
      }
    }
    frontier = nextFrontier;
    depth++;
  }
  return result;
}

/** Transitive BFS following inbound edges up to maxDepth. */
export function transitiveBackward(cache: WalkSource, startRid: string, maxDepth: number = 3): StoredEdge[] {
  const visited = new Set<string>([startRid]);
  const result: StoredEdge[] = [];
  let frontier: string[] = [startRid];
  let depth = 0;

  while (frontier.length > 0 && depth < maxDepth) {
    const nextFrontier: string[] = [];
    for (const rid of frontier) {
      const edges = cache.queryByToRid(rid);
      for (const e of edges) {
        result.push(e);
        if (!visited.has(e.fromRid)) {
          visited.add(e.fromRid);
          nextFrontier.push(e.fromRid);
        }
      }
    }
    frontier = nextFrontier;
    depth++;
  }
  return result;
}
