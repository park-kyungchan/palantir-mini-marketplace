// palantir-mini v3.5.0 — emit-event handler tests (C1)
// Coverage: validation throws (project + envelope) + happy path returns sequence + appended event.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import emitEvent, { validateReasoningPresence } from "../../../bridge/handlers/emit-event";

const tmpDirs: string[] = [];

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "emit-event-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("emit_event handler", () => {
  test("validation — missing project throws", async () => {
    await expect(emitEvent({ envelope: {} })).rejects.toThrow(/project/);
  });

  test("validation — missing envelope throws", async () => {
    await expect(emitEvent({ project: "/tmp/x" })).rejects.toThrow(/envelope/);
  });

  test("validation — non-string project throws", async () => {
    await expect(emitEvent({ project: 123, envelope: {} } as unknown)).rejects.toThrow(
      /project/,
    );
  });

  test("happy path — appends envelope, returns eventId/sequence/eventsPath, file written", async () => {
    const project = makeTmpProject();
    const envelope = {
      eventId: "evt-test-001",
      when: "2026-04-26T00:00:00.000Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "sess-1", toolName: "test", cwd: project },
      byWhom: { identity: "claude-code" as const },
      type: "test_event" as never,
      payload: { hello: "world" } as never,
    };

    const result = await emitEvent({ project, envelope });

    expect(result.eventId).toBe("evt-test-001");
    expect(typeof result.sequence).toBe("number");
    expect(result.sequence).toBeGreaterThan(0);
    expect(result.eventsPath).toBe(
      path.join(project, ".palantir-mini", "session", "events.jsonl"),
    );

    expect(fs.existsSync(result.eventsPath)).toBe(true);
    const line = fs.readFileSync(result.eventsPath, "utf8").trim();
    const parsed = JSON.parse(line) as { eventId: string; sequence: number };
    expect(parsed.eventId).toBe("evt-test-001");
    expect(parsed.sequence).toBe(result.sequence);
  });

  test("F1 — direct emit of reserved provenance type edit_committed is rejected (fail-closed)", async () => {
    const project = makeTmpProject();
    const envelope = {
      eventId: "evt-forged-001",
      when: "2026-04-26T00:00:00.000Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "sess-1", toolName: "test", cwd: project },
      byWhom: { identity: "claude-code" as const },
      type: "edit_committed" as never,
      payload: {
        actionTypeRid: "pm.self.ontology/action-type/forged",
        appliedEdits: [
          { kind: "object", rid: "rid.evil", properties: { primitiveKind: "ActionType", plainName: "Evil" } },
        ],
        submissionCriteriaPassed: [],
      } as never,
    };

    await expect(emitEvent({ project, envelope })).rejects.toThrow(/reserved commit-provenance type/);
    // Nothing was appended — the events file must not exist (or be empty).
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
    const written = fs.existsSync(eventsPath) ? fs.readFileSync(eventsPath, "utf8").trim() : "";
    expect(written).toBe("");
  });

  test("F1 — direct emit of submission_criteria_failed is also rejected", async () => {
    const project = makeTmpProject();
    const envelope = {
      eventId: "evt-forged-002",
      when: "2026-04-26T00:00:00.000Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "sess-1", toolName: "test", cwd: project },
      byWhom: { identity: "claude-code" as const },
      type: "submission_criteria_failed" as never,
      payload: { actionTypeRid: "pm.self.ontology/action-type/forged", failedConstraints: [] } as never,
    };

    await expect(emitEvent({ project, envelope })).rejects.toThrow(/reserved commit-provenance type/);
  });

  test("sequence assignment — two emits get distinct increasing sequences", async () => {
    const project = makeTmpProject();
    const baseEnv = {
      when: "2026-04-26T00:00:00.000Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "sess-1", toolName: "test", cwd: project },
      byWhom: { identity: "claude-code" as const },
      type: "test_event" as never,
      payload: {} as never,
    };

    const r1 = await emitEvent({ project, envelope: { ...baseEnv, eventId: "evt-1" } });
    const r2 = await emitEvent({ project, envelope: { ...baseEnv, eventId: "evt-2" } });

    expect(r2.sequence).toBeGreaterThan(r1.sequence);
    const lines = fs.readFileSync(r1.eventsPath, "utf8").trim().split("\n");
    expect(lines.length).toBe(2);
  });
});

