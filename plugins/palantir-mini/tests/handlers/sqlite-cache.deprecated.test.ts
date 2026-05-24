// palantir-mini sprint-061 cleanup-D — SQLite cache tests (DEPRECATED).
// Retained for regression coverage of ImpactGraphSqliteCache; class itself is deprecated.
// Import source updated: sqlite-cache → sqlite-cache.deprecated (cleanup-D).

import { test, expect, describe, afterEach } from "bun:test";
import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { ImpactGraphSqliteCache } from "../../lib/impact-graph/sqlite-cache.deprecated";
import type { StoredEdge }        from "../../lib/impact-graph/types";

let caches: ImpactGraphSqliteCache[] = [];

function openCache(): { cache: ImpactGraphSqliteCache; dbPath: string } {
  const dir    = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sq-"));
  const dbPath = path.join(dir, "impact-graph.db");
  const cache  = new ImpactGraphSqliteCache(dbPath);
  caches.push(cache);
  return { cache, dbPath };
}

afterEach(() => {
  for (const c of caches) {
    try { c.close(); } catch { /* ignore */ }
  }
  caches = [];
});

function makeEdge(from: string, to: string, kind = "import"): StoredEdge {
  return {
    fromRid: from,
    toRid: to,
    edgeKind: kind as StoredEdge["edgeKind"],
    confidence: 1.0,
    scannedAt: new Date().toISOString(),
  };
}

describe("ImpactGraphSqliteCache — upsertEdge", () => {
  test("count starts at 0 for empty db", () => {
    const { cache } = openCache();
    expect(cache.count()).toBe(0);
  });

  test("upsertEdge increments count", () => {
    const { cache } = openCache();
    cache.upsertEdge(makeEdge("a", "b"));
    expect(cache.count()).toBe(1);
  });

  test("upsert is idempotent — duplicate edge does not increase count", () => {
    const { cache } = openCache();
    cache.upsertEdge(makeEdge("a", "b"));
    cache.upsertEdge(makeEdge("a", "b"));
    expect(cache.count()).toBe(1);
  });

  test("different edgeKind = different PK = two rows", () => {
    const { cache } = openCache();
    cache.upsertEdge(makeEdge("a", "b", "import"));
    cache.upsertEdge(makeEdge("a", "b", "typeRef"));
    expect(cache.count()).toBe(2);
  });
});

describe("ImpactGraphSqliteCache — upsertBulk", () => {
  test("bulk-inserts all edges", () => {
    const { cache } = openCache();
    const edges: StoredEdge[] = Array.from({ length: 100 }, (_, i) =>
      makeEdge(`file:a${i}.ts`, `file:b${i}.ts`),
    );
    cache.upsertBulk(edges);
    expect(cache.count()).toBe(100);
  });

  test("bulk upsert deduplicates on PK", () => {
    const { cache } = openCache();
    const edge  = makeEdge("x", "y", "import");
    const edges = [edge, edge, edge];
    cache.upsertBulk(edges);
    expect(cache.count()).toBe(1);
  });

  test("empty bulk upsert does not throw", () => {
    const { cache } = openCache();
    expect(() => cache.upsertBulk([])).not.toThrow();
    expect(cache.count()).toBe(0);
  });
});

describe("ImpactGraphSqliteCache — queryByFromRid", () => {
  test("returns edges with matching fromRid", () => {
    const { cache } = openCache();
    cache.upsertEdge(makeEdge("src", "dep1"));
    cache.upsertEdge(makeEdge("src", "dep2"));
    cache.upsertEdge(makeEdge("other", "dep3"));
    const rows = cache.queryByFromRid("src");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.fromRid === "src")).toBe(true);
  });

  test("returns empty array when fromRid not found", () => {
    const { cache } = openCache();
    expect(cache.queryByFromRid("missing")).toHaveLength(0);
  });
});

describe("ImpactGraphSqliteCache — queryByToRid", () => {
  test("returns edges with matching toRid", () => {
    const { cache } = openCache();
    cache.upsertEdge(makeEdge("a", "shared"));
    cache.upsertEdge(makeEdge("b", "shared"));
    cache.upsertEdge(makeEdge("c", "other"));
    const rows = cache.queryByToRid("shared");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.toRid === "shared")).toBe(true);
  });
});

describe("ImpactGraphSqliteCache — walkTransitiveForward", () => {
  test("returns direct + transitive edges up to depth", () => {
    const { cache } = openCache();
    cache.upsertEdge(makeEdge("a", "b"));
    cache.upsertEdge(makeEdge("b", "c"));
    cache.upsertEdge(makeEdge("c", "d"));
    cache.upsertEdge(makeEdge("x", "y"));

    const edges = cache.walkTransitiveForward("a", 3);
    const rids  = edges.map((e) => e.toRid);
    expect(rids).toContain("b");
    expect(rids).toContain("c");
    expect(rids).toContain("d");
    expect(rids).not.toContain("y");
  });

  test("depth=1 returns only direct children", () => {
    const { cache } = openCache();
    cache.upsertEdge(makeEdge("a", "b"));
    cache.upsertEdge(makeEdge("b", "c"));
    const edges = cache.walkTransitiveForward("a", 1);
    const rids  = edges.map((e) => e.toRid);
    expect(rids).toContain("b");
    expect(rids).not.toContain("c");
  });

  test("handles cycles without infinite loop", () => {
    const { cache } = openCache();
    cache.upsertEdge(makeEdge("a", "b"));
    cache.upsertEdge(makeEdge("b", "a"));
    const edges = cache.walkTransitiveForward("a", 5);
    const toRids = new Set(edges.map((e) => e.toRid));
    expect(toRids.size).toBeLessThanOrEqual(2);
  });

  test("returns empty array for unknown startRid", () => {
    const { cache } = openCache();
    expect(cache.walkTransitiveForward("missing", 3)).toHaveLength(0);
  });
});

describe("ImpactGraphSqliteCache — walkTransitiveBackward", () => {
  test("walks backward (incoming) edges", () => {
    const { cache } = openCache();
    cache.upsertEdge(makeEdge("a", "c"));
    cache.upsertEdge(makeEdge("b", "c"));
    cache.upsertEdge(makeEdge("root", "a"));
    const edges = cache.walkTransitiveBackward("c", 3);
    const froms = edges.map((e) => e.fromRid);
    expect(froms).toContain("a");
    expect(froms).toContain("b");
    expect(froms).toContain("root");
  });
});

describe("ImpactGraphSqliteCache — clear", () => {
  test("clear removes all rows", () => {
    const { cache } = openCache();
    cache.upsertBulk([makeEdge("a", "b"), makeEdge("c", "d")]);
    expect(cache.count()).toBe(2);
    cache.clear();
    expect(cache.count()).toBe(0);
  });
});

describe("ImpactGraphSqliteCache.normalize", () => {
  test("converts absolute path to relative", () => {
    const rel = ImpactGraphSqliteCache.normalize("/project/src/foo.ts", "/project");
    expect(rel).toBe("src/foo.ts");
  });

  test("leaves already-relative path unchanged", () => {
    const rel = ImpactGraphSqliteCache.normalize("src/foo.ts", "/project");
    expect(rel).toBe("src/foo.ts");
  });

  test("keeps absolute path when outside project root", () => {
    const abs = ImpactGraphSqliteCache.normalize("/other/path/foo.ts", "/project");
    expect(abs).toBe("/other/path/foo.ts");
  });
});
