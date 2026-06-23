/**
 * tests/lib/ontology-graph/registered-primitives.test.ts — IMPACT-1.
 *
 * Proves the headline bridge: a primitive registered via the
 * register→commit loop (materialized in get_ontology.registeredPrimitives) is
 * projected as a FIRST-CLASS graph node keyed by its rid, so impact_query can
 * reach it. Before IMPACT-1 the graph held only Event-envelope nodes and a
 * registered rid matched NOTHING.
 *
 * Fixtures live entirely under os.tmpdir() (rule 25 — no tracked mutation).
 */

import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { indexRegisteredPrimitives } from "../../../lib/ontology-graph/indexers/registered-primitives";
import { buildOntologyGraph } from "../../../lib/ontology-graph/build-graph";
import impactQuery from "../../../bridge/handlers/impact-query";
import { clearGraphCache } from "../../../lib/impact-query/graph-cache";

const tmpDirs: string[] = [];

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

/** Seed a project whose events.jsonl has ONE edit_committed registering an
 *  ObjectType (A), an ObjectType (B), and a LinkType (A —relatesTo→ B). */
function seedRegistered(): { root: string; objA: string; objB: string; link: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact1-"));
  tmpDirs.push(root);
  const sessionDir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });

  const objA = "rid:pm:object/alpha";
  const objB = "rid:pm:object/beta";
  const link = "rid:pm:link/alpha-relates-beta";

  const row = JSON.stringify({
    eventId: "evt-1",
    sequence: 1,
    type: "edit_committed",
    when: new Date().toISOString(),
    payload: {
      actionTypeRid: "pm.self.ontology/action-type/commit-edits",
      appliedEdits: [
        { kind: "object", rid: objA, properties: { primitiveKind: "ObjectType", plainName: "Alpha" } },
        { kind: "object", rid: objB, properties: { primitiveKind: "ObjectType", plainName: "Beta" } },
        { kind: "link", rid: link, srcRid: objA, dstRid: objB, linkName: "relatesTo" },
      ],
      submissionCriteriaPassed: [],
    },
    timestamp: new Date().toISOString(),
    atopWhich: { commitSha: "abc" },
    throughWhich: { sessionId: "s", toolName: "t", cwd: "c" },
    byWhom: { agentName: "test", identity: "claude-code" },
    decision: {
      atopWhich: { commitSha: "abc" },
      throughWhich: { surface: "test", tool: "test" },
      byWhom: { agent: "test", identity: "claude-code" },
      withWhat: { reasoning: "seed registered primitives for impact reachability" },
    },
  });
  fs.writeFileSync(path.join(sessionDir, "events.jsonl"), row + "\n");
  return { root, objA, objB, link };
}

describe("IMPACT-1 — registered-primitives indexer", () => {
  test("projects each registered primitive as a node keyed by its rid", async () => {
    const { root, objA, objB, link } = seedRegistered();
    const fragment = await indexRegisteredPrimitives(root, { nowIso: "2026-06-10T00:00:00Z" });

    const nodeRids = fragment.nodes.map((n) => n.rid as unknown as string);
    expect(nodeRids).toContain(objA);
    expect(nodeRids).toContain(objB);
    expect(nodeRids).toContain(link);

    // Node carries the registered kind + meaning-bearing declaration (FOLD-1).
    const alpha = fragment.nodes.find((n) => (n.rid as unknown as string) === objA);
    expect(alpha?.kind).toBe("ObjectType");
    expect((alpha?.value as { declaration?: { plainName?: string } })?.declaration?.plainName).toBe("Alpha");
  });

  test("registered LinkType becomes an edge connecting its endpoints", async () => {
    const { root, objA, objB } = seedRegistered();
    const fragment = await indexRegisteredPrimitives(root, { nowIso: "2026-06-10T00:00:00Z" });

    const linkEdge = fragment.edges.find(
      (e) => (e.fromRid as unknown as string) === objA && (e.toRid as unknown as string) === objB,
    );
    expect(linkEdge).toBeDefined();
    expect(linkEdge?.kind).toBe("linkType");
  });

  test("empty / missing events → empty fragment (no throw)", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-impact1-empty-"));
    tmpDirs.push(root);
    const fragment = await indexRegisteredPrimitives(root);
    expect(fragment.nodes.length).toBe(0);
    expect(fragment.edges.length).toBe(0);
  });
});

describe("IMPACT-1 — registered rid is reachable through the orchestrated graph", () => {
  test("buildOntologyGraph store contains the registered node by literal rid + its link edge", async () => {
    const { root, objA, objB } = seedRegistered();
    const { store } = await buildOntologyGraph(root, { nowIso: "2026-06-10T00:00:00Z" });

    // Direct rid match — exactly what impact_query.probeTypedGraph does.
    expect(store.getNode(objA as never)).toBeDefined();
    expect(store.getNode(objB as never)).toBeDefined();

    // The link edge is incident to objA so its dependents are reachable.
    const incident = [...store.getEdgesFrom(objA as never), ...store.getEdgesTo(objA as never)];
    expect(incident.length).toBeGreaterThanOrEqual(1);
    expect(incident.some((e) => (e.toRid as unknown as string) === objB)).toBe(true);
  });

  test("impact_query on a registered rid matches the typed graph (was blind before IMPACT-1)", async () => {
    const { root, objA } = seedRegistered();
    clearGraphCache(root);

    const result = await impactQuery({ rid: objA, projectRoot: root, noCache: true });

    // The registered node now matches in the typed graph → confidence is lifted
    // above the empty-project floor (bounded-explorer). Before IMPACT-1 the rid
    // matched nothing and this would have stayed at the no-evidence base.
    expect(result.graphConfidence).toBeGreaterThan(0.1);
    expect(result.recommendedAgentUse).not.toBe("bounded-explorer");

    clearGraphCache(root);
  });
});
