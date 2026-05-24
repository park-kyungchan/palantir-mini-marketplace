/**
 * palantir-mini — Wave 3 MVP test suite
 * Task #29 (W3.6)
 *
 * Covers: producer-verification (3 tests) + producer-lineage (2 tests).
 *
 * Rule 13 multi-file exception: consolidated Wave 3 MVP suite alongside
 * tests/bridge/handlers/diff-semantic-impact.test.ts and
 * tests/bridge/handlers/semantic-drift-audit.test.ts.
 */

import { test, expect, describe } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { runProducerVerification } from "../../../lib/semantic-graph/producer-verification";
import { runProducerLineage } from "../../../lib/semantic-graph/producer-lineage";

// ── Temp-project helpers ───────────────────────────────────────────────────────

function tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ─────────────────────────────────────────────────────────────────────────────
// producer-verification
// ─────────────────────────────────────────────────────────────────────────────

describe("producer-verification", () => {
  test("empty project → uncertainties for missing eval-rubric, doc dirs; no mon:* nodes (sprint-063 C18 sunset)", async () => {
    const dir = tmp("pm-prod-verif-empty-");
    const result = await runProducerVerification({ projectRoot: dir });

    expect(result.producer).toBe("verification");
    // sprint-063 C18: monitors sunset — no mon:* nodes emitted anymore
    const monNodes = result.nodes.filter((n) => (n.decl.rid as string).startsWith("mon:"));
    expect(monNodes.length).toBe(0);
    // No eval:* nodes from an empty project
    const evalNodes = result.nodes.filter((n) => (n.decl.rid as string).startsWith("eval:"));
    expect(evalNodes.length).toBe(0);
    // Must report uncertainty for missing eval-rubric.md
    expect(result.uncertainties.some((u) => u.includes("eval-rubric.md"))).toBe(true);
  });

  test("eval-rubric.md with ## headings → eval:* nodes emitted", async () => {
    const dir = tmp("pm-prod-verif-rubric-");
    const harnessDir = path.join(dir, ".palantir-mini/harness");
    fs.mkdirSync(harnessDir, { recursive: true });
    fs.writeFileSync(
      path.join(harnessDir, "eval-rubric.md"),
      `# Sprint 1 Rubric\n\n## C1 — Ontology Coverage\n\nCheck that all primitives are registered.\n\n## C2 — Runtime Binding\n\nVerify skill wiring.\n`,
      "utf8"
    );

    const result = await runProducerVerification({ projectRoot: dir });

    expect(result.producer).toBe("verification");
    // Must have at least 2 eval:* nodes (one per ## heading)
    const evalNodes = result.nodes.filter((n) => (n.decl.rid as string).startsWith("eval:"));
    expect(evalNodes.length).toBeGreaterThanOrEqual(2);
    // All eval nodes must be discoveredBy "verification"
    for (const node of evalNodes) {
      expect(node.discoveredBy).toContain("verification");
    }
    // Wave 3 MVP: no edges
    expect(result.edges.length).toBe(0);
  });

  test("docs/ directory with .md files → doc:* nodes emitted", async () => {
    const dir = tmp("pm-prod-verif-docs-");
    const docsDir = path.join(dir, "docs");
    fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, "ARCHITECTURE.md"), `# Architecture\n\nDetails here.\n`, "utf8");
    fs.writeFileSync(path.join(docsDir, "ONBOARDING.md"), `# Onboarding\n\nWelcome.\n`, "utf8");

    const result = await runProducerVerification({ projectRoot: dir });

    expect(result.producer).toBe("verification");
    // Must have at least 2 doc:* nodes from docs/
    const docNodes = result.nodes.filter((n) => (n.decl.rid as string).startsWith("doc:"));
    expect(docNodes.length).toBeGreaterThanOrEqual(2);
    // Every doc node must be discoveredBy "verification"
    for (const node of docNodes) {
      expect(node.discoveredBy).toContain("verification");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// producer-lineage
// ─────────────────────────────────────────────────────────────────────────────

describe("producer-lineage", () => {
  test("no events.jsonl → uncertainties, 0 nodes, 0 edges", async () => {
    const dir = tmp("pm-prod-lineage-empty-");
    const result = await runProducerLineage({ projectRoot: dir });

    expect(result.producer).toBe("lineage");
    expect(result.nodes.length).toBe(0);
    expect(result.edges.length).toBe(0);
    // Must report uncertainty for missing or empty events file
    expect(result.uncertainties.length).toBeGreaterThan(0);
  });

  test("events.jsonl with repeated co-change pairs → lineage:cochange.* nodes + lineage-cochange edges", async () => {
    const dir = tmp("pm-prod-lineage-cochange-");
    const sessionDir = path.join(dir, ".palantir-mini/session");
    fs.mkdirSync(sessionDir, { recursive: true });

    // MIN_COCHANGE=3: the same file pair must appear in ≥3 distinct sessions.
    // Write one edit_committed event per sessionId (3 different sessions), each
    // touching the same two files. Use recent timestamps (within 14-day window).
    const now = new Date();
    const events: string[] = [];
    for (let i = 0; i < 3; i++) {
      const when = new Date(now.getTime() - i * 3_600_000).toISOString(); // 1h apart
      events.push(JSON.stringify({
        type: "edit_committed",
        when,
        payload: {
          sessionId: `test-session-${i}`,
          files: ["lib/alpha.ts", "lib/beta.ts"],
        },
      }));
    }
    fs.writeFileSync(path.join(sessionDir, "events.jsonl"), events.join("\n") + "\n", "utf8");

    const result = await runProducerLineage({ projectRoot: dir });

    expect(result.producer).toBe("lineage");
    // Should have 2 lineage:cochange.* nodes (one per file in the pair)
    expect(result.nodes.length).toBe(2);
    const rids = result.nodes.map((n) => n.decl.rid as string);
    expect(rids.some((r) => r.startsWith("lineage:"))).toBe(true);

    // Should have 1 lineage-cochange edge
    expect(result.edges.length).toBe(1);
    expect(result.edges[0]!.edgeKind).toBe("lineage-cochange");
    expect(result.edges[0]!.evidenceKind).toBe("semantic");
    expect(result.edges[0]!.confidence).toBeGreaterThan(0);
    expect(result.edges[0]!.confidence).toBeLessThanOrEqual(1.0);
  });
});
