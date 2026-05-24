/**
 * palantir-mini v1.4 — Impact Graph Registry Loader (lazy + cached)
 * @owner palantirkc-plugin-learn
 * @purpose palantir-mini v1.4 — Impact Graph Registry Loader (lazy + cached)
 */
// palantir-mini v1.4 — Impact Graph Registry Loader (lazy + cached)
// Domain: LEARN (ImpactEdge prim-learn-12 — Context Engineering materialization)
//
// Lazy-loads the SQLite-backed cache on first query. Exposes the same
// forward/backward/transitive API used by impact_query and pre_edit_impact
// handlers, but backed by SQLite rather than the empty in-memory registry.
//
// Authority chain: plans/phase-a4-meta-improvements.md §Layer 4
//                  lib/impact-graph/sqlite-cache.ts

import * as path from "path";
import * as fs   from "fs";
import { ImpactGraphSqliteCache } from "./sqlite-cache.deprecated";
import type { StoredEdge } from "./types";

export interface RegistryQueryResult {
  forward:  StoredEdge[];
  backward: StoredEdge[];
}

export interface TransitiveResult {
  root:  string;
  nodes: Array<{ rid: string; depth: number }>;
  edges: StoredEdge[];
}

/**
 * Per-project lazy cache.
 * Key = absolute dbPath.
 */
const openCaches = new Map<string, ImpactGraphSqliteCache>();

function resolveDbPath(projectRoot: string): string {
  return path.join(projectRoot, ".palantir-mini", "impact-graph.db");
}

/**
 * Get (or open) the SQLite cache for a project.
 * Returns null when the db file does not exist yet (uninitialized project).
 */
export function getCacheForProject(projectRoot: string): ImpactGraphSqliteCache | null {
  const dbPath = resolveDbPath(projectRoot);
  if (!fs.existsSync(dbPath)) return null;

  const cached = openCaches.get(dbPath);
  if (cached) return cached;

  const cache = new ImpactGraphSqliteCache(dbPath);
  openCaches.set(dbPath, cache);
  return cache;
}

/**
 * Evict an open cache handle (called after a full re-population so the
 * next query re-opens with fresh prepared statements).
 */
export function evictCache(projectRoot: string): void {
  const dbPath = resolveDbPath(projectRoot);
  const cache  = openCaches.get(dbPath);
  if (cache) {
    try { cache.close(); } catch { /* ignore */ }
    openCaches.delete(dbPath);
  }
}

/** Direct forward + backward edges (depth=1) for a given RID. */
export function queryDirect(projectRoot: string, rid: string): RegistryQueryResult {
  const cache = getCacheForProject(projectRoot);
  if (!cache) return { forward: [], backward: [] };
  return {
    forward:  cache.queryByFromRid(rid),
    backward: cache.queryByToRid(rid),
  };
}

/** Transitive forward walk for a given RID up to maxDepth. */
export function walkForward(
  projectRoot: string,
  rid:         string,
  maxDepth:    number = 3,
): TransitiveResult {
  const cache = getCacheForProject(projectRoot);
  if (!cache) return { root: rid, nodes: [{ rid, depth: 0 }], edges: [] };

  const edges = cache.walkTransitiveForward(rid, maxDepth);

  // Reconstruct node list with depth
  const depthMap = new Map<string, number>([[rid, 0]]);
  for (const e of edges) {
    const fromDepth = depthMap.get(e.fromRid) ?? 0;
    if (!depthMap.has(e.toRid)) {
      depthMap.set(e.toRid, fromDepth + 1);
    }
  }

  const nodes = [...depthMap.entries()].map(([r, d]) => ({ rid: r, depth: d }));
  return { root: rid, nodes, edges };
}

/** Transitive backward walk for a given RID up to maxDepth. */
export function walkBackward(
  projectRoot: string,
  rid:         string,
  maxDepth:    number = 3,
): TransitiveResult {
  const cache = getCacheForProject(projectRoot);
  if (!cache) return { root: rid, nodes: [{ rid, depth: 0 }], edges: [] };

  const edges = cache.walkTransitiveBackward(rid, maxDepth);

  const depthMap = new Map<string, number>([[rid, 0]]);
  for (const e of edges) {
    const toDepth = depthMap.get(e.toRid) ?? 0;
    if (!depthMap.has(e.fromRid)) {
      depthMap.set(e.fromRid, toDepth + 1);
    }
  }

  const nodes = [...depthMap.entries()].map(([r, d]) => ({ rid: r, depth: d }));
  return { root: rid, nodes, edges };
}

/** Total edge count for a project's cache. 0 when uninitialised. */
export function edgeCount(projectRoot: string): number {
  const cache = getCacheForProject(projectRoot);
  return cache?.count() ?? 0;
}
