/**
 * lib/impact-query/graph-cache.ts — Module-level in-memory cache for the
 * orchestrator-built ontology graph, keyed by `projectRoot` with a 30s TTL.
 *
 * Avoids rebuilding the typed graph across multiple impact_query invocations
 * within a single Lead turn while still expiring fast enough that on-disk
 * changes are picked up.
 *
 * @stable
 *
 * Authority chain:
 *   sprint-092 spec.md §4 (caching policy)
 *     → lib/ontology-graph/build-graph.ts (orchestrator wrapped here)
 *     → bridge/handlers/impact-query.ts (consumer)
 *
 * D/L/A domain: LOGIC — process-local memo; no disk I/O of its own.
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.13.0 (sprint-092 PR 2.15; Sprint X3 PR 5/5)
 */

import {
  buildOntologyGraph,
  type IndexerStats,
  type BuildOntologyGraphOpts,
} from "../ontology-graph/build-graph";
import type { OntologyGraphStore } from "../ontology-graph/store";

/** Cached graph result. */
export interface CachedGraph {
  readonly store: OntologyGraphStore<unknown, unknown>;
  readonly stats: ReadonlyArray<IndexerStats>;
}

interface CacheEntry extends CachedGraph {
  readonly expiresAt: number;
}

const CACHE = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 30_000;

/** Options for `getOrBuildGraph`. */
export interface GetOrBuildGraphOpts {
  /** When true, bypass the cache entirely (always rebuild). */
  readonly noCache?: boolean;
  /** TTL override in ms. Default 30_000. */
  readonly ttlMs?: number;
  /** Forwarded to `buildOntologyGraph`. */
  readonly buildOpts?: BuildOntologyGraphOpts;
}

/**
 * Return a cached graph or build a fresh one. The cache holds at most one
 * entry per `projectRoot`. Expired entries are rebuilt eagerly on access.
 */
export async function getOrBuildGraph(
  projectRoot: string,
  opts?: GetOrBuildGraphOpts,
): Promise<CachedGraph> {
  const noCache = opts?.noCache ?? false;
  const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();

  if (!noCache) {
    const entry = CACHE.get(projectRoot);
    if (entry !== undefined && entry.expiresAt > now) {
      return { store: entry.store, stats: entry.stats };
    }
  }

  const built = await buildOntologyGraph(projectRoot, opts?.buildOpts);
  const result: CachedGraph = { store: built.store, stats: built.stats };

  if (!noCache) {
    CACHE.set(projectRoot, {
      store: result.store,
      stats: result.stats,
      expiresAt: now + ttlMs,
    });
  }

  return result;
}

/**
 * Clear the cache for a specific project or globally.
 *
 * @param projectRoot Optional; when omitted clears all entries.
 */
export function clearGraphCache(projectRoot?: string): void {
  if (projectRoot === undefined) {
    CACHE.clear();
  } else {
    CACHE.delete(projectRoot);
  }
}

/** Test-only: expose cache size for inspection. Not exported for production. */
export function _graphCacheSize(): number {
  return CACHE.size;
}
