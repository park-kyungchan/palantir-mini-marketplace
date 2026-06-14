// palantir-mini — OE-9 regression: typed graph is THE propagation source.
//
// OE-9 inverts the impact_query layering: `forwardProp`/`backwardProp` are now
// served PRIMARY from the registered governed graph (probeTypedGraph); the legacy
// IMPACT_EDGE_REGISTRY/SQLite lane is the coverage/fallback signal (KEPT live —
// G-A5 option-b). This test pins BOTH directions:
//   - a typed-graph match => propagationSource "typed-graph", forwardProp derived
//     from the typed graph (edgeKind "semantic"), legacy decls still exposed.
//   - no match => propagationSource "legacy-fallback", forwardProp falls back to
//     the legacy lane (and still equals legacyForwardProp).
//
// Binds to the LIVE plugin wiring for the typed-graph case (same rationale as the
// canonical-lane test): buildOntologyGraph resolves its pluginRoot from
// import.meta.dir, so the real agents/hooks/rules wiring is read regardless of the
// projectRoot passed to impactQuery. noCache:true + clearGraphCache to avoid the
// 30s graph-cache TTL bleeding state across tests.

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import impactQuery from "../../../bridge/handlers/impact-query";
import { clearGraphCache } from "../../../lib/impact-query/graph-cache";

const ROOT = "/home/palantirkc/palantir-mini-marketplace";
const IMPLEMENTER_RID = "pm.self.ontology/object-type/agent/implementer";

describe("impact_query — OE-9 typed-graph-primary propagation", () => {
  test("typed-graph match => typed graph is THE forwardProp/backwardProp source", async () => {
    clearGraphCache(ROOT);
    try {
      const result = await impactQuery({
        rid: IMPLEMENTER_RID,
        projectRoot: ROOT,
        noCache: true,
      });

      // The registered governed graph matched the queried rid => it is PRIMARY.
      expect(result.propagationSource).toBe("typed-graph");

      // forwardProp/backwardProp now carry the typed-graph projection: every
      // primary decl is the canonical "semantic" edgeKind with typed-graph
      // evidence, NOT a legacy ImpactEdgeKind.
      const primary = [...result.forwardProp, ...result.backwardProp];
      expect(primary.length).toBeGreaterThanOrEqual(1);
      for (const e of primary) {
        expect(e.edgeKind).toBe("semantic");
        expect(e.evidence).toMatch(/^typed-graph:/);
        expect(e.confidence).toBe(1.0);
      }

      // The primary set mirrors the typed-graph fields (same edges, projected shape).
      expect(result.forwardProp.length).toBe(result.typedGraphForward.length);
      expect(result.backwardProp.length).toBe(result.typedGraphBackward.length);

      // The legacy IMPACT_EDGE_REGISTRY/SQLite lane is KEPT + still exposed as the
      // coverage/fallback signal (G-A5 — SQLite not deleted).
      expect(Array.isArray(result.legacyForwardProp)).toBe(true);
      expect(Array.isArray(result.legacyBackwardProp)).toBe(true);
    } finally {
      clearGraphCache(ROOT);
    }
  });

  test("no typed-graph match => legacy lane is the fallback source", async () => {
    const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact-oe9-"));
    clearGraphCache(tmpProject);
    try {
      const result = await impactQuery({
        rid: "no-such-rid",
        projectRoot: tmpProject,
        noCache: true,
      });

      expect(result.propagationSource).toBe("legacy-fallback");
      // Fallback => primary equals the legacy decls verbatim (empty tmp project).
      expect(result.forwardProp).toEqual(result.legacyForwardProp);
      expect(result.backwardProp).toEqual(result.legacyBackwardProp);
      expect(result.forwardProp).toEqual([]);
      expect(result.backwardProp).toEqual([]);
    } finally {
      clearGraphCache(tmpProject);
      fs.rmSync(tmpProject, { recursive: true, force: true });
    }
  });

  test("skipTypedGraph => always legacy-fallback (typed probe disabled)", async () => {
    const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact-oe9-skip-"));
    try {
      const result = await impactQuery({
        rid: "no-such-rid",
        projectRoot: tmpProject,
        skipTypedGraph: true,
      });
      expect(result.propagationSource).toBe("legacy-fallback");
      expect(result.forwardProp).toEqual(result.legacyForwardProp);
    } finally {
      fs.rmSync(tmpProject, { recursive: true, force: true });
    }
  });
});
