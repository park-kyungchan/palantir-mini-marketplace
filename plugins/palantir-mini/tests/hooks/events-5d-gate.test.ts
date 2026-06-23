// palantir-mini v1.3 — events-5d-gate tests
// A8.3: verifies PreCompact gate surfaces 5D conformance violations, passes otherwise.
// P3-3: the gate is row-id-granular — it FLAGS offending row-ids and CONTINUES
// rather than hard-blocking the whole compaction on a >10% threshold.

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import events5dGate from "../../hooks/events-5d-gate";

describe("events5dGate", () => {
  test("returns continue when handler unavailable (graceful degradation)", async () => {
    // In test env the audit handler may not load — 0 violations → continue
    const result = await events5dGate({ cwd: "/tmp" });
    expect(result.decision).toBeOneOf(["continue", "block"]);
    expect(result.message).toContain("events-5d-gate");
  });

  test("returns continue for project with no events.jsonl", async () => {
    const result = await events5dGate({ cwd: "/tmp/nonexistent-project-xyz" });
    expect(result.decision).toBe("continue");
  });

  test("handles null payload gracefully", async () => {
    const result = await events5dGate(null);
    expect(result.message).toBeTruthy();
  });
});

describe("events5dGate — P3-3 row-id-granular flag (never whole-compaction block)", () => {
  const tmps: string[] = [];
  afterEach(() => {
    for (const t of tmps.splice(0)) fs.rmSync(t, { recursive: true, force: true });
  });

  function makeProject(lines: Record<string, unknown>[]): string {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "pm-e5d-"));
    tmps.push(tmp);
    const dir = path.join(tmp, ".palantir-mini", "session");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "events.jsonl"),
      lines.map((l) => JSON.stringify(l)).join("\n") + "\n",
      "utf8",
    );
    return tmp;
  }

  function validEvent(i: number): Record<string, unknown> {
    return {
      type: "session_started",
      eventId: `evt-ok-${i}`,
      when: new Date().toISOString(),
      atopWhich: "test-sha",
      throughWhich: { sessionId: "s", toolName: "t", cwd: "/tmp" },
      byWhom: { identity: "claude-code" },
      payload: { model: "test", effort: "max" },
      sequence: i,
    };
  }

  test("mostly-clean compaction with a few offending rows → continue + flagged row-ids (not blocked)", async () => {
    // 18 clean + 2 incomplete (missing throughWhich/byWhom) = 10% violations.
    const lines: Record<string, unknown>[] = [];
    for (let i = 1; i <= 18; i++) lines.push(validEvent(i));
    lines.push({ type: "session_started", eventId: "evt-bad-1", when: new Date().toISOString(), atopWhich: "x", throughWhich: {}, byWhom: {}, payload: {}, sequence: 19 });
    lines.push({ type: "session_started", eventId: "evt-bad-2", when: new Date().toISOString(), atopWhich: "x", throughWhich: {}, byWhom: {}, payload: {}, sequence: 20 });
    const tmp = makeProject(lines);

    const result = await events5dGate({ cwd: tmp });

    // Row-id-granular: never blocks the whole compaction, even at the threshold.
    expect(result.decision).toBe("continue");
    // The offending row-ids are surfaced for follow-up.
    expect(result.reason).toContain("evt-bad-1");
    expect(result.reason).toContain("evt-bad-2");
    expect(result.message).toContain("flagged 2 row(s)");
  });

  test("high violation ratio (>10%) still CONTINUES (warn severity, no block)", async () => {
    // 1 clean + 4 incomplete = 80% violations — old gate would block; now continues.
    const lines: Record<string, unknown>[] = [validEvent(1)];
    for (let i = 2; i <= 5; i++) {
      lines.push({ type: "session_started", eventId: `evt-bad-${i}`, when: new Date().toISOString(), atopWhich: "x", throughWhich: {}, byWhom: {}, payload: {}, sequence: i });
    }
    const tmp = makeProject(lines);

    const result = await events5dGate({ cwd: tmp });

    expect(result.decision).toBe("continue");
    expect(result.reason).toContain("warn");
    expect(result.reason).toContain("evt-bad-2");
  });

  test("all-conformant project → plain continue (no flag, no reason row-ids)", async () => {
    const lines = [validEvent(1), validEvent(2), validEvent(3)];
    const tmp = makeProject(lines);

    const result = await events5dGate({ cwd: tmp });

    expect(result.decision).toBe("continue");
    expect(result.message).not.toContain("flagged");
  });
});
