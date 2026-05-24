// Sprint-062 W0-gamma — propagation_audit_backward audit test
// Handler: bridge/handlers/propagation-audit-backward.ts
// Coverage: INVALID (missing project/seedEventId), VALID-A (no seed found → empty nodes),
//           VALID-B (seed found + backward walk), LINEAGE

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import propagationAuditBackward from "../../../bridge/handlers/propagation-audit-backward";

// ── Helpers ────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-prop-backward-"));
  tmpDirs.push(dir);
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  return dir;
}

function eventsPathFor(project: string): string {
  const override = process.env["PALANTIR_MINI_EVENTS_FILE"];
  if (override && path.isAbsolute(override)) return override;
  return path.join(project, ".palantir-mini", "session", "events.jsonl");
}

function writeEvents(project: string, lines: Array<Record<string, unknown>>): string {
  // Always write to wherever the handler will read from (respects env override)
  const p = eventsPathFor(project);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, lines.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf8");
  return p;
}

function makeEvent(
  overrides: Partial<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    eventId: `evt-${Math.random().toString(36).slice(2, 8)}`,
    type: "edit_committed",
    when: new Date().toISOString(),
    sequence: Math.floor(Math.random() * 10000),
    atopWhich: "92d9ff32c",
    throughWhich: { sessionId: "sess-1", toolName: "test", cwd: "/tmp" },
    byWhom: { identity: "claude-code", agentName: "impl-test" },
    withWhat: { reasoning: "test event for backward audit" },
    payload: {},
    ...overrides,
  };
}

beforeEach(() => {
  savedEnv["PALANTIR_MINI_EVENTS_FILE"] = process.env["PALANTIR_MINI_EVENTS_FILE"];
  savedEnv["PALANTIR_MINI_EVENTS_FILE_FORCE"] = process.env["PALANTIR_MINI_EVENTS_FILE_FORCE"];
  const evFile = path.join(os.tmpdir(), `pab-events-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`);
  process.env["PALANTIR_MINI_EVENTS_FILE"] = evFile;
  process.env["PALANTIR_MINI_EVENTS_FILE_FORCE"] = "1";
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const d of tmpDirs.splice(0)) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* noop */ }
  }
});

// ── INVALID ────────────────────────────────────────────────────────────────

describe("propagation_audit_backward — INVALID", () => {
  test("INVALID-A: missing project throws actionable error", async () => {
    await expect(
      propagationAuditBackward({ seedEventId: "evt-123" }),
    ).rejects.toThrow(/project/);
  });

  test("INVALID-B: missing seedEventId throws actionable error", async () => {
    await expect(
      propagationAuditBackward({ project: "/tmp/some-project" }),
    ).rejects.toThrow(/seedEventId/);
  });

  test("INVALID-C: non-string project throws", async () => {
    await expect(
      propagationAuditBackward({ project: 42, seedEventId: "evt-123" }),
    ).rejects.toThrow(/project/);
  });
});

// ── VALID ──────────────────────────────────────────────────────────────────

