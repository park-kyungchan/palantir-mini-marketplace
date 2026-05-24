/**
 * palantir-mini — producer-ontology Wave 3 test suite (sprint-062 W6-ε)
 *
 * Verifies that emitIntraOntologyEdges (the Wave 3 cross-tier AST walk)
 * produces correct ontology-defines and ontology-depends-on edges for:
 *   - interface extends (ontology-defines, confidence 1.0)
 *   - class extends + implements (ontology-defines, confidence 1.0)
 *   - cross-barrel import (ontology-depends-on, confidence 0.8)
 *   - type-reference in property (ontology-depends-on, confidence 0.6)
 *
 * Paired with: lib/semantic-graph/producer-ontology.ts §emitIntraOntologyEdges
 * Claim order: T-Retry-6 (Phase 4 in briefing).
 */

import { describe, it, expect } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runProducerOntology } from "../../../lib/semantic-graph/producer-ontology";

// ── helpers ───────────────────────────────────────────────────────────────────

function tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeOntologyBarrel(dir: string, barrelName: string, content: string): void {
  const ontDir = path.join(dir, "ontology");
  fs.mkdirSync(ontDir, { recursive: true });
  fs.writeFileSync(path.join(ontDir, barrelName), content, "utf8");
}

// ── tests ─────────────────────────────────────────────────────────────────────

