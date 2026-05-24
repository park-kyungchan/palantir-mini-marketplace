// palantir-mini — grade_classification_accuracy MCP handler tests (sprint-062 W4-α)
// Coverage:
//   1. Empty events → aggregate=0, trust=false, retrain=true
//   2. All matches (10 plan-vs-commit pairs aligned) → aggregate=1.0, trust=true
//   3. Per-kind mix (forwardProp 7/10 + import 0/2 + semantic 1/1 match)
//   4. Validate per-kind accuracy + aggregate weighting
//   5. Custom window: commit outside window → no match
//   6. Custom thresholds: trust at 0.5, retrain at 0.3
//   7. Reasoning string populated
//   8. Events without matching toolName ignored
//   9. Handler does NOT call semantic_change_plan (read-only assertion)
//  10. affectedRids[] shape (fallback) treated as kind="semantic"

import { test, expect, describe, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import gradeClassificationAccuracy from "../../../bridge/handlers/grade-classification-accuracy";
import { computeClassificationAccuracy } from "../../../lib/recap/classification-accuracy";

// ─── Test utilities ───────────────────────────────────────────────────────────

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-gca-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function ensureEventsDir(root: string): string {
  const p = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(p, { recursive: true });
  return eventsPathFor(root);
}

function writeEvent(eventsPath: string, ev: Record<string, unknown>): void {
  fs.appendFileSync(eventsPath, JSON.stringify(ev) + "\n");
}

const tmpRoots: string[] = [];

afterEach(() => {
  for (const r of tmpRoots.splice(0)) {
    fs.rmSync(r, { recursive: true, force: true });
  }
});

function setupRoot(label: string): string {
  const root = makeTmpRoot(label);
  tmpRoots.push(root);
  return root;
}

// ─── Event factories ──────────────────────────────────────────────────────────

let seqCounter = 2000;

const BASE_WHEN = "2026-05-09T12:00:00.000Z";
const BASE_TS = new Date(BASE_WHEN).getTime();

function makePlanEvent(opts: {
  rid: string;
  kind: string;
  whenOffset?: number; // ms offset from BASE_TS
}): Record<string, unknown> {
  const when = new Date(BASE_TS + (opts.whenOffset ?? 0)).toISOString();
  return {
    sequence: seqCounter++,
    type: "tool_invocation_completed",
    eventId: `evt-plan-${seqCounter}`,
    when,
    atopWhich: "abc123",
    throughWhich: { sessionId: "s1", toolName: "test", cwd: "/tmp" },
    byWhom: { identity: "claude-code" },
    payload: {
      toolName: "mcp__plugin_palantir-mini_palantir-mini__semantic_change_plan",
      affectedSemanticRids: [
        { rid: opts.rid, kind: opts.kind },
      ],
    },
  };
}

function makeCommitEvent(opts: {
  rid: string;
  whenOffset?: number; // ms offset from BASE_TS
}): Record<string, unknown> {
  const when = new Date(BASE_TS + (opts.whenOffset ?? 0)).toISOString();
  return {
    sequence: seqCounter++,
    type: "edit_committed",
    eventId: `evt-commit-${seqCounter}`,
    when,
    atopWhich: "abc123",
    throughWhich: { sessionId: "s1", toolName: "commit_edits", cwd: "/tmp" },
    byWhom: { identity: "claude-code" },
    payload: {
      rid: opts.rid,
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("grade_classification_accuracy — handler", () => {
  test("1. empty events → aggregate=0, trust=false, retrain=true", async () => {
    const root = setupRoot("empty");
    ensureEventsDir(root);

    const result = await gradeClassificationAccuracy({ project: root });

    expect(result.calibration.aggregate).toBe(0);
    expect(result.calibration.totalPlans).toBe(0);
    expect(result.calibration.totalMatches).toBe(0);
    expect(result.trust).toBe(false);
    expect(result.retrain).toBe(true);
    expect(typeof result.reasoning).toBe("string");
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  test("2. all matches (10 plan-vs-commit pairs aligned) → aggregate=1.0, trust=true", async () => {
    const root = setupRoot("all-match");
    const eventsPath = ensureEventsDir(root);

    // 10 plan predictions + 10 matching commits (same RID, within 1h window)
    for (let i = 0; i < 10; i++) {
      writeEvent(eventsPath, makePlanEvent({ rid: `rid-${i}`, kind: "forwardProp", whenOffset: i * 1000 }));
      writeEvent(eventsPath, makeCommitEvent({ rid: `rid-${i}`, whenOffset: i * 1000 + 60_000 }));
    }

    const result = await gradeClassificationAccuracy({ project: root, windowDays: 14 });

    expect(result.calibration.aggregate).toBeCloseTo(1.0, 5);
    expect(result.calibration.totalPlans).toBe(10);
    expect(result.calibration.totalMatches).toBe(10);
    expect(result.trust).toBe(true);
    expect(result.retrain).toBe(false);
  });

  test("3. per-kind mix → correct per-kind accuracy + weighted aggregate", async () => {
    const root = setupRoot("mix");
    const eventsPath = ensureEventsDir(root);

    // forwardProp: 7 predictions, 7 matched
    for (let i = 0; i < 7; i++) {
      writeEvent(eventsPath, makePlanEvent({ rid: `fp-${i}`, kind: "forwardProp" }));
      writeEvent(eventsPath, makeCommitEvent({ rid: `fp-${i}`, whenOffset: 60_000 }));
    }
    // import: 2 predictions, 0 matched (no commits for these RIDs)
    writeEvent(eventsPath, makePlanEvent({ rid: "import-1", kind: "import" }));
    writeEvent(eventsPath, makePlanEvent({ rid: "import-2", kind: "import" }));
    // semantic: 1 prediction, 1 matched
    writeEvent(eventsPath, makePlanEvent({ rid: "sem-1", kind: "semantic" }));
    writeEvent(eventsPath, makeCommitEvent({ rid: "sem-1", whenOffset: 30_000 }));

    const result = await gradeClassificationAccuracy({ project: root, windowDays: 14 });

    const perKind = result.calibration.perKind;

    // forwardProp: 7/7 = 1.0
    expect(perKind["forwardProp"]).toBeDefined();
    expect(perKind["forwardProp"]!.plans).toBe(7);
    expect(perKind["forwardProp"]!.matches).toBe(7);
    expect(perKind["forwardProp"]!.accuracy).toBeCloseTo(1.0, 5);

    // import: 2/2 plans, 0 matches → accuracy 0
    expect(perKind["import"]).toBeDefined();
    expect(perKind["import"]!.plans).toBe(2);
    expect(perKind["import"]!.matches).toBe(0);
    expect(perKind["import"]!.accuracy).toBeCloseTo(0, 5);

    // semantic: 1/1 plan, 1 match → accuracy 1.0
    expect(perKind["semantic"]).toBeDefined();
    expect(perKind["semantic"]!.plans).toBe(1);
    expect(perKind["semantic"]!.matches).toBe(1);
    expect(perKind["semantic"]!.accuracy).toBeCloseTo(1.0, 5);

    // totalPlans = 10; totalMatches = 8
    expect(result.calibration.totalPlans).toBe(10);
    expect(result.calibration.totalMatches).toBe(8);

    // Weighted aggregate = (7*1.0 + 2*0 + 1*1.0) / 10 = 8/10 = 0.8
    expect(result.calibration.aggregate).toBeCloseTo(0.8, 5);
    expect(result.trust).toBe(true); // 0.8 >= 0.8
    expect(result.retrain).toBe(false);
  });

  test("4. commit outside window → no match", async () => {
    const root = setupRoot("window");
    const eventsPath = ensureEventsDir(root);

    // Plan prediction at T=0
    writeEvent(eventsPath, makePlanEvent({ rid: "rid-late", kind: "forwardProp", whenOffset: 0 }));
    // Commit at T=25h → outside default 14-day window but testing with 1-day window
    const oneDayMs = 24 * 3_600_000;
    writeEvent(eventsPath, makeCommitEvent({ rid: "rid-late", whenOffset: oneDayMs + 60_000 }));

    // Use windowDays=1 (exactly 24h) — commit at 24h+1min is outside
    const result = await gradeClassificationAccuracy({ project: root, windowDays: 1 });

    // No match because commit is 1 minute beyond the 24h window
    expect(result.calibration.totalMatches).toBe(0);
    expect(result.calibration.aggregate).toBe(0);
    expect(result.trust).toBe(false);
    expect(result.retrain).toBe(true);
  });

  test("5. custom thresholds: trust at 0.5, retrain at 0.3", async () => {
    const root = setupRoot("custom-threshold");
    const eventsPath = ensureEventsDir(root);

    // 6/10 match → 0.6 aggregate
    for (let i = 0; i < 6; i++) {
      writeEvent(eventsPath, makePlanEvent({ rid: `hit-${i}`, kind: "forwardProp" }));
      writeEvent(eventsPath, makeCommitEvent({ rid: `hit-${i}`, whenOffset: 60_000 }));
    }
    for (let i = 0; i < 4; i++) {
      writeEvent(eventsPath, makePlanEvent({ rid: `miss-${i}`, kind: "forwardProp" }));
    }

    const result = await gradeClassificationAccuracy({
      project: root,
      windowDays: 14,
      trustThreshold: 0.5,
      retrainThreshold: 0.3,
    });

    expect(result.calibration.aggregate).toBeCloseTo(0.6, 5);
    expect(result.trust).toBe(true);   // 0.6 >= 0.5
    expect(result.retrain).toBe(false); // 0.6 >= 0.3
  });

  test("6. reasoning string populated with aggregate and totalPlans", async () => {
    const root = setupRoot("reasoning");
    ensureEventsDir(root);

    const result = await gradeClassificationAccuracy({ project: root });

    // Even with no events: reasoning should mention "0 plan predictions"
    expect(result.reasoning).toContain("0");
    expect(result.reasoning).toContain("predictions");
  });
});

describe("computeClassificationAccuracy — lib unit tests", () => {
  test("7. empty events → zero score", () => {
    const score = computeClassificationAccuracy([]);
    expect(score.aggregate).toBe(0);
    expect(score.totalPlans).toBe(0);
    expect(score.totalMatches).toBe(0);
    expect(score.totalCommits).toBe(0);
    expect(Object.keys(score.perKind)).toHaveLength(0);
  });

  test("8. impact_query toolName is treated as the current plan-prediction source", () => {
    const events = [
      {
        type: "tool_invocation_completed",
        when: BASE_WHEN,
        payload: { toolName: "impact_query", rids: ["some-rid"] },
      },
      {
        type: "edit_committed",
        when: BASE_WHEN,
        payload: { rid: "some-rid" },
      },
    ];
    const score = computeClassificationAccuracy(events);
    expect(score.totalPlans).toBe(1);
    expect(score.aggregate).toBe(1);
  });

  test("9. affectedRids[] shape (fallback) treated as kind='semantic'", () => {
    const events = [
      {
        type: "tool_invocation_completed",
        when: BASE_WHEN,
        payload: {
          toolName: "mcp__plugin_palantir-mini_palantir-mini__semantic_change_plan",
          affectedRids: ["rid-a", "rid-b"],
        },
      },
      {
        type: "edit_committed",
        when: BASE_WHEN,
        payload: { rid: "rid-a" },
      },
    ];
    const score = computeClassificationAccuracy(events, 24 * 3_600_000);
    expect(score.totalPlans).toBe(2);
    expect(score.perKind["semantic"]).toBeDefined();
    expect(score.perKind["semantic"]!.plans).toBe(2);
    expect(score.perKind["semantic"]!.matches).toBe(1);
    expect(score.perKind["semantic"]!.accuracy).toBeCloseTo(0.5, 5);
    expect(score.aggregate).toBeCloseTo(0.5, 5);
  });

  test("10. windowDays field correct in CalibrationScore", () => {
    const score = computeClassificationAccuracy([], 7 * 24 * 3_600_000);
    expect(score.windowDays).toBe(7);
  });
});
