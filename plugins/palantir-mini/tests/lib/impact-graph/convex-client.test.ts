/**
 * palantir-mini sprint-061 B.W1 — convex-client.test.ts
 *
 * Verifies that the Convex impact-graph client behaves correctly in stub mode
 * (no CONVEX_URL configured) and returns sensible no-op responses without crashing.
 *
 * Additional test: validates the public API shape of stub responses matches
 * the ImpactGraphResult interface expectations.
 */

import { describe, it, expect, beforeEach } from "bun:test";
import {
  getConvexClient,
  resetConvexClient,
  normalize,
  getImpactGraph,
  getFileState,
  cascadeDelete,
  markBatchDirty,
  dirtyCount,
  totalEdgeCount,
} from "../../../lib/impact-graph/convex-client";

// ─── Setup: reset singleton before each test ─────────────────────────────────
// NOTE: The Convex .env.local in the plugin root may be present, causing the
// real client to be initialized. All tests verify graceful behavior regardless
// of whether stub or real (with connection failure) mode is in use.

beforeEach(() => {
  resetConvexClient();
});

// ─── No-crash + shape tests ───────────────────────────────────────────────────
// These tests verify the public API returns sensible empty results regardless
// of whether Convex is actually reachable. Both stub mode (no .env.local) and
// real mode with a connection error should return the same safe defaults.

describe("convex-client — no-crash + shape verification", () => {
  it("getConvexClient() returns an object with isStub property", () => {
    const client = getConvexClient();
    expect(client).toBeDefined();
    expect(typeof client.isStub).toBe("boolean");
  });

  it("getImpactGraph() returns empty ImpactGraphResult without crashing", async () => {
    const result = await getImpactGraph("/fake/project", "file:src/index.ts", 3);

    expect(result).toBeDefined();
    expect(Array.isArray(result.forward)).toBe(true);
    expect(Array.isArray(result.backward)).toBe(true);
    expect(result.transitive).toBeDefined();
    expect(Array.isArray(result.transitive.forward)).toBe(true);
    expect(Array.isArray(result.transitive.backward)).toBe(true);

    expect(result.forward).toHaveLength(0);
    expect(result.backward).toHaveLength(0);
    expect(result.transitive.forward).toHaveLength(0);
    expect(result.transitive.backward).toHaveLength(0);
  });

  it("getFileState() returns null without crashing", async () => {
    const result = await getFileState("/fake/project", "src/index.ts");
    expect(result).toBeNull();
  });

  it("cascadeDelete() returns { deletedCount: 0 } without crashing", async () => {
    const result = await cascadeDelete("/fake/project", "src/index.ts");
    expect(result).toBeDefined();
    expect(result.deletedCount).toBe(0);
  });

  it("markBatchDirty() returns { markedCount: 0 } without crashing", async () => {
    const result = await markBatchDirty("/fake/project", [
      "src/index.ts",
      "src/utils.ts",
    ]);
    expect(result).toBeDefined();
    expect(result.markedCount).toBe(0);
  });

  it("dirtyCount() returns 0 without crashing", async () => {
    const count = await dirtyCount("/fake/project");
    expect(typeof count).toBe("number");
    expect(count).toBe(0);
  });

  it("totalEdgeCount() returns 0 without crashing", async () => {
    const count = await totalEdgeCount("/fake/project");
    expect(typeof count).toBe("number");
    expect(count).toBe(0);
  });
});

// ─── normalize() helper tests ─────────────────────────────────────────────────

describe("normalize()", () => {
  it("converts absolute path to project-relative RID", () => {
    const result = normalize("/home/user/project/src/index.ts", "/home/user/project");
    expect(result).toBe("src/index.ts");
  });

  it("returns path as-is when already relative", () => {
    const result = normalize("src/index.ts", "/home/user/project");
    expect(result).toBe("src/index.ts");
  });

  it("normalizes backslashes to forward slashes", () => {
    // Simulate Windows-style path (edge-compat test)
    const result = normalize("src\\utils\\helpers.ts", "/home/user/project");
    expect(result).toBe("src/utils/helpers.ts");
  });

  it("returns absolute path unchanged when outside project root", () => {
    const result = normalize("/other/project/index.ts", "/home/user/project");
    // When path is outside project root, returns the original absolute path
    expect(result).toBe("/other/project/index.ts");
  });
});

// ─── Singleton identity tests ─────────────────────────────────────────────────

describe("singleton behavior", () => {
  it("returns the same instance on repeated calls within a test", () => {
    const a = getConvexClient();
    const b = getConvexClient();
    expect(a).toBe(b);
  });

  it("resetConvexClient() clears the singleton so a fresh instance is returned", () => {
    const a = getConvexClient();
    resetConvexClient();
    const b = getConvexClient();
    // After reset, a new instance is allocated — it should not be the same ref
    expect(a).not.toBe(b);
  });
});
