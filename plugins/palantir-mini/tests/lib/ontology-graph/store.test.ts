/**
 * tests/lib/ontology-graph/store.test.ts
 * Tests for OntologyGraphStore (createOntologyGraphStore factory).
 * Uses generic-only types — no concrete PR 2.1 / PR 2.2 primitive imports.
 */

import { describe, expect, test } from "bun:test";
import { createOntologyGraphStore } from "../../../lib/ontology-graph/store";
import type { NodeRecord, EdgeRecord, NodeRid, EdgeRid } from "../../../lib/ontology-graph/types";

// ─── Test helpers ─────────────────────────────────────────────────────────────

function nodeRid(s: string): NodeRid {
  return s as NodeRid;
}

function edgeRid(s: string): EdgeRid {
  return s as EdgeRid;
}

function makeNode(rid: string, kind: string, value: unknown = {}): NodeRecord {
  return { rid: nodeRid(rid), kind, value };
}

function makeEdge(
  rid: string,
  kind: string,
  fromRid: string,
  toRid: string,
  value: unknown = {},
): EdgeRecord {
  return { rid: edgeRid(rid), kind, fromRid: nodeRid(fromRid), toRid: nodeRid(toRid), value };
}

// ─── Test 1: addNode + getNode roundtrip ──────────────────────────────────────

describe("OntologyGraphStore", () => {
  test("addNode + getNode roundtrip", () => {
    const store = createOntologyGraphStore();
    const node = makeNode("node-A", "UserPrompt", { excerpt: "hello" });
    store.addNode(node);

    const retrieved = store.getNode(nodeRid("node-A"));
    expect(retrieved).toBe(node);
    expect(retrieved?.kind).toBe("UserPrompt");
  });

  // ─── Test 2: addEdge requires both endpoints ──────────────────────────────

  test("addEdge requires both endpoints; throws otherwise", () => {
    const store = createOntologyGraphStore();
    const edge = makeEdge("edge-AB", "imports", "node-A", "node-B");

    // Neither endpoint exists — must throw
    expect(() => store.addEdge(edge)).toThrow();

    // Add fromRid only — still throws (toRid missing)
    store.addNode(makeNode("node-A", "SourceFile"));
    expect(() => store.addEdge(edge)).toThrow();

    // Add toRid too — now succeeds
    store.addNode(makeNode("node-B", "SourceFile"));
    expect(() => store.addEdge(edge)).not.toThrow();

    const retrieved = store.getEdge(edgeRid("edge-AB"));
    expect(retrieved?.kind).toBe("imports");
    expect(retrieved?.fromRid).toBe(nodeRid("node-A"));
  });

  // ─── Test 3: getNodesByKind filter ────────────────────────────────────────

  test("getNodesByKind returns only nodes matching the kind", () => {
    const store = createOntologyGraphStore();
    store.addNode(makeNode("prompt-1", "UserPrompt"));
    store.addNode(makeNode("hook-1", "Hook"));
    store.addNode(makeNode("hook-2", "Hook"));
    store.addNode(makeNode("agent-1", "AgentDefinition"));

    const hooks = store.getNodesByKind("Hook");
    expect(hooks.length).toBe(2);
    expect(hooks.every((n) => n.kind === "Hook")).toBe(true);

    const prompts = store.getNodesByKind("UserPrompt");
    expect(prompts.length).toBe(1);
    expect(prompts[0]?.rid).toBe(nodeRid("prompt-1"));

    const missing = store.getNodesByKind("NonExistentKind");
    expect(missing.length).toBe(0);
  });

  // ─── Test 4: getEdgesFrom + getEdgesTo ────────────────────────────────────

  test("getEdgesFrom and getEdgesTo return correct sets", () => {
    const store = createOntologyGraphStore();
    store.addNode(makeNode("A", "SourceFile"));
    store.addNode(makeNode("B", "SourceFile"));
    store.addNode(makeNode("C", "SourceFile"));
    store.addNode(makeNode("D", "SourceFile"));

    // A→B, A→C, D→A
    store.addEdge(makeEdge("e-AB", "imports", "A", "B"));
    store.addEdge(makeEdge("e-AC", "imports", "A", "C"));
    store.addEdge(makeEdge("e-DA", "imports", "D", "A"));

    const fromA = store.getEdgesFrom(nodeRid("A"));
    expect(fromA.length).toBe(2);
    const fromARids = fromA.map((e) => e.rid).sort();
    expect(fromARids).toEqual([edgeRid("e-AB"), edgeRid("e-AC")].sort());

    const toA = store.getEdgesTo(nodeRid("A"));
    expect(toA.length).toBe(1);
    expect(toA[0]?.rid).toBe(edgeRid("e-DA"));

    // No edges from D to elsewhere in this test
    const fromD = store.getEdgesFrom(nodeRid("D"));
    expect(fromD.length).toBe(1);
    expect(fromD[0]?.toRid).toBe(nodeRid("A"));
  });

  // ─── Test 5: walkTransitive depth + edgeKindFilter ────────────────────────

  test("walkTransitive respects depth limit and edgeKindFilter", () => {
    // Graph: A→B→C→D (all 'imports') + A→E (single 'validates' edge)
    const store = createOntologyGraphStore();
    store.addNode(makeNode("A", "SourceFile"));
    store.addNode(makeNode("B", "SourceFile"));
    store.addNode(makeNode("C", "SourceFile"));
    store.addNode(makeNode("D", "SourceFile"));
    store.addNode(makeNode("E", "Hook"));

    store.addEdge(makeEdge("e-AB", "imports", "A", "B"));
    store.addEdge(makeEdge("e-BC", "imports", "B", "C"));
    store.addEdge(makeEdge("e-CD", "imports", "C", "D"));
    store.addEdge(makeEdge("e-AE", "validates", "A", "E"));

    // walkTransitive("A", 2) — depth 2 from A:
    //   depth 1: B, E (via 'imports' + 'validates')
    //   depth 2: C (via B→C; D is depth 3 — excluded)
    // Expected nodes: A, B, E, C
    const sub2 = store.walkTransitive(nodeRid("A"), 2);
    const rids2 = sub2.nodes.map((n) => n.rid).sort();
    expect(rids2).toEqual([nodeRid("A"), nodeRid("B"), nodeRid("C"), nodeRid("E")].sort());
    expect(sub2.root).toBe(nodeRid("A"));

    // D should NOT be in depth-2 walk (it's depth 3 from A)
    expect(rids2).not.toContain(nodeRid("D"));

    // walkTransitive("A", 2, ["imports"]) — only follow 'imports' edges:
    //   depth 1: B (E excluded since 'validates' filtered)
    //   depth 2: C
    // Expected nodes: A, B, C (NOT E)
    const subFiltered = store.walkTransitive(nodeRid("A"), 2, ["imports"]);
    const ridsFiltered = subFiltered.nodes.map((n) => n.rid).sort();
    expect(ridsFiltered).toEqual([nodeRid("A"), nodeRid("B"), nodeRid("C")].sort());
    expect(ridsFiltered).not.toContain(nodeRid("E"));

    // Edges in the filtered walk should only be 'imports' edges
    expect(subFiltered.edges.every((e) => e.kind === "imports")).toBe(true);
  });
});
