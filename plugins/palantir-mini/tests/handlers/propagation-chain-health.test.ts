// palantir-mini v4.0.0 — handler test: propagation_chain_health
// Covers: happy path, advisory vs strict mode, score range, verdict buckets,
//         drift signals, event emission.

import { test, expect, describe, afterAll } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const originalProjectEnv = process.env.PALANTIR_MINI_PROJECT;
const tmpDirs: string[] = [];
afterAll(() => {
  // g10 fix follow-through: PALANTIR_MINI_PROJECT is now the highest-priority
  // root override (resolveEmitRoot()), so leaving it set to a (now-deleted)
  // tmp dir would hijack every other test file's emit() calls in the same
  // bun test process.
  if (originalProjectEnv === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = originalProjectEnv;
  for (const d of tmpDirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function tmp(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pch-"));
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

function baseEvent(seq: number, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    eventId: `evt-${seq}`,
    when: `2026-05-01T00:0${seq}:00.000Z`,
    atopWhich: "abc123",
    throughWhich: { sessionId: "sess-1", toolName: "test", cwd: "/tmp" },
    byWhom: { identity: "test-agent", agentName: "test" },
    sequence: seq,
    ...overrides,
  };
}

async function importHandler(project: string) {
  process.env.PALANTIR_MINI_PROJECT = project;
  sessionDir(project);
  const mod = await import("../../bridge/handlers/propagation-chain-health");
  return mod.default;
}

describe("propagation_chain_health", () => {
  test("happy: returns valid PropagationHealthPayload shape", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("perStepHealth");
    expect(result).toHaveProperty("driftSignals");
    expect(result).toHaveProperty("verdict");
    expect(result).toHaveProperty("measuredAt");
  });

  test("score is in [0, 1] range", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  test("verdict is one of the three valid values", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(["healthy", "drift-suspected", "broken"]).toContain(result.verdict);
  });

  test("perStepHealth has entries for all 6 propagation steps", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    const expected = ["research", "schema", "shared-core", "project-ontology", "contracts", "runtime"];
    for (const step of expected) {
      expect(result.perStepHealth).toHaveProperty(step);
      const score = result.perStepHealth[step as keyof typeof result.perStepHealth];
      expect(typeof score).toBe("number");
      expect(score!).toBeGreaterThanOrEqual(0);
      expect(score!).toBeLessThanOrEqual(1);
    }
  });

  test("driftSignals is an array (may be empty)", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(Array.isArray(result.driftSignals)).toBe(true);
  });

  test("advisory mode (default): does not throw even on low score", async () => {
    const project = tmp();
    // Introduce a malformed package.json to cause runtime step failure
    fs.writeFileSync(path.join(project, "package.json"), "{ bad json }}}");
    const handler = await importHandler(project);
    // Should NOT throw in advisory mode
    const result = await handler({ project, mode: "advisory" });
    expect(["drift-suspected", "broken", "healthy"]).toContain(result.verdict);
  });

  test("strict mode: throws when verdict=broken", async () => {
    const project = tmp();
    // Malformed package.json causes runtime fail; score may go below strict threshold
    fs.writeFileSync(path.join(project, "package.json"), "{ bad json }}}");
    const handler = await importHandler(project);
    // Only throws if score < 0.7 in strict mode — test that handler handles strict correctly
    try {
      const result = await handler({ project, mode: "strict" });
      // If it doesn't throw, verdict must not be broken
      expect(result.verdict).not.toBe("broken");
    } catch (e) {
      expect((e as Error).message).toContain("chain BROKEN");
    }
  });

  test("no violation events: backward audit skipped gracefully", async () => {
    const project = tmp();
    // Write events with no violations
    writeEvents(project, [
      baseEvent(1, { type: "session_started", payload: {} }),
      baseEvent(2, { type: "edit_committed", payload: {} }),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result).toHaveProperty("verdict");
  });

  test("violation events present: backward audit runs and may add drift signals", async () => {
    const project = tmp();
    writeEvents(project, [
      baseEvent(1, { type: "session_started", payload: {} }),
      baseEvent(2, {
        type: "doc_drift_detected",
        payload: { driftDetected: true },
        propagationDepth: 3,
        eventId: "evt-violation-1",
      }),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project });

    // Handler should complete without throwing
    expect(result).toHaveProperty("score");
    expect(Array.isArray(result.driftSignals)).toBe(true);
  });

  test("event emission: emits propagation_chain_health_assessed", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    await handler({ project });

    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l) as { type: string; payload?: { errorClass?: string } });
    expect(events.some((e) => e.type === "validation_phase_completed" && (
      e.payload?.errorClass === "propagation_chain_healthy" ||
      e.payload?.errorClass === "propagation_chain_drift_suspected" ||
      e.payload?.errorClass === "propagation_chain_broken"
    ))).toBe(true);
  });

  test("measuredAt is a valid ISO 8601 string", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    const result = await handler({ project });

    expect(() => new Date(result.measuredAt)).not.toThrow();
    expect(new Date(result.measuredAt).toISOString()).toBe(result.measuredAt);
  });
});
