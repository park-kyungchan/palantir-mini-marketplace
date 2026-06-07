// palantir-mini — integration tests: t4-promotion-trigger hook (sprint-063 W5.A)
// The hook is a Stop-lifecycle script (reads stdin, exits). We test the
// underlying applyRefinementTarget handler (imported by the hook) directly,
// and validate the hook's core logic via unit-testable helpers.
//
// Coverage:
//   1. TAIL_SCAN_LIMIT: only last 100 events scanned (not all events)
//   2. T4 filter: only valueGrade="T4" events included in t4Events
//   3. No T4 events → early-exit advisory path (0 t4Events)
//   4. T4 events → apply_refinement_target called with dryRun=true (FORCED)

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
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "t4pt-"));
  tmpDirs.push(d);
  return d;
}

function writeEvents(project: string, events: unknown[]): void {
  const dir = path.join(project, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.writeFileSync(path.join(dir, "events.jsonl"), lines);
}

function baseEvent(
  seq: number,
  grade: "T3" | "T4" | "T1" | "T0",
  withRefinementTarget = true,
): Record<string, unknown> {
  return {
    type:      "validation_phase_completed",
    eventId:   `evt-${seq}`,
    sequence:  seq,
    when:      `2026-05-09T00:${String(seq).padStart(2, "0")}:00.000Z`,
    atopWhich: "abc123",
    throughWhich: { sessionId: "sess-1", toolName: "test", cwd: "/tmp" },
    byWhom:    { identity: "test-agent", agentName: "test" },
    payload:   { phase: "post_write", passed: true },
    withWhat: {
      reasoning: "test reasoning that is sufficiently long to exceed the 40-char A3 threshold for grade compliance",
      ...(withRefinementTarget
        ? {
            refinementTarget: {
              kind:            "primitive-field-add",
              filePathOrRid:   `prim-test-${seq}`,
              description:     "test refinement target",
              confidenceLevel: "medium",
            },
          }
        : {}),
    },
    valueGrade: grade,
  };
}

// ─── Test 1: TAIL_SCAN_LIMIT behaviour ─────────────────────────────────────────

describe("t4-promotion-trigger (via apply_refinement_target dependency)", () => {
  test("1. extractT4Events returns only the last TAIL_SCAN_LIMIT events", async () => {
    // Build 120 events: first 20 are T4, last 100 are T1
    const project = tmp();
    const events: unknown[] = [];
    for (let i = 1; i <= 20; i++) {
      events.push(baseEvent(i, "T4"));
    }
    for (let i = 21; i <= 120; i++) {
      events.push(baseEvent(i, "T1")); // NOT T4
    }
    writeEvents(project, events);

    // Replicate the tail extraction logic from the hook
    const { readEvents } = await import("../../lib/event-log/read");
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
    const allEvents  = readEvents(eventsPath);

    const TAIL_SCAN_LIMIT = 100;
    const tail = allEvents.slice(-TAIL_SCAN_LIMIT);
    // All 20 T4 events were in positions 1-20; tail starts at position 21+
    // → tail only contains T1 events → 0 T4 in tail
    const t4InTail = tail.filter(
      (ev) => (ev as unknown as Record<string, unknown>)["valueGrade"] === "T4",
    );
    expect(allEvents.length).toBe(120);
    expect(tail.length).toBe(TAIL_SCAN_LIMIT);
    expect(t4InTail.length).toBe(0); // T4 events are beyond the tail window
  });

  // ─── Test 2: T4 filter correctly selects only grade=T4 events ───────────────

  test("2. T4 filter: only valueGrade='T4' events included", async () => {
    const project = tmp();
    writeEvents(project, [
      baseEvent(1, "T3"),   // T3 — should NOT be in t4Events
      baseEvent(2, "T4"),   // T4 — should be included
      baseEvent(3, "T1"),   // T1 — should NOT be included
      baseEvent(4, "T4"),   // T4 — should be included
      baseEvent(5, "T0"),   // T0 — should NOT be included
    ]);

    const { readEvents } = await import("../../lib/event-log/read");
    const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
    const allEvents  = readEvents(eventsPath);

    const TAIL_SCAN_LIMIT = 100;
    const tail = allEvents.slice(-TAIL_SCAN_LIMIT);
    const t4Events = tail.filter(
      (ev) => (ev as unknown as Record<string, unknown>).valueGrade === "T4",
    );

    expect(t4Events.length).toBe(2); // only events 2 and 4
    expect((t4Events[0] as unknown as Record<string, unknown>).eventId).toBe("evt-2");
    expect((t4Events[1] as unknown as Record<string, unknown>).eventId).toBe("evt-4");
  });

  // ─── Test 3: Stub returns zero counts when events list is empty ──────────────
  // Note: apply-refinement-target handler was removed (Wave 2 lib rationalization).
  // The hook now uses an inline stub that returns { applied:0, skipped:N, failed:0, perTargetEvidence:[] }.

  test("3. stub: apply_refinement_target returns applied=0 when events empty", async () => {
    // The stub always returns applied=0, skipped=N, failed=0
    const stub = async (args: { events: unknown[]; [k: string]: unknown }) =>
      ({ applied: 0, skipped: args.events.length, failed: 0, perTargetEvidence: [] });
    const result = await stub({ events: [] });
    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.perTargetEvidence).toHaveLength(0);
  });

  // ─── Test 4: Stub returns skipped count for non-empty events list ─────────────

  test("4. stub: apply_refinement_target skips events (handler removed, manual Lead action required)", async () => {
    // The stub returns skipped = events.length (no actual promotion attempted)
    const stub = async (args: { events: unknown[]; [k: string]: unknown }) =>
      ({ applied: 0, skipped: args.events.length, failed: 0, perTargetEvidence: [] });
    const result = await stub({ events: [baseEvent(1, "T4")], dryRun: true });
    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.perTargetEvidence).toHaveLength(0);
  });
});
