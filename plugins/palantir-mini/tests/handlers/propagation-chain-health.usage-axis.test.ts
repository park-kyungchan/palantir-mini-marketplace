// palantir-mini — handler test: propagation_chain_health usage-activation axis (B.W4)
// Covers: perLayerActivation shape, usageActivationScore range, overallScore blend,
//         structuralScore preserved, activation with synthetic events, empty events case.

import { test, expect, describe, afterAll } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const tmpDirs: string[] = [];
afterAll(() => {
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function tmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pch-usage-"));
  tmpDirs.push(d);
  return d;
}

function sessionDir(project: string): void {
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
}

function writeEvents(project: string, events: unknown[]): void {
  const dir = path.join(project, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "events.jsonl"),
    events.map((e) => JSON.stringify(e)).join("\n") + "\n",
  );
}

function baseEvent(seq: number, type: string, when?: string): Record<string, unknown> {
  return {
    eventId: `evt-usage-${seq}`,
    when: when ?? new Date().toISOString(), // recent by default
    atopWhich: "abc123",
    throughWhich: { sessionId: "sess-1", toolName: "test", cwd: "/tmp" },
    byWhom: { identity: "test-agent", agentName: "test" },
    sequence: seq,
    type,
    payload: {},
  };
}

// Module-level import: set env before import so it's available at module load.
// The handler reads process.env.PALANTIR_MINI_PROJECT per call, so setting it
// before each test call is sufficient. Module is cached after first import.
async function importHandler(project: string) {
  process.env.PALANTIR_MINI_PROJECT = project;
  sessionDir(project);
  const mod = await import("../../bridge/handlers/propagation-chain-health");
  return mod.default;
}

describe("propagation_chain_health — B.W4 usage-activation axis", () => {
  test("result includes B.W4 extension fields", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    // B.W4 required fields
    expect(result).toHaveProperty("structuralScore");
    expect(result).toHaveProperty("usageActivationScore");
    expect(result).toHaveProperty("perLayerActivation");
    expect(result).toHaveProperty("overallScore");
  });

  test("perLayerActivation has all 6 propagation layers", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    const layers = ["research", "schema", "shared-core", "project-ontology", "contracts", "runtime"];
    for (const layer of layers) {
      expect(result.perLayerActivation).toHaveProperty(layer);
      const v = result.perLayerActivation[layer as keyof typeof result.perLayerActivation];
      expect(typeof v).toBe("number");
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  test("usageActivationScore is in [0, 1]", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result.usageActivationScore).toBeGreaterThanOrEqual(0);
    expect(result.usageActivationScore).toBeLessThanOrEqual(1);
  });

  test("overallScore is in [0, 1]", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });

  test("overallScore = structural*0.5 + usageActivation*0.5 (within float tolerance)", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    const expected = result.structuralScore * 0.5 + result.usageActivationScore * 0.5;
    expect(Math.abs(result.overallScore - expected)).toBeLessThan(1e-9);
  });

  test("score field (back-compat) equals overallScore", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    // PropagationHealthPayload.score is now set to overallScore for back-compat
    expect(result.score).toBe(result.overallScore);
  });

  test("empty events: usageActivationScore = 0 (no invocations)", async () => {
    const project = tmp();
    sessionDir(project);
    // Write empty events file
    writeEvents(project, []);
    const handler = await importHandler(project);
    const result = await handler({ project });

    // With no events, activation should be 0
    expect(result.usageActivationScore).toBe(0);
  });

  test("runtime events in 30d window: runtime layer activation > 0", async () => {
    const project = tmp();
    // Write recent runtime-layer events (edit_committed prefix)
    const recentWhen = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    writeEvents(project, [
      baseEvent(1, "edit_committed", recentWhen),
      baseEvent(2, "edit_committed", recentWhen),
      baseEvent(3, "session_started", recentWhen),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result.perLayerActivation.runtime).toBeGreaterThan(0);
  });

  test("old events outside 30d window: not counted toward activation", async () => {
    const project = tmp();
    // Write old runtime-layer events (> 30d ago)
    const oldWhen = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(); // 31d ago
    writeEvents(project, [
      baseEvent(1, "edit_committed", oldWhen),
      baseEvent(2, "edit_committed", oldWhen),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project });

    // Old events should not contribute to the 30d window count
    expect(result.perLayerActivation.runtime).toBe(0);
  });

  test("contract events activate contracts layer", async () => {
    const project = tmp();
    const recentWhen = new Date(Date.now() - 1000 * 60).toISOString(); // 1 min ago
    writeEvents(project, [
      baseEvent(1, "sprint_contract_bound", recentWhen),
      baseEvent(2, "commit_edits", recentWhen),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result.perLayerActivation.contracts).toBeGreaterThan(0);
  });

  test("semantic_change_plan events activate project-ontology layer", async () => {
    const project = tmp();
    const recentWhen = new Date(Date.now() - 1000 * 60).toISOString();
    writeEvents(project, [
      baseEvent(1, "semantic_change_plan_emitted", recentWhen),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result.perLayerActivation["project-ontology"]).toBeGreaterThan(0);
  });

  test("activation saturates at 1.0 (does not exceed baseline)", async () => {
    const project = tmp();
    const recentWhen = new Date(Date.now() - 1000 * 60).toISOString();
    // Write many more runtime events than the baseline (200)
    const manyEvents = Array.from({ length: 250 }, (_, i) =>
      baseEvent(i + 1, "edit_committed", recentWhen),
    );
    writeEvents(project, manyEvents);
    const handler = await importHandler(project);
    const result = await handler({ project });

    // runtime activation should be capped at 1.0
    expect(result.perLayerActivation.runtime).toBeLessThanOrEqual(1.0);
  });

  test("verdict remains in valid set with usage-activation combined score", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(["healthy", "drift-suspected", "broken"]).toContain(result.verdict);
  });

  test("structuralScore is preserved independently", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    // structuralScore must be 0..1 and independent of usage
    expect(result.structuralScore).toBeGreaterThanOrEqual(0);
    expect(result.structuralScore).toBeLessThanOrEqual(1);
  });
});
