// palantir-mini — tests/lib/capability-registry/cache.test.ts
// Tests for registry cache (getCached / setCached / isExpired / isInvalidatedByMtime)

import { describe, expect, test, afterEach, beforeEach } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  DEFAULT_TTL_MS,
  getCached,
  invalidate,
  isExpired,
  isInvalidatedByMtime,
  setCached,
} from "../../../lib/capability-registry/cache";
import type { CachedRegistry } from "../../../lib/capability-registry/cache";
import type { CapabilityRegistry, CapabilityRegistryStats } from "../../../lib/capability-registry/index";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEmptyRegistry(): CapabilityRegistry {
  return {
    skills: [],
    mcpTools: [],
    mcpToolCapabilities: [],
    agents: [],
    projectActions: [],
    validationPacks: [],
    knownIssues: [],
    ontologyIndexEntries: [],
  };
}

function makeStats(overrides: Partial<CapabilityRegistryStats> = {}): CapabilityRegistryStats {
  return {
    skills: 0,
    mcpTools: 0,
    mcpToolCapabilities: 0,
    mcpToolCapabilityCoverage: {
      declaredToolCount: 0,
      capabilityCount: 0,
      coveredToolNames: [],
      missingToolNames: [],
      fallbackClassifiedToolNames: [],
      extraCapabilityToolNames: [],
    },
    agents: 0,
    projectActions: 0,
    validationPacks: 0,
    knownIssues: 0,
    ontologyIndexEntries: 0,
    totalContracts: 0,
    contentDigest: "abc123",
    loadedAt: new Date().toISOString(),
    fromCache: false,
    ...overrides,
  };
}

function makeCachedRegistry(
  watchedPaths: ReadonlyArray<{ path: string; mtime: number }> = [],
  overrides: Partial<CachedRegistry> = {},
): CachedRegistry {
  return {
    registry: makeEmptyRegistry(),
    stats: makeStats(),
    cachedAt: Date.now(),
    contentDigest: "abc123",
    watchedPaths,
    ...overrides,
  };
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

let tmpProjectRoot: string;

beforeEach(() => {
  tmpProjectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "pm-cache-test-"));
  invalidate(tmpProjectRoot);
});

afterEach(() => {
  invalidate(tmpProjectRoot);
  try { fs.rmSync(tmpProjectRoot, { recursive: true, force: true }); } catch { /* ignore */ }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("registry cache", () => {
  test("getCached returns undefined when no entry exists", () => {
    const result = getCached(tmpProjectRoot);
    expect(result).toBeUndefined();
  });

  test("setCached + getCached round-trips the entry", () => {
    const entry = makeCachedRegistry();
    setCached(tmpProjectRoot, entry);

    const retrieved = getCached(tmpProjectRoot);
    expect(retrieved).toBeDefined();
    expect(retrieved!.contentDigest).toBe(entry.contentDigest);
    expect(retrieved!.cachedAt).toBe(entry.cachedAt);
    expect(retrieved!.registry.skills.length).toBe(0);
    expect(retrieved!.stats.totalContracts).toBe(0);
  });

  test("isExpired returns true after TTL elapses (mock cachedAt in the past)", () => {
    // Simulate a cache entry that was written DEFAULT_TTL_MS + 1000ms ago
    const pastCachedAt = Date.now() - DEFAULT_TTL_MS - 1000;
    const entry = makeCachedRegistry([], { cachedAt: pastCachedAt });
    setCached(tmpProjectRoot, entry);

    const retrieved = getCached(tmpProjectRoot);
    expect(retrieved).toBeDefined();
    expect(isExpired(retrieved!)).toBe(true);
  });

  test("isExpired returns false when entry is fresh (cachedAt = now)", () => {
    const entry = makeCachedRegistry([], { cachedAt: Date.now() });
    setCached(tmpProjectRoot, entry);
    const retrieved = getCached(tmpProjectRoot);
    expect(retrieved).toBeDefined();
    expect(isExpired(retrieved!)).toBe(false);
  });

  test("isInvalidatedByMtime returns false when no watched paths exist (all return mtime=0)", () => {
    // watchedPaths with non-existent paths — statSync throws → mtime treated as 0
    const nonExistentPath = path.join(tmpProjectRoot, "nonexistent-dir-abc123");
    const entry = makeCachedRegistry([{ path: nonExistentPath, mtime: 0 }]);
    setCached(tmpProjectRoot, entry);
    const retrieved = getCached(tmpProjectRoot);
    expect(retrieved).toBeDefined();
    // Both cached mtime and current mtime are 0 → not invalidated
    expect(isInvalidatedByMtime(retrieved!, tmpProjectRoot)).toBe(false);
  });

  test("isInvalidatedByMtime returns true after touching watched directory mtime", () => {
    // Create a real directory to watch
    const watchedDir = path.join(tmpProjectRoot, "agents");
    fs.mkdirSync(watchedDir, { recursive: true });

    // Snapshot mtime slightly in the past (1 second ago)
    const pastMtime = fs.statSync(watchedDir).mtimeMs - 1000;
    const entry = makeCachedRegistry([{ path: watchedDir, mtime: pastMtime }]);
    setCached(tmpProjectRoot, entry);

    // Touch the directory by creating a file inside it
    fs.writeFileSync(path.join(watchedDir, "test-agent.md"), "---\nname: test\n---\n", "utf8");

    // After touching the directory, its mtime should differ from the cached mtime
    const retrieved = getCached(tmpProjectRoot);
    expect(retrieved).toBeDefined();
    // The stored mtime was 1s in the past; actual mtime is now different
    expect(isInvalidatedByMtime(retrieved!, tmpProjectRoot)).toBe(true);
  });
});
