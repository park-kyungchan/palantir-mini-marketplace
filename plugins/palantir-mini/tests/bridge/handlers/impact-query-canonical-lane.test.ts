// palantir-mini — W1 acceptance regression: impact_query canonical typed-graph lane
//
// This is the F8 acceptance probe, promoted from a one-off design-output script to
// a live regression test (FAILURES.md F8: "acceptance criteria must NAME THE LIVE
// LANE"). It DELIBERATELY binds to the LIVE plugin wiring: the ontology-graph
// indexer resolves its pluginRoot from import.meta.dir, NOT from the projectRoot
// passed to impactQuery (buildOntologyGraph does not forward pluginRoot). So the
// real agents/hooks/rules wiring is read regardless of projectRoot, and a tmp
// fixture would NOT exercise the implementer node — a real-root build is required.
// If agents/implementer.md is ever renamed/removed this test goes red on purpose:
// it asserts a REAL wiring fact (the live typed graph carries the canonical edge).
//
// The 30s graph-cache TTL bleeds state across tests, so we clearGraphCache(ROOT)
// before AND after and pass noCache:true on the live probe.

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import impactQuery from "../../../bridge/handlers/impact-query";
import { clearGraphCache } from "../../../lib/impact-query/graph-cache";

const ROOT = "/home/palantirkc/palantir-mini-marketplace";
const IMPLEMENTER_RID = "pm.self.ontology/object-type/agent/implementer";

describe("impact_query — canonical typed-graph lane (W1 / F8 regression)", () => {
  test("implementer canonical node returns non-empty typed-graph edge evidence", async () => {
    clearGraphCache(ROOT);
    try {
      const result = await impactQuery({
        rid: IMPLEMENTER_RID,
        projectRoot: ROOT,
        noCache: true,
      });

      expect(result.canonicalLane).toBe("typed-graph");
      expect(result.typedGraphForward.length + result.typedGraphBackward.length).toBeGreaterThanOrEqual(1);
      expect(result.graphConfidence).toBeGreaterThanOrEqual(0.7);

      // The live wiring mints an inbound `describes` ALIAS edge -> the canonical
      // implementer node (FAILURES.md F8 / self-instance-edges indexer).
      const allEdges = [...result.typedGraphForward, ...result.typedGraphBackward];
      const hasDescribesToImplementer = allEdges.some(
        (e) => e.kind === "describes" && e.toRid === IMPLEMENTER_RID,
      );
      expect(hasDescribesToImplementer).toBe(true);
    } finally {
      clearGraphCache(ROOT);
    }
  });

  test("additive fields always present + legacy lane preserved", async () => {
    const tmpProject = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact-canonical-"));
    clearGraphCache(tmpProject);
    try {
      const result = await impactQuery({
        rid: "no-such-rid",
        projectRoot: tmpProject,
        noCache: true,
      });

      expect(["typed-graph", "sqlite", "none"]).toContain(result.canonicalLane);
      expect(Array.isArray(result.typedGraphForward)).toBe(true);
      expect(Array.isArray(result.typedGraphBackward)).toBe(true);
      // Legacy contract intact: empty tmp project => no legacy fwd/bwd edges.
      expect(result.forwardProp).toEqual([]);
      expect(result.backwardProp).toEqual([]);
    } finally {
      clearGraphCache(tmpProject);
      fs.rmSync(tmpProject, { recursive: true, force: true });
    }
  });
});
