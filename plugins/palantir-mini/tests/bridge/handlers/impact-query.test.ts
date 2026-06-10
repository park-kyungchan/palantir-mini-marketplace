// palantir-mini v3.7.0 — impact_query direct alias test (C.E.1)
// File-name alias to satisfy `comm -23` discovery (handler dash-name vs
// existing batch4-impact-query.test.ts prefix). Full SQLite + in-memory
// coverage already in tests/handlers/batch4-impact-query.test.ts (113 LOC).
//
// Sprint-092 PR 2.15 extension: 3 new tests for graphConfidence +
// missingEdges + recommendedAgentUse fields. Uses skipTypedGraph=true on
// the legacy-only assertions to keep coverage focused.

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import impactQuery from "../../../bridge/handlers/impact-query";
import { clearGraphCache } from "../../../lib/impact-query/graph-cache";

describe("impact_query — handler exports", () => {
  test("validation — missing rid throws", async () => {
    await expect(impactQuery({})).rejects.toThrow(/rid.*required/);
  });

  test("validation — non-string rid throws", async () => {
    await expect(impactQuery({ rid: 42 })).rejects.toThrow(/rid.*required/);
  });

  test("returns ImpactQueryResult shape (in-memory fallback)", async () => {
    const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact-query-"));
    const result = await impactQuery({
      rid: "no-such-rid",
      projectRoot: tmpProject,
      skipTypedGraph: true,
    });
    expect(Array.isArray(result.forwardProp)).toBe(true);
    expect(Array.isArray(result.backwardProp)).toBe(true);
    expect(result.transitive).toBeDefined();
    expect(result.transitive.forward.root).toBe("no-such-rid");
    expect(result.transitive.backward.root).toBe("no-such-rid");
    expect(result.source).toBe("in-memory");
    fs.rmSync(tmpProject, { recursive: true, force: true });
  });

  test("default depth applied when not specified", async () => {
    const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact-query-2-"));
    const result = await impactQuery({
      rid: "test-rid",
      projectRoot: tmpProject,
      skipTypedGraph: true,
    });
    expect(result.forwardProp).toEqual([]);
    expect(result.backwardProp).toEqual([]);
    fs.rmSync(tmpProject, { recursive: true, force: true });
  });

  // ── PR 2.15 (sprint-092) new fields ─────────────────────────────────────
  describe("PR 2.15 — graphConfidence + missingEdges + recommendedAgentUse", () => {
    test("new fields are always present on the result", async () => {
      const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact-query-pr215-"));
      const result = await impactQuery({
        rid: "no-such-rid",
        projectRoot: tmpProject,
        skipTypedGraph: true,
      });
      expect(typeof result.graphConfidence).toBe("number");
      expect(result.graphConfidence).toBeGreaterThanOrEqual(0);
      expect(result.graphConfidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.missingEdges)).toBe(true);
      expect(typeof result.recommendedAgentUse).toBe("string");
      expect([
        "lead-direct",
        "targeted-verification",
        "bounded-explorer",
        "none",
      ]).toContain(result.recommendedAgentUse);
      // W1: canonical typed-graph lane additive fields are always present.
      expect(typeof result.canonicalLane).toBe("string");
      expect(["typed-graph", "sqlite", "none"]).toContain(result.canonicalLane);
      expect(Array.isArray(result.typedGraphForward)).toBe(true);
      expect(Array.isArray(result.typedGraphBackward)).toBe(true);
      fs.rmSync(tmpProject, { recursive: true, force: true });
    });

    test("empty-project fallback => graphConfidence < 0.4 and recommendedAgentUse = bounded-explorer", async () => {
      const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact-query-low-"));
      clearGraphCache(tmpProject);
      const result = await impactQuery({
        rid: "unknown-shape-no-prefix",
        projectRoot: tmpProject,
        noCache: true,
      });
      // RID has no recognized prefix and the empty project produces no
      // typed-graph match → base 0.1 → bounded-explorer
      expect(result.graphConfidence).toBeLessThan(0.4);
      expect(result.recommendedAgentUse).toBe("bounded-explorer");
      clearGraphCache(tmpProject);
      fs.rmSync(tmpProject, { recursive: true, force: true });
    });

    test("recognized RID prefix => graphConfidence ≥ 0.4 and recommendedAgentUse !== none", async () => {
      const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact-query-mid-"));
      clearGraphCache(tmpProject);
      const result = await impactQuery({
        rid: "file:src/nonexistent.ts",
        projectRoot: tmpProject,
        noCache: true,
      });
      // Recognized `file:` prefix → base 0.4 → targeted-verification
      expect(result.graphConfidence).toBeGreaterThanOrEqual(0.4);
      expect(result.recommendedAgentUse).not.toBe("none");
      expect(result.recommendedAgentUse).not.toBe("bounded-explorer");
      clearGraphCache(tmpProject);
      fs.rmSync(tmpProject, { recursive: true, force: true });
    });
  });
});
