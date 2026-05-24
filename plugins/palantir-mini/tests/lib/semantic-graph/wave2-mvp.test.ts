/**
 * palantir-mini v3.7.0 — Wave 2 MVP producer tests (main, A.5 split)
 * Coverage: producer-ontology, producer-codegen, producer-runtime, producer-ast-evidence.
 * Decomposed in v3.7.0 A.5: manifest-writer + semantic-query → -writers.test.ts.
 */

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runProducerOntology } from "../../../lib/semantic-graph/producer-ontology";
import { runProducerCodegen } from "../../../lib/semantic-graph/producer-codegen";
import { runProducerRuntime } from "../../../lib/semantic-graph/producer-runtime";
import { runProducerAstEvidence } from "../../../lib/semantic-graph/producer-ast-evidence";

function tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function makeOntologyProject(
  dir: string,
  barrelContent: string,
  barrelName = "data.ts"
): void {
  const ontDir = path.join(dir, "ontology");
  fs.mkdirSync(ontDir, { recursive: true });
  fs.writeFileSync(path.join(ontDir, barrelName), barrelContent, "utf8");
}

describe("producer-ontology", () => {
  test("empty project → uncertainties contains missing paths", async () => {
    const dir = tmp("pm-prod-ont-empty-");
    const result = await runProducerOntology({
      projectRoot: dir,
      sharedCorePath: path.join(dir, "nonexistent-shared-core.ts"),
    });

    expect(result.producer).toBe("ontology");
    expect(result.uncertainties.length).toBeGreaterThan(0);
    expect(result.nodes.length).toBe(0);
  });

  test("palantir-math ontology barrel → nodes carry ontology:* RIDs", async () => {
    const dir = tmp("pm-prod-ont-pmath-");
    makeOntologyProject(
      dir,
      `export type { MathProblem, MathSolution } from "./data/problem";\nexport type { AccuracyScore } from "./data/learn";\n`
    );

    const result = await runProducerOntology({
      projectRoot: dir,
      sharedCorePath: path.join(dir, "no-shared-core.ts"),
    });

    expect(result.producer).toBe("ontology");
    expect(result.nodes.length).toBeGreaterThanOrEqual(3);
    for (const node of result.nodes) {
      expect((node.decl.rid as string).startsWith("ontology:")).toBe(true);
      expect(node.discoveredBy).toContain("ontology");
    }
    const rids = result.nodes.map((n) => n.decl.rid as string);
    expect(rids.some((r) => r.includes("MathProblem"))).toBe(true);
  });
});

describe("producer-codegen", () => {
  test("generated file with Source hint → gen-from-ontology edge emitted", async () => {
    const dir = tmp("pm-prod-cg-hint-");
    const genDir = path.join(dir, "src/generated");
    fs.mkdirSync(genDir, { recursive: true });
    fs.writeFileSync(
      path.join(genDir, "ontology-registry.generated.ts"),
      `/**\n * AUTO-GENERATED from ontology/runtime.ts + ontology/frontend.ts\n * Do not edit.\n */\nexport const foo = 1;\n`,
      "utf8"
    );

    const result = await runProducerCodegen({ projectRoot: dir });

    expect(result.producer).toBe("codegen");
    expect(result.nodes.length).toBe(1);
    expect((result.nodes[0]!.decl.rid as string).startsWith("gen:")).toBe(true);
    expect(result.edges.length).toBeGreaterThanOrEqual(1);
    for (const edge of result.edges) {
      expect(edge.edgeKind).toBe("gen-from-ontology");
      expect(edge.evidenceKind).toBe("semantic");
    }
    expect(result.uncertainties.some((u) => u.includes("ontology-registry.generated.ts"))).toBe(false);
  });

  test("generated file without Source hint → uncertainty logged", async () => {
    const dir = tmp("pm-prod-cg-nohint-");
    const genDir = path.join(dir, "src/generated");
    fs.mkdirSync(genDir, { recursive: true });
    fs.writeFileSync(
      path.join(genDir, "mystery.generated.ts"),
      `// No header here\nexport const x = 42;\n`,
      "utf8"
    );

    const result = await runProducerCodegen({ projectRoot: dir });

    expect(result.producer).toBe("codegen");
    expect(result.nodes.length).toBe(1);
    expect(result.edges.length).toBe(0);
    expect(result.uncertainties.some((u) => u.includes("mystery.generated.ts"))).toBe(true);
  });
});

describe("producer-runtime", () => {
  test("skill file importing from src/generated → runtime-consumes-gen edge emitted", async () => {
    const dir = tmp("pm-prod-rt-");
    const skillDir = path.join(dir, "skills/pm-test");
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, "handler.ts"),
      `import { someType } from "../../src/generated/ontology-registry.generated";\nexport function run() { return someType; }\n`,
      "utf8"
    );

    const result = await runProducerRuntime({ projectRoot: dir });

    expect(result.producer).toBe("runtime");
    expect(result.nodes.length).toBeGreaterThanOrEqual(1);
    expect(result.edges.length).toBeGreaterThanOrEqual(1);
    for (const edge of result.edges) {
      expect(edge.edgeKind).toBe("runtime-consumes-gen");
      expect(edge.confidence).toBe(1.0);
    }
  });
});

describe("producer-ast-evidence", () => {
  test("all emitted edges carry evidenceKind='ast'", async () => {
    const result = await runProducerAstEvidence({
      projectRoot: "/home/palantirkc/palantir-mini",
    });

    expect(result.producer).toBe("ast-evidence");
    for (const edge of result.edges) {
      expect(edge.evidenceKind).toBe("ast");
    }
    const nonAstEdges = result.edges.filter((e) => e.evidenceKind !== "ast");
    expect(nonAstEdges.length).toBe(0);
  }, 10000);
});