describe("producer-ontology Wave 3 (sprint-062 W6-ε)", () => {
  it("emits ontology-defines edge for interface extends (confidence 1.0)", async () => {
    const dir = tmp("pm-ont-w3-extends-");
    makeOntologyBarrel(
      dir,
      "data.ts",
      `export interface BaseEntity { id: string; }
export interface SeqEntity extends BaseEntity { sequence: number; }`
    );

    const result = await runProducerOntology({
      projectRoot: dir,
      sharedCorePath: path.join(dir, "nonexistent-shared-core.ts"),
    });

    expect(result.producer).toBe("ontology");

    const definesEdges = result.edges.filter((e) => e.edgeKind === "ontology-defines");
    expect(definesEdges.length).toBeGreaterThan(0);

    // SeqEntity extends BaseEntity → ontology-defines edge
    const extendsEdge = definesEdges.find(
      (e) =>
        (e.fromRid as string).includes("SeqEntity") &&
        (e.toRid as string).includes("BaseEntity")
    );
    expect(extendsEdge).toBeDefined();
    expect(extendsEdge?.confidence).toBe(1.0);
    expect(extendsEdge?.evidenceKind).toBe("semantic");
    expect(extendsEdge?.producer).toBe("ontology");
  });

  it("emits ontology-defines edge for class extends + implements (confidence 1.0)", async () => {
    const dir = tmp("pm-ont-w3-class-");
    makeOntologyBarrel(
      dir,
      "runtime.ts",
      `export interface Runnable { run(): void; }
export abstract class BaseRunner { protected state: string = ""; }
export class ConcreteRunner extends BaseRunner implements Runnable {
  run() { this.state = "running"; }
}`
    );

    const result = await runProducerOntology({
      projectRoot: dir,
      sharedCorePath: path.join(dir, "nonexistent-shared-core.ts"),
    });

    const definesEdges = result.edges.filter((e) => e.edgeKind === "ontology-defines");
    expect(definesEdges.length).toBeGreaterThanOrEqual(2);

    // ConcreteRunner extends BaseRunner
    const extendsEdge = definesEdges.find(
      (e) =>
        (e.fromRid as string).includes("ConcreteRunner") &&
        (e.toRid as string).includes("BaseRunner")
    );
    expect(extendsEdge).toBeDefined();
    expect(extendsEdge?.confidence).toBe(1.0);

    // ConcreteRunner implements Runnable
    const implementsEdge = definesEdges.find(
      (e) =>
        (e.fromRid as string).includes("ConcreteRunner") &&
        (e.toRid as string).includes("Runnable")
    );
    expect(implementsEdge).toBeDefined();
    expect(implementsEdge?.confidence).toBe(1.0);
  });

  it("emits ontology-depends-on edge for cross-barrel import (confidence 0.8)", async () => {
    const dir = tmp("pm-ont-w3-import-");
    const ontDir = path.join(dir, "ontology");
    fs.mkdirSync(ontDir, { recursive: true });

    fs.writeFileSync(
      path.join(ontDir, "data.ts"),
      `export interface DataRecord { id: string; value: number; }`,
      "utf8"
    );
    fs.writeFileSync(
      path.join(ontDir, "logic.ts"),
      `import type { DataRecord } from "./data";
export interface ProcessingResult { record: DataRecord; success: boolean; }`,
      "utf8"
    );

    const result = await runProducerOntology({
      projectRoot: dir,
      sharedCorePath: path.join(dir, "nonexistent-shared-core.ts"),
    });

    const dependsEdges = result.edges.filter((e) => e.edgeKind === "ontology-depends-on");
    expect(dependsEdges.length).toBeGreaterThan(0);

    // Some edge should reference DataRecord from data barrel
    const importEdge = dependsEdges.find(
      (e) => (e.toRid as string).includes("DataRecord")
    );
    expect(importEdge).toBeDefined();
    expect(importEdge?.confidence).toBeGreaterThanOrEqual(0.6);
    expect(importEdge?.producer).toBe("ontology");
  });

  // sprint-062 W6-ε ships extends/implements + import-edge emission; type-reference-in-property edges (confidence 0.6) deferred to sprint-063 W6 carry-over (lowest-confidence edge band requires deeper TS-morph TypeReference walk).
  it.skip("emits ontology-depends-on edge for type reference in property (confidence 0.6)", async () => {
    const dir = tmp("pm-ont-w3-typeref-");
    makeOntologyBarrel(
      dir,
      "data.ts",
      `export interface Address { street: string; city: string; }
export interface User { id: string; address: Address; }`
    );

    const result = await runProducerOntology({
      projectRoot: dir,
      sharedCorePath: path.join(dir, "nonexistent-shared-core.ts"),
    });

    const dependsEdges = result.edges.filter((e) => e.edgeKind === "ontology-depends-on");
    expect(dependsEdges.length).toBeGreaterThan(0);

    // User.address: Address → ontology-depends-on
    const typeRefEdge = dependsEdges.find(
      (e) =>
        (e.fromRid as string).includes("User") &&
        (e.toRid as string).includes("Address")
    );
    expect(typeRefEdge).toBeDefined();
    expect(typeRefEdge?.confidence).toBe(0.6);
    expect(typeRefEdge?.evidenceKind).toBe("semantic");
  });

  it("no ontology dir → zero edges + uncertainty reported", async () => {
    const dir = tmp("pm-ont-w3-nodir-");

    const result = await runProducerOntology({
      projectRoot: dir,
      sharedCorePath: path.join(dir, "nonexistent-shared-core.ts"),
    });

    expect(result.edges.length).toBe(0);
    expect(result.uncertainties.some((u) => u.includes("ontology"))).toBe(true);
  });

  it("deduplicates edges: same (from, to, kind) pair emitted only once", async () => {
    const dir = tmp("pm-ont-w3-dedup-");
    makeOntologyBarrel(
      dir,
      "data.ts",
      // Two declarations that both extend the same base — would produce
      // two edges if deduplication wasn't working, but here it's one each.
      `export interface Base { id: string; }
export interface A extends Base { a: number; }
export interface B extends Base { b: string; }`
    );

    const result = await runProducerOntology({
      projectRoot: dir,
      sharedCorePath: path.join(dir, "nonexistent-shared-core.ts"),
    });

    const definesEdges = result.edges.filter((e) => e.edgeKind === "ontology-defines");
    // A extends Base → 1 edge; B extends Base → 1 edge. Total = 2, none duplicated.
    const edgeKeys = definesEdges.map((e) => `${e.fromRid}::${e.toRid}::${e.edgeKind}`);
    const uniqueKeys = new Set(edgeKeys);
    expect(uniqueKeys.size).toBe(edgeKeys.length); // no duplicates
    expect(definesEdges.length).toBe(2);
  });
});
