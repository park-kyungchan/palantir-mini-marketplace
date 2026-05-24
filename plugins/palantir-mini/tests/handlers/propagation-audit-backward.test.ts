// palantir-mini v4.0.0 — handler test: propagation_audit_backward
// Covers: missing required args, seed not found, happy backward walk,
//         violation classification, propagationDepth field, event emission.

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
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "pab-"));
  tmpDirs.push(d);
  return d;
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
    atopWhich: "abc123sha",
    throughWhich: { sessionId: "sess-1", toolName: "test-tool", cwd: "/tmp/proj" },
    byWhom: { identity: "test-agent", agentName: "hook-builder" },
    sequence: seq,
    ...overrides,
  };
}

async function importHandler(project: string) {
  process.env.PALANTIR_MINI_PROJECT = project;
  // Ensure emit() can write
  fs.mkdirSync(path.join(project, ".palantir-mini", "session"), { recursive: true });
  const mod = await import("../../bridge/handlers/propagation-audit-backward");
  return mod.default;
}

describe("propagation_audit_backward", () => {
  test("error: missing project arg", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    await expect(handler({ seedEventId: "evt-1" })).rejects.toThrow("project");
  });

  test("error: missing seedEventId arg", async () => {
    const project = tmp();
    const handler = await importHandler(project);
    await expect(handler({ project })).rejects.toThrow("seedEventId");
  });

  test("seed not found: returns empty lineageNodes, no firstViolationStep", async () => {
    const project = tmp();
    writeEvents(project, [
      baseEvent(1, { type: "session_started", payload: {} }),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project, seedEventId: "evt-nonexistent" });

    expect(result.lineageNodes).toHaveLength(0);
    expect(result.firstViolationStep).toBeNull();
    expect(result.replayId).toBeTypeOf("string");
    expect(result.replayedAt).toBeTypeOf("string");
  });

  test("happy: seed found, single node walk", async () => {
    const project = tmp();
    writeEvents(project, [
      baseEvent(1, { type: "session_started", payload: {} }),
      baseEvent(2, { type: "edit_committed", payload: {} }),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project, seedEventId: "evt-2", maxDepth: 3 });

    expect(result.seedEventId).toBe("evt-2");
    expect(result.lineageNodes.length).toBeGreaterThan(0);
    // Seed node is always depth 0
    expect(result.lineageNodes[0]!.propagationDepth).toBe(0);
    expect(result.lineageNodes[0]!.eventId).toBe("evt-2");
  });

  test("backward walk: predecessor included at depth+1", async () => {
    const project = tmp();
    writeEvents(project, [
      baseEvent(1, { type: "edit_proposed", payload: {} }),
      baseEvent(2, { type: "edit_committed", payload: {} }),
      baseEvent(3, { type: "edit_committed", payload: {} }),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project, seedEventId: "evt-3", maxDepth: 5 });

    expect(result.lineageNodes.length).toBeGreaterThanOrEqual(2);
    const depths = result.lineageNodes.map((n) => n.propagationDepth);
    expect(depths[0]).toBe(0);
    expect(depths[1]).toBe(1);
  });

  test("violation classification: drift_detected with driftDetected=true → firstViolationStep set", async () => {
    const project = tmp();
    writeEvents(project, [
      baseEvent(1, {
        type: "doc_drift_detected",
        payload: { driftDetected: true, driftScore: 0.8 },
        propagationDepth: 3, // project-ontology
      }),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project, seedEventId: "evt-1", maxDepth: 2 });

    expect(result.firstViolationStep).toBe("project-ontology");
  });

  test("validation_phase_completed with errorClass → firstViolationStep=contracts", async () => {
    const project = tmp();
    writeEvents(project, [
      baseEvent(1, {
        type: "validation_phase_completed",
        payload: { errorClass: "dry_run_skipped_validation_errors", verdict: "fail" },
        propagationDepth: 4, // contracts
      }),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project, seedEventId: "evt-1", maxDepth: 2 });

    expect(result.firstViolationStep).toBe("contracts");
  });

  test("propagationDepth field used for step classification", async () => {
    const project = tmp();
    writeEvents(project, [
      baseEvent(1, {
        type: "research_citation_validated",
        payload: { verdict: "fail", violationCount: 2 },
        propagationDepth: 0, // research
      }),
    ]);
    const handler = await importHandler(project);
    const result = await handler({ project, seedEventId: "evt-1", maxDepth: 2 });

    expect(result.firstViolationStep).toBe("research");
  });

  test("maxDepth respected: does not walk deeper than maxDepth", async () => {
    const project = tmp();
    // Build a chain of 10 events by the same agent
    const chain = Array.from({ length: 10 }, (_, i) =>
      baseEvent(i + 1, { type: "edit_committed", payload: {} }),
    );
    writeEvents(project, chain);
    const handler = await importHandler(project);
    const result = await handler({ project, seedEventId: "evt-10", maxDepth: 3 });

    const maxDepthSeen = Math.max(...result.lineageNodes.map((n) => n.propagationDepth));
    expect(maxDepthSeen).toBeLessThanOrEqual(3);
  });

  test("tracedDimensions matches input filterDimensions", async () => {
    const project = tmp();
    writeEvents(project, [baseEvent(1, { type: "session_started", payload: {} })]);
    const handler = await importHandler(project);
    const result = await handler({
      project,
      seedEventId: "evt-1",
      filterDimensions: ["byWhom", "atopWhich"],
    });

    expect(result.tracedDimensions).toEqual(["byWhom", "atopWhich"]);
  });

  test("result shape: all required PropagationReplayPayload fields present", async () => {
    const project = tmp();
    writeEvents(project, [baseEvent(1, { type: "session_started", payload: {} })]);
    const handler = await importHandler(project);
    const result = await handler({ project, seedEventId: "evt-1" });

    expect(result).toHaveProperty("replayId");
    expect(result).toHaveProperty("seedEventId");
    expect(result).toHaveProperty("tracedDimensions");
    expect(result).toHaveProperty("firstViolationStep");
    expect(result).toHaveProperty("lineageNodes");
    expect(result).toHaveProperty("replayedAt");
  });

  test("event emission: emits propagation_audit_backward_completed", async () => {
    const project = tmp();
    writeEvents(project, [baseEvent(1, { type: "session_started", payload: {} })]);
    const handler = await importHandler(project);
    await handler({ project, seedEventId: "evt-1" });

    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
    const lines = fs.readFileSync(eventsPath, "utf8").split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l) as { type: string; payload?: { errorClass?: string } });
    expect(events.some((e) => e.type === "validation_phase_completed" && e.payload?.errorClass === "propagation_audit_backward")).toBe(true);
  });
});
