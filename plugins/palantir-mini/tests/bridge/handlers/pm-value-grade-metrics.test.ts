// palantir-mini v4.11.0 — pm-value-grade-metrics handler tests (sprint-057 W5)
//
// Tests useGradedDenominator arg (sprint-056 carry-over Priority D closure).
// Default false → t2PlusRatio = (T2+T3+T4) / totalEvents (legacy back-compat).
// True → t2PlusRatio = (T2+T3+T4) / (T0+T1+T2+T3+T4), excludes ungraded historical.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import pmValueGradeMetrics from "../../../bridge/handlers/pm-value-grade-metrics";

let TMP: string;

/** Build a minimal events.jsonl fixture in TMP/.palantir-mini/session/. */
function writeEvents(events: Array<Record<string, unknown>>): void {
  const sessDir = path.join(TMP, ".palantir-mini", "session");
  fs.mkdirSync(sessDir, { recursive: true });
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.writeFileSync(path.join(sessDir, "events.jsonl"), lines);
}

/** Make a graded event row with the given valueGrade. */
function gradedEvent(grade: "T0" | "T1" | "T2" | "T3" | "T4", id = "evt-test"): Record<string, unknown> {
  return {
    type: "validation_phase_completed",
    eventId: `${id}-${grade}`,
    when: new Date().toISOString(),
    atopWhich: "abc123",
    sequence: 1,
    throughWhich: { sessionId: "test", toolName: "Bash", cwd: TMP },
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "test event" },
    valueGrade: grade,
    payload: { phase: "design", passed: true },
  };
}

/** Make an ungraded event row (no valueGrade field — legacy/historical). */
function ungradedEvent(id = "evt-ungraded"): Record<string, unknown> {
  return {
    type: "session_started",
    eventId: id,
    when: new Date().toISOString(),
    atopWhich: "abc123",
    sequence: 1,
    throughWhich: { sessionId: "test", toolName: "Bash", cwd: TMP },
    byWhom: { identity: "claude-code" },
    withWhat: { reasoning: "no valueGrade" },
    payload: {},
  };
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-vgmetrics-"));
});

afterEach(() => {
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

// ─── Test 1: default (totalEvents denominator) ────────────────────────────────

describe("default_totalEvents_denominator", () => {
  test("3 graded T2+ events + 7 ungraded → ratio = 3/10 = 0.3", async () => {
    const events = [
      gradedEvent("T2", "a"),
      gradedEvent("T3", "b"),
      gradedEvent("T4", "c"),
      ungradedEvent("d"),
      ungradedEvent("e"),
      ungradedEvent("f"),
      ungradedEvent("g"),
      ungradedEvent("h"),
      ungradedEvent("i"),
      ungradedEvent("j"),
    ];
    writeEvents(events);
    const result = await pmValueGradeMetrics({ project: TMP });
    expect(result.totalEvents).toBe(10);
    expect(result.ungraded).toBe(7);
    expect(result.gradedTotal).toBe(3);
    expect(result.t2PlusRatio).toBeCloseTo(0.3, 2);
    expect(result.denominatorMode).toBe("totalEvents");
  });
});

// ─── Test 2: useGradedDenominator=true ────────────────────────────────────────

describe("graded_denominator_arg", () => {
  test("3 graded T2+ events + 7 ungraded with useGradedDenominator → ratio = 3/3 = 1.0", async () => {
    const events = [
      gradedEvent("T2", "a"),
      gradedEvent("T3", "b"),
      gradedEvent("T4", "c"),
      ungradedEvent("d"),
      ungradedEvent("e"),
      ungradedEvent("f"),
      ungradedEvent("g"),
      ungradedEvent("h"),
      ungradedEvent("i"),
      ungradedEvent("j"),
    ];
    writeEvents(events);
    const result = await pmValueGradeMetrics({ project: TMP, useGradedDenominator: true });
    expect(result.totalEvents).toBe(10);
    expect(result.ungraded).toBe(7);
    expect(result.gradedTotal).toBe(3);
    expect(result.t2PlusRatio).toBeCloseTo(1.0, 2);
    expect(result.denominatorMode).toBe("graded");
  });

  test("mixed grades + ungraded with useGradedDenominator → ratio uses gradedTotal", async () => {
    const events = [
      gradedEvent("T0", "a"),
      gradedEvent("T1", "b"),
      gradedEvent("T1", "c"),
      gradedEvent("T2", "d"),
      gradedEvent("T3", "e"),
      ungradedEvent("f"),
      ungradedEvent("g"),
    ];
    // gradedTotal = 5, t2PlusCount = 2, t2PlusRatio = 2/5 = 0.4
    writeEvents(events);
    const result = await pmValueGradeMetrics({ project: TMP, useGradedDenominator: true });
    expect(result.totalEvents).toBe(7);
    expect(result.gradedTotal).toBe(5);
    expect(result.t2PlusRatio).toBeCloseTo(0.4, 2);
    expect(result.denominatorMode).toBe("graded");
  });
});

// ─── Test 3: zero events edge case ────────────────────────────────────────────

describe("zero_events_edge_case", () => {
  test("no events.jsonl file → ratio=0, gradedTotal=0", async () => {
    // Don't write events.jsonl
    fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
    const result = await pmValueGradeMetrics({ project: TMP, useGradedDenominator: true });
    expect(result.totalEvents).toBe(0);
    expect(result.t2PlusRatio).toBe(0);
    expect(result.gradedTotal).toBe(0);
    expect(result.denominatorMode).toBe("graded");
  });
});

// ─── Test 4: all-T0 edge case (graded denominator > 0 but t2Plus = 0) ─────────

describe("all_T0_no_T2plus", () => {
  test("only T0 events with useGradedDenominator → ratio=0/N=0", async () => {
    const events = [
      gradedEvent("T0", "a"),
      gradedEvent("T0", "b"),
      gradedEvent("T0", "c"),
    ];
    writeEvents(events);
    const result = await pmValueGradeMetrics({ project: TMP, useGradedDenominator: true });
    expect(result.gradedTotal).toBe(3);
    expect(result.t2PlusRatio).toBe(0);
    expect(result.denominatorMode).toBe("graded");
  });
});

// ─── Test 5: back-compat — default arg behavior unchanged ─────────────────────

describe("backcompat_default_arg", () => {
  test("explicit useGradedDenominator=false matches default omit", async () => {
    const events = [gradedEvent("T2", "a"), ungradedEvent("b")];
    writeEvents(events);
    const omit = await pmValueGradeMetrics({ project: TMP });
    const explicit = await pmValueGradeMetrics({ project: TMP, useGradedDenominator: false });
    expect(omit.t2PlusRatio).toBe(explicit.t2PlusRatio);
    expect(omit.denominatorMode).toBe("totalEvents");
    expect(explicit.denominatorMode).toBe("totalEvents");
  });
});
