/**
 * palantir-mini v3.7.0 — Wave 2 MVP test suite (writers sibling, A.5 split)
 * Coverage: manifest-writer + semantic-query.
 */

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { writeManifest } from "../../../lib/semantic-graph/manifest-writer";
import { runSemanticQuery } from "../../../lib/semantic-graph/semantic-query";
import { semanticRid } from "#schemas/ontology/primitives/semantic-rid";

function tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

describe("manifest-writer", () => {
  test("writes JSON file and returns accurate counts", async () => {
    const dir = tmp("pm-manifest-");
    const scannedAt = new Date().toISOString();

    const fakeResults = [
      {
        producer: "ontology" as const,
        nodes: [
          {
            decl: { rid: semanticRid("ontology", "data.Foo"), kind: "ontology" as const, value: "data.Foo", label: "Foo", registeredAt: scannedAt },
            discoveredBy: ["ontology" as const],
          },
          {
            decl: { rid: semanticRid("ontology", "data.Bar"), kind: "ontology" as const, value: "data.Bar", label: "Bar", registeredAt: scannedAt },
            discoveredBy: ["ontology" as const],
          },
        ],
        edges: [],
        uncertainties: [],
        durationMs: 5,
      },
      {
        producer: "codegen" as const,
        nodes: [
          {
            decl: { rid: semanticRid("gen", "ontology-registry"), kind: "gen" as const, value: "ontology-registry", label: "ontology-registry.generated.ts", registeredAt: scannedAt },
            discoveredBy: ["codegen" as const],
          },
        ],
        edges: [
          {
            fromRid: semanticRid("gen", "ontology-registry"),
            toRid: semanticRid("ontology", "external.runtime"),
            edgeKind: "gen-from-ontology" as const,
            confidence: 0.8,
            evidenceKind: "semantic" as const,
            evidence: "header: AUTO-GENERATED from ontology/runtime.ts",
            producer: "codegen" as const,
          },
        ],
        uncertainties: [],
        durationMs: 3,
      },
    ];

    const result = await writeManifest({ projectRoot: dir, producerResults: fakeResults });

    expect(typeof result.path).toBe("string");
    expect(result.nodeCount).toBe(3);
    expect(result.edgeCount).toBe(1);

    expect(fs.existsSync(result.path)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(result.path, "utf8")) as {
      version: string;
      nodeCount: number;
      edgeCount: number;
      producerCount: number;
    };
    expect(raw.version).toBe("v1");
    expect(raw.nodeCount).toBe(3);
    expect(raw.edgeCount).toBe(1);
    expect(raw.producerCount).toBe(2);
  });
});

describe("semantic-query", () => {
  test("runSemanticQuery against palantir-math returns valid SemanticChangePlan shape", async () => {
    const plan = await runSemanticQuery({
      projectRoot: "/home/palantirkc/projects/palantir-math",
      targetRids: [],
      writeManifest: false,
    });

    expect(Array.isArray(plan.affectedSemanticRids)).toBe(true);
    expect(Array.isArray(plan.affectedFiles)).toBe(true);
    expect(Array.isArray(plan.affectedGenerated)).toBe(true);
    expect(Array.isArray(plan.affectedTests)).toBe(true);
    expect(Array.isArray(plan.affectedEvals)).toBe(true);
    expect(Array.isArray(plan.affectedDocs)).toBe(true);
    expect(Array.isArray(plan.affectedMonitoring)).toBe(true);
    expect(Array.isArray(plan.editOrder)).toBe(true);
    expect(Array.isArray(plan.uncertainties)).toBe(true);
    expect(typeof plan.confidence).toBe("number");
    expect(plan.confidence).toBeGreaterThanOrEqual(0.2);
    expect(plan.confidence).toBeLessThanOrEqual(0.95);
    expect(plan.source).toBe("fresh-scan");

    expect(plan.affectedEvals.length).toBe(0);
    expect(plan.affectedDocs.length).toBe(0);
    expect(plan.affectedMonitoring.length).toBe(0);
  });

  test("targetRids with 1-hop → neighborhood includes connected nodes", async () => {
    const dir = tmp("pm-query-hop-");
    const genDir = path.join(dir, "src/generated");
    fs.mkdirSync(genDir, { recursive: true });
    fs.writeFileSync(
      path.join(genDir, "widget-registry.generated.ts"),
      `/**\n * AUTO-GENERATED from ontology/data.ts\n */\nexport const w = 1;\n`,
      "utf8"
    );

    const genRid = semanticRid("gen", "widget-registry");

    const plan = await runSemanticQuery({
      projectRoot: dir,
      targetRids: [genRid],
      writeManifest: false,
    });

    const affectedStrings = plan.affectedSemanticRids.map((r) => r as string);
    expect(affectedStrings).toContain("gen:widget-registry");

    const orderStrings = plan.editOrder.map((r) => r as string);
    expect(orderStrings).toContain("gen:widget-registry");

    expect(plan.confidence).toBeGreaterThanOrEqual(0.2);
    expect(plan.confidence).toBeLessThanOrEqual(0.95);
  });
});
