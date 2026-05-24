import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  readPromotedEvents,
  resolveGradeNumeric,
  type GradeFilter,
} from "../../../lib/event-log/promoted-index";
import type { EventEnvelope } from "../../../lib/event-log/types";

function makeEnvelope(overrides: Partial<EventEnvelope> & { valueGrade?: string }): EventEnvelope {
  return {
    type: "test_event",
    eventId: `ev-${Math.random().toString(36).slice(2)}`,
    when: new Date().toISOString(),
    atopWhich: "abc1234",
    throughWhich: { surface: "test", tool: "test" },
    byWhom: { agent: "test-agent", identity: "claude-code" },
    payload: {},
    withWhat: { reasoning: "short" } as Record<string, unknown>,
    ...overrides,
  } as EventEnvelope;
}

let tmpDir: string;
let sessionDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "promoted-index-test-"));
  sessionDir = tmpDir;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeEvents(events: EventEnvelope[]) {
  const lines = events.map((e) => JSON.stringify(e)).join("\n");
  fs.writeFileSync(path.join(sessionDir, "events.jsonl"), lines + "\n");
}

describe("readPromotedEvents", () => {
  it("returns empty result when events.jsonl is missing", () => {
    const result = readPromotedEvents({ sessionDir });
    expect(result.events).toEqual([]);
    expect(result.totalRead).toBe(0);
    expect(result.rawScan).toBe(false);
  });

  it("returns empty result when events.jsonl is empty", () => {
    fs.writeFileSync(path.join(sessionDir, "events.jsonl"), "");
    const result = readPromotedEvents({ sessionDir });
    expect(result.events).toEqual([]);
    expect(result.totalRead).toBe(0);
  });

  it("raw filter returns all events with rawScan=true", () => {
    const evs = [makeEnvelope({}), makeEnvelope({})];
    writeEvents(evs);
    const result = readPromotedEvents({ sessionDir, gradeFilter: "raw" });
    expect(result.rawScan).toBe(true);
    expect(result.events.length).toBe(2);
    expect(result.filteredCount).toBe(2);
  });

  it("T3+ filter keeps only explicitly graded T3/T4 events", () => {
    const t1 = makeEnvelope({ valueGrade: "T1" } as EventEnvelope & { valueGrade: string });
    const t2 = makeEnvelope({ valueGrade: "T2" } as EventEnvelope & { valueGrade: string });
    const t3 = makeEnvelope({ valueGrade: "T3" } as EventEnvelope & { valueGrade: string });
    const t4 = makeEnvelope({ valueGrade: "T4" } as EventEnvelope & { valueGrade: string });
    writeEvents([t1, t2, t3, t4]);
    const result = readPromotedEvents({ sessionDir, gradeFilter: "T3+" });
    expect(result.filteredCount).toBe(2);
    expect(result.events.map((e) => (e as EventEnvelope & { valueGrade: string }).valueGrade)).toEqual(["T3", "T4"]);
  });

  it("T4-only filter keeps only explicitly graded T4 events", () => {
    const t3 = makeEnvelope({ valueGrade: "T3" } as EventEnvelope & { valueGrade: string });
    const t4 = makeEnvelope({ valueGrade: "T4" } as EventEnvelope & { valueGrade: string });
    writeEvents([t3, t4]);
    const result = readPromotedEvents({ sessionDir, gradeFilter: "T4-only" });
    expect(result.filteredCount).toBe(1);
  });

  it("T2+ filter keeps T2, T3, T4 explicit grades", () => {
    const t1 = makeEnvelope({ valueGrade: "T1" } as EventEnvelope & { valueGrade: string });
    const t2 = makeEnvelope({ valueGrade: "T2" } as EventEnvelope & { valueGrade: string });
    const t3 = makeEnvelope({ valueGrade: "T3" } as EventEnvelope & { valueGrade: string });
    writeEvents([t1, t2, t3]);
    const result = readPromotedEvents({ sessionDir, gradeFilter: "T2+" });
    expect(result.filteredCount).toBe(2);
  });

  it("promotedFrom payload field resolves to T4", () => {
    const ev = makeEnvelope({});
    (ev.payload as Record<string, unknown>)["promotedFrom"] = "ev-original-123";
    writeEvents([ev]);
    const result = readPromotedEvents({ sessionDir, gradeFilter: "T4-only" });
    expect(result.filteredCount).toBe(1);
  });

  it("heuristic inference: long reasoning + refinementTarget + memoryLayers → T3", () => {
    const ev = makeEnvelope({
      withWhat: {
        reasoning: "a".repeat(45),
        refinementTarget: { kind: "rule-12" },
        memoryLayers: ["procedural"],
      } as Record<string, unknown>,
    });
    writeEvents([ev]);
    const grade = resolveGradeNumeric(ev);
    expect(grade).toBe(3);
    const result = readPromotedEvents({ sessionDir, gradeFilter: "T3+" });
    expect(result.filteredCount).toBe(1);
  });

  it("default gradeFilter is T3+ (graceful fallback: no T3+ → return all)", () => {
    // All T1 events — should fall back to returning all
    const evs = [
      makeEnvelope({ valueGrade: "T1" } as EventEnvelope & { valueGrade: string }),
      makeEnvelope({ valueGrade: "T1" } as EventEnvelope & { valueGrade: string }),
    ];
    writeEvents(evs);
    const result = readPromotedEvents({ sessionDir });
    // Default gradeFilter="T3+" but graceful fallback: 0 T3+ → return all
    expect(result.events.length).toBe(2);
    expect(result.rawScan).toBe(false);
  });

  it("rawScan is false when grade filter is applied", () => {
    const ev = makeEnvelope({ valueGrade: "T3" } as EventEnvelope & { valueGrade: string });
    writeEvents([ev]);
    const result = readPromotedEvents({ sessionDir, gradeFilter: "T3+" });
    expect(result.rawScan).toBe(false);
  });
});

// Suppress unused import warning — GradeFilter is used for type documentation
void (undefined as unknown as GradeFilter);