describe("propagation_audit_backward — VALID", () => {
  test("VALID-A: bogus seedEventId (not in events.jsonl) → empty nodes, no violation", async () => {
    const project = makeProject();
    // Write some events but not the seed
    writeEvents(project, [makeEvent({ eventId: "evt-other-001", sequence: 1 })]);

    const result = await propagationAuditBackward({
      project,
      seedEventId: "evt-bogus-nonexistent",
      maxDepth: 5,
    });

    expect(result.seedEventId).toBe("evt-bogus-nonexistent");
    expect(result.lineageNodes).toHaveLength(0);
    expect(result.firstViolationStep).toBeNull();
    expect(typeof result.replayId).toBe("string");
    expect(typeof result.replayedAt).toBe("string");
  });

  test("VALID-B: seed event found → at least 1 node in lineageNodes", async () => {
    const project = makeProject();
    const seedId = "evt-seed-001";
    writeEvents(project, [
      makeEvent({ eventId: seedId, sequence: 10, type: "edit_committed" }),
    ]);

    const result = await propagationAuditBackward({
      project,
      seedEventId: seedId,
      maxDepth: 3,
    });

    expect(result.seedEventId).toBe(seedId);
    expect(result.lineageNodes.length).toBeGreaterThanOrEqual(1);
    // First node should be the seed at depth 0
    expect(result.lineageNodes[0]!.propagationDepth).toBe(0);
  });

  test("VALID-C: violation event (payload.verdict=fail) detected → firstViolationStep non-null", async () => {
    const project = makeProject();
    const violationId = "evt-violation-001";
    writeEvents(project, [
      makeEvent({
        eventId: violationId,
        sequence: 5,
        type: "validation_phase_completed",
        propagationDepth: 5, // runtime step
        payload: { verdict: "fail", errorClass: "some_error" },
      }),
    ]);

    const result = await propagationAuditBackward({
      project,
      seedEventId: violationId,
      maxDepth: 2,
    });

    // payload.errorClass is set → isViolationRow should detect it
    expect(result.lineageNodes.length).toBeGreaterThanOrEqual(1);
    // propagationDepth=5 → "runtime" step classification
    expect(result.firstViolationStep).toBe("runtime");
  });

  test("VALID-D: tracedDimensions returned matches filterDimensions input", async () => {
    const project = makeProject();
    const seedId = "evt-dim-001";
    writeEvents(project, [makeEvent({ eventId: seedId, sequence: 1 })]);

    const result = await propagationAuditBackward({
      project,
      seedEventId: seedId,
      filterDimensions: ["byWhom", "atopWhich"],
    });

    expect(result.tracedDimensions).toContain("byWhom");
    expect(result.tracedDimensions).toContain("atopWhich");
  });

  test("VALID-E: empty events.jsonl → empty nodes, no firstViolationStep", async () => {
    const project = makeProject();
    // No events.jsonl at all
    const result = await propagationAuditBackward({
      project,
      seedEventId: "evt-any",
      maxDepth: 5,
    });
    expect(result.lineageNodes).toHaveLength(0);
    expect(result.firstViolationStep).toBeNull();
  });
});

// ── LINEAGE ────────────────────────────────────────────────────────────────

describe("propagation_audit_backward — LINEAGE", () => {
  test("LINEAGE: always emits validation_phase_completed event", async () => {
    const project = makeProject();
    const evFile = process.env["PALANTIR_MINI_EVENTS_FILE"]!;

    await propagationAuditBackward({
      project,
      seedEventId: "evt-lineage-test",
      maxDepth: 3,
    });

    expect(fs.existsSync(evFile)).toBe(true);
    const lines = fs.readFileSync(evFile, "utf8").trim().split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l) as { type: string; payload: Record<string, unknown> });
    const phaseEvents = events.filter((e) => e.type === "validation_phase_completed");
    expect(phaseEvents.length).toBeGreaterThanOrEqual(1);

    const backwardEvent = phaseEvents.find(
      (e) => e.payload.errorClass === "propagation_audit_backward",
    );
    expect(backwardEvent).toBeDefined();
  });

  test("LINEAGE: violation triggers additional phase_completed refinement event", async () => {
    const project = makeProject();
    const violationId = "evt-viol-lineage";
    writeEvents(project, [
      makeEvent({
        eventId: violationId,
        sequence: 1,
        type: "validation_phase_completed",
        propagationDepth: 4, // contracts step
        payload: { verdict: "fail", errorClass: "test_failure" },
      }),
    ]);
    const evFile = process.env["PALANTIR_MINI_EVENTS_FILE"]!;

    const result = await propagationAuditBackward({
      project,
      seedEventId: violationId,
      maxDepth: 2,
    });

    expect(result.firstViolationStep).not.toBeNull();

    const lines = fs.readFileSync(evFile, "utf8").trim().split("\n").filter(Boolean);
    const events = lines.map((l) => JSON.parse(l) as { type: string; payload: Record<string, unknown> });
    // Should have a phase_completed with backprop_violation_refinement_proposed tag
    const refinementEvents = events.filter(
      (e) =>
        e.type === "phase_completed" &&
        e.payload.phaseTag === "backprop_violation_refinement_proposed",
    );
    expect(refinementEvents.length).toBeGreaterThanOrEqual(1);
  });
});
