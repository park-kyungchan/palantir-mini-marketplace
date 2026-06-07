/**
 * palantir-mini v3.7.0 — Session 4 Slice 1 (Wave 3 VR-1) edge tests (main, A.5 split)
 * Coverage: producer-verification eval-covers + doc-references + mon-scope edges.
 * Decomposed in v3.7.0 A.5: semantic-query end-to-end → -e2e.test.ts.
 */

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runProducerVerification } from "../../../lib/semantic-graph/producer-verification";

function tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFileEnsuring(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, "utf8");
}

describe("producer-verification — eval-covers edges", () => {
  test("eval-rubric section mentioning explicit ontology: RID → eval-covers edge to ontology node", async () => {
    const dir = tmp("pm-vr1-eval-ontology-");
    writeFileEnsuring(
      path.join(dir, ".palantir-mini/harness/eval-rubric.md"),
      `# Sprint Rubric\n\n## C1 — Student Coverage\n\nVerify that ontology:data.Student carries the required derived properties.\n`,
    );

    const result = await runProducerVerification({ projectRoot: dir });

    const evalCovers = result.edges.filter((e) => e.edgeKind === "eval-covers");
    expect(evalCovers.length).toBeGreaterThanOrEqual(1);
    const targetRids = evalCovers.map((e) => e.toRid as string);
    expect(targetRids).toContain("ontology:data.Student");
    for (const edge of evalCovers) {
      expect(edge.evidenceKind).toBe("semantic");
      expect(edge.evidence?.length ?? 0).toBeGreaterThan(0);
      expect(edge.producer).toBe("verification");
    }
  });

  test("eval-rubric section with backticked file path → eval-covers edge to file node", async () => {
    const dir = tmp("pm-vr1-eval-backtick-");
    writeFileEnsuring(
      path.join(dir, ".palantir-mini/harness/eval-rubric.md"),
      "## C2 — Handler Latency\n\nAssert that \`bridge/handlers/emit-event.ts\` records durationMs.\n",
    );

    const result = await runProducerVerification({ projectRoot: dir });

    const evalCovers = result.edges.filter((e) => e.edgeKind === "eval-covers");
    expect(evalCovers.length).toBeGreaterThanOrEqual(1);
    expect(evalCovers.map((e) => e.toRid as string)).toContain("file:bridge/handlers/emit-event.ts");
  });

  test("eval-rubric without file/RID mentions → 0 eval-covers edges (nodes still emitted)", async () => {
    const dir = tmp("pm-vr1-eval-empty-");
    writeFileEnsuring(
      path.join(dir, ".palantir-mini/harness/eval-rubric.md"),
      "## C3 — Vibes Check\n\nDoes the app feel polished overall? Is the UX opinionated?\n",
    );

    const result = await runProducerVerification({ projectRoot: dir });

    const evalCovers = result.edges.filter((e) => e.edgeKind === "eval-covers");
    expect(evalCovers.length).toBe(0);
    const evalNodes = result.nodes.filter((n) => (n.decl.rid as string).startsWith("eval:"));
    expect(evalNodes.length).toBeGreaterThanOrEqual(1);
  });
});

describe("producer-verification — doc-references edges", () => {
  test("markdown link to a source file → doc-references edge", async () => {
    const dir = tmp("pm-vr1-doc-link-");
    writeFileEnsuring(
      path.join(dir, "docs/ARCHITECTURE.md"),
      `# Architecture\n\nThe emit function lives in [emit-event](bridge/handlers/emit-event.ts).\n`,
    );

    const result = await runProducerVerification({ projectRoot: dir });

    const docRefs = result.edges.filter((e) => e.edgeKind === "doc-references");
    expect(docRefs.length).toBeGreaterThanOrEqual(1);
    expect(docRefs.map((e) => e.toRid as string)).toContain("file:bridge/handlers/emit-event.ts");
    for (const e of docRefs) expect(e.confidence).toBeCloseTo(0.8, 5);
  });

  test("doc with backticked file path reference → doc-references edge", async () => {
    const dir = tmp("pm-vr1-doc-backtick-");
    writeFileEnsuring(
      path.join(dir, "docs/ONBOARDING.md"),
      "# Onboarding\n\nStart by reading \`lib/semantic-graph/types.ts\` to understand the shapes.\n",
    );

    const result = await runProducerVerification({ projectRoot: dir });

    const docRefs = result.edges.filter((e) => e.edgeKind === "doc-references");
    expect(docRefs.length).toBeGreaterThanOrEqual(1);
    expect(docRefs.map((e) => e.toRid as string)).toContain("file:lib/semantic-graph/types.ts");
  });

  test("doc with explicit runtime:* mention → doc-references edge to runtime node", async () => {
    const dir = tmp("pm-vr1-doc-runtime-");
    writeFileEnsuring(
      path.join(dir, "docs/FLOWS.md"),
      "# Flows\n\nThe dispatcher is at runtime:skills/pm-init/SKILL.md — see Phase 2.\n",
    );

    const result = await runProducerVerification({ projectRoot: dir });

    const docRefs = result.edges.filter((e) => e.edgeKind === "doc-references");
    const targets = docRefs.map((e) => e.toRid as string);
    expect(targets).toContain("runtime:skills/pm-init/SKILL.md");
  });

  test("doc referencing itself does not create a self-edge", async () => {
    const dir = tmp("pm-vr1-doc-self-");
    writeFileEnsuring(
      path.join(dir, "docs/README.md"),
      "# Readme\n\nSee also [itself](docs/README.md) for recursion.\n",
    );

    const result = await runProducerVerification({ projectRoot: dir });

    const selfEdges = result.edges.filter((e) => (e.fromRid as string) === (e.toRid as string));
    expect(selfEdges.length).toBe(0);
  });
});

// sprint-063 C18: mon-scope edge tests removed — monitors sunset.
// monitors/ directory deleted; no mon:* nodes or mon-scope edges are emitted.
// Verified by wave3-mvp.test.ts "empty project" test (monNodes.length === 0).
