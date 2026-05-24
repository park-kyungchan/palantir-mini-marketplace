// palantir-mini — lib/capability-registry/cache.ts
// In-process LRU-style cache for CapabilityRegistry with TTL + mtime invalidation.
//
// TTL: 5 minutes (DEFAULT_TTL_MS). Override via optional ttlMs param to isExpired().
// Mtime invalidation: re-checks skills/, agents/, bridge/mcp-server.ts, and
//   the MCP capability manifest mtimes against the cached watchedPaths snapshot.
//   Any mtime change evicts the cache entry.
// Content digest: sha256:16 of category-count + mtime signal (change-detection without
//   deep-hashing every contract).
//
// Per-project keying: the cache is a Map<projectRoot, CachedRegistry>. Multiple
// projects within the same process each get their own entry.

import * as fs from "node:fs";
import * as path from "node:path";
import { resolvePalantirMiniRoot } from "../config/root";
import type { CapabilityRegistry, CapabilityRegistryStats } from "./index";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface CachedRegistry {
  readonly registry: CapabilityRegistry;
  readonly stats: CapabilityRegistryStats;
  /** Unix timestamp (Date.now()) when this entry was cached. */
  readonly cachedAt: number;
  /** sha256:16 of the content-change signal at cache time. */
  readonly contentDigest: string;
  /** Paths + mtimes snapshotted when the cache was written. */
  readonly watchedPaths: ReadonlyArray<{ path: string; mtime: number }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default TTL: 5 minutes in milliseconds. */
export const DEFAULT_TTL_MS = 5 * 60 * 1000;

// ─── In-process store ────────────────────────────────────────────────────────

/** Per-project cache map. Keys are absolute projectRoot strings. */
const REGISTRY_CACHE = new Map<string, CachedRegistry>();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Return the cached registry for the given project root, or `undefined` when
 * no entry exists.
 */
export function getCached(projectRoot: string): CachedRegistry | undefined {
  return REGISTRY_CACHE.get(projectRoot);
}

/**
 * Store a CachedRegistry for the given project root.
 * Overwrites any existing entry for the same root.
 */
export function setCached(projectRoot: string, cached: CachedRegistry): void {
  REGISTRY_CACHE.set(projectRoot, cached);
}

/**
 * Evict the cache entry for the given project root (if present).
 * Safe to call when no entry exists.
 */
export function invalidate(projectRoot: string): void {
  REGISTRY_CACHE.delete(projectRoot);
}

/**
 * Returns true when the cached entry has exceeded its TTL.
 *
 * @param cached - The cached entry to check.
 * @param ttlMs  - Optional override for the TTL (default: DEFAULT_TTL_MS = 5 min).
 */
export function isExpired(cached: CachedRegistry, ttlMs = DEFAULT_TTL_MS): boolean {
  return Date.now() - cached.cachedAt > ttlMs;
}

/**
 * Returns true when any of the cached watchedPaths have a different mtime
 * than at the time the cache was written, indicating that skills/, agents/,
 * bridge/mcp-server.ts, or the MCP capability manifest may have changed on disk.
 *
 * `projectRoot` is accepted for API symmetry but is not used in mtime reads
 * (the watchedPaths are absolute paths already stored in the cached entry).
 */
export function isInvalidatedByMtime(
  cached: CachedRegistry,
  _projectRoot: string,
): boolean {
  for (const watched of cached.watchedPaths) {
    let currentMtime = 0;
    try {
      currentMtime = fs.statSync(watched.path).mtimeMs;
    } catch {
      // Path may no longer exist — treat as changed (mtime 0 vs stored)
      currentMtime = 0;
    }
    if (currentMtime !== watched.mtime) return true;
  }
  return false;
}

/**
 * Resolves the plugin root for watched-path construction.
 * Used internally by loadCapabilityRegistry in index.ts; re-exported here for
 * test scenarios that need to construct synthetic CachedRegistry entries.
 */
export function resolvePluginRootForCache(): string {
  return resolvePalantirMiniRoot();
}

/**
 * Construct a WatchedPath snapshot for the standard 3 watched paths.
 * Used by index.ts and test helpers.
 */
export function snapshotWatchedPaths(): ReadonlyArray<{ path: string; mtime: number }> {
  const pluginRoot = resolvePluginRootForCache();
  const targets = [
    path.join(pluginRoot, "skills"),
    path.join(pluginRoot, "agents"),
    path.join(pluginRoot, "bridge", "mcp-server.ts"),
    path.join(pluginRoot, "lib", "capability-registry", "mcp-tool-capability.ts"),
  ];
  return targets.map((p) => {
    try {
      return { path: p, mtime: fs.statSync(p).mtimeMs };
    } catch {
      return { path: p, mtime: 0 };
    }
  });
}