// ─── P1-3: first-class withWhat.reasoning required at emit for T1+ events ─────
describe("validateReasoningPresence (P1-3)", () => {
  function t1Envelope(project: string, withWhat?: Record<string, unknown>) {
    return {
      eventId: "evt-reason-1",
      when: "2026-06-23T00:00:00.000Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "sess-1", toolName: "test", cwd: project },
      byWhom: { identity: "claude-code" as const },
      type: "phase_completed" as never,
      payload: { phaseTag: "t", taskId: "t-1", validations: [] } as never,
      ...(withWhat !== undefined ? { withWhat } : {}),
    };
  }

  test("returns null for a T0 envelope (5-dim incomplete — not double-reported)", () => {
    const env = { ...t1Envelope("/tmp/x"), atopWhich: "" } as never;
    expect(validateReasoningPresence(env)).toBeNull();
  });

  test("returns a violation for a T1+ envelope missing withWhat.reasoning", () => {
    const msg = validateReasoningPresence(t1Envelope("/tmp/x") as never);
    expect(msg).not.toBeNull();
    expect(msg).toContain("withWhat.reasoning");
  });

  test("returns a violation when reasoning is empty/whitespace-only", () => {
    const msg = validateReasoningPresence(
      t1Envelope("/tmp/x", { reasoning: "   " }) as never,
    );
    expect(msg).not.toBeNull();
  });

  test("returns null when a non-empty reasoning is present", () => {
    const msg = validateReasoningPresence(
      t1Envelope("/tmp/x", { reasoning: "because the design contract changed" }) as never,
    );
    expect(msg).toBeNull();
  });
});

describe("emit_event reasoning gate (P1-3) — advisory default + enforce flag", () => {
  const savedEnforce = process.env.PALANTIR_MINI_REASONING_ENFORCE;
  const savedBypass = process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS;
  afterEach(() => {
    if (savedEnforce !== undefined) process.env.PALANTIR_MINI_REASONING_ENFORCE = savedEnforce;
    else delete process.env.PALANTIR_MINI_REASONING_ENFORCE;
    if (savedBypass !== undefined) process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS = savedBypass;
    else delete process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS;
  });

  function valuableEnvelope(project: string, reasoning?: string) {
    return {
      eventId: "evt-reason-emit",
      when: "2026-06-23T00:00:00.000Z",
      atopWhich: "deadbeef",
      throughWhich: { sessionId: "sess-1", toolName: "test", cwd: project },
      byWhom: { identity: "claude-code" as const },
      type: "phase_completed" as never,
      payload: { phaseTag: "t", taskId: "t-1", validations: [] } as never,
      ...(reasoning !== undefined ? { withWhat: { reasoning } } : {}),
    };
  }

  test("default (advisory) — T1+ envelope without reasoning still appends, sets advisory", async () => {
    delete process.env.PALANTIR_MINI_REASONING_ENFORCE;
    const project = makeTmpProject();
    const result = await emitEvent({ project, envelope: valuableEnvelope(project) });
    expect(result.sequence).toBeGreaterThan(0);
    expect(result.valuableDataAdvisory).toContain("withWhat.reasoning");
    expect(fs.existsSync(result.eventsPath)).toBe(true);
  });

  test("enforce mode — T1+ envelope without reasoning throws", async () => {
    process.env.PALANTIR_MINI_REASONING_ENFORCE = "1";
    delete process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS;
    const project = makeTmpProject();
    await expect(
      emitEvent({ project, envelope: valuableEnvelope(project) }),
    ).rejects.toThrow(/withWhat\.reasoning/);
  });

  test("enforce mode — envelope WITH reasoning appends cleanly", async () => {
    process.env.PALANTIR_MINI_REASONING_ENFORCE = "1";
    delete process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS;
    const project = makeTmpProject();
    const result = await emitEvent({
      project,
      envelope: valuableEnvelope(project, "the WHY behind this decision"),
    });
    expect(result.sequence).toBeGreaterThan(0);
    expect(result.valuableDataAdvisory).toBeUndefined();
  });

  test("enforce + bypass — reasoning-less T1+ envelope proceeds (audited bypass)", async () => {
    process.env.PALANTIR_MINI_REASONING_ENFORCE = "1";
    process.env.PALANTIR_MINI_VALUE_GRADE_BYPASS = "1";
    const project = makeTmpProject();
    const result = await emitEvent({ project, envelope: valuableEnvelope(project) });
    expect(result.sequence).toBeGreaterThan(0);
  });
});
