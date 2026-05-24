// palantir-mini v3.9.0 — harness-analyzer-trigger hook tests (W3.0)
// Coverage: tool-name gate, verdict gate, iteration gate, marker write,
// idempotency (re-fire = no-op), event emission.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import harnessAnalyzerTrigger from "../../hooks/harness-analyzer-trigger";

const TARGET_TOOL = "mcp__plugin_palantir-mini_palantir-mini__grade_outcome_with_rubric";

let TMP: string;
let savedEventsFile: string | undefined;
let SESSION_ID: string;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-analyzer-trigger-"));
  fs.mkdirSync(path.join(TMP, ".palantir-mini", "session"), { recursive: true });
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(TMP, ".palantir-mini", "session", "events.jsonl");
  // Unique session id per test for marker-dir isolation
  SESSION_ID = `test-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
});

afterEach(() => {
  if (savedEventsFile !== undefined) {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  } else {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  }
  // Clean up any test-created markers under /tmp/claude-hooks/<SESSION_ID>/
  const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
  if (fs.existsSync(markerDir)) {
    fs.rmSync(markerDir, { recursive: true, force: true });
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

describe("harness-analyzer-trigger hook", () => {
  test("skips when tool_name is not grade_outcome_with_rubric", async () => {
    const result = await harnessAnalyzerTrigger({
      tool_name: "Edit",
      cwd: TMP,
      session_id: SESSION_ID,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped (tool=");
  });

  test("skips on pass-verdict (failedCriteria=0)", async () => {
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: { sprintNumber: 1, iteration: 2, rubric: { rubricId: "test-rubric" } },
      tool_response: { failedCriteria: 0, passedCriteria: 5 },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("verdict=pass");
    // No marker written
    const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    expect(fs.existsSync(markerDir)).toBe(false);
  });

  test("skips when iteration < 1", async () => {
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: { sprintNumber: 1, iteration: 0, rubric: { rubricId: "r1" } },
      tool_response: { failedCriteria: 1 },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("iteration<1");
  });

  test("writes marker file + emits phase_completed on fail-verdict iter>=1", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: { sprintNumber: 7, iteration: 2, rubric: { rubricId: "rubric-A" }, projectPath: TMP },
      tool_response: { failedCriteria: 3, passedCriteria: 2, rubricId: "rubric-A" },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("queued");
    expect(result.additionalContext).toContain("Sprint 7 iteration 2");

    // Marker file exists with expected payload
    const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    const expectedPath = path.join(markerDir, "analyzer-request-7-2-rubric-A.json");
    expect(fs.existsSync(expectedPath)).toBe(true);
    const marker = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
    expect(marker.sprintNumber).toBe(7);
    expect(marker.iteration).toBe(2);
    expect(marker.rubricId).toBe("rubric-A");
    expect(marker.failedCount).toBe(3);

    // phase_completed event emitted with phaseTag=harness-analyzer-fire-pending
    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const evt = lines.map((l) => JSON.parse(l)).find(
      (e: any) => e.payload?.phaseTag === "harness-analyzer-fire-pending",
    );
    expect(evt).toBeDefined();
    expect(evt.type).toBe("phase_completed");
    expect(evt.payload.taskId).toBe("sprint-7-iteration-2-analyzer-request");
    expect(evt.payload.validations).toContain("verdict-fail-confirmed");
  });

  test("re-fire is idempotent (marker already exists = no-op)", async () => {
    const args = {
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: { sprintNumber: 5, iteration: 3, rubric: { rubricId: "stable-id" } },
      tool_response: { failedCriteria: 1 },
    };

    const r1 = await harnessAnalyzerTrigger(args);
    expect(r1.message).toContain("queued");

    const r2 = await harnessAnalyzerTrigger(args);
    expect(r2.message).toContain("no-op");
    expect(r2.message).toContain("marker exists");
  });

  test("derives failedCount from perCriterion when failedCriteria absent", async () => {
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: { sprintNumber: 2, iteration: 1, rubric: { rubricId: "r2" } },
      tool_response: {
        // No failedCriteria field
        perCriterion: [
          { passFail: "pass" },
          { passFail: "fail" },
          { passFail: "fail" },
        ],
      },
    });
    expect(result.message).toContain("queued");
    const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    const marker = JSON.parse(fs.readFileSync(path.join(markerDir, "analyzer-request-2-1-r2.json"), "utf8"));
    expect(marker.failedCount).toBe(2);
  });

  test("handles null payload gracefully", async () => {
    const result = await harnessAnalyzerTrigger(null);
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped (tool=");
  });

  // W2.A1 — failedCriteriaIds shape: when tool_response carries
  // failedCriteria as a string array (non-number) + perCriterion as a
  // Record keyed by criterionId, deriveFailedCount falls through to
  // perCriterion array check. This test verifies the hook fires correctly
  // when given the explicit failedCriteriaIds-style response shape.
  test("synthetic_fail_verdict_writes_marker — failedCriteria array + perCriterion record shape", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: {
        sprintNumber: 11,
        iteration: 2,
        rubric: { rubricId: "rubric-W2A1" },
        projectPath: TMP,
      },
      // failedCriteria supplied as string array (non-number) — deriveFailedCount
      // skips the typeof===number branch and falls to perCriterion fallback.
      tool_response: {
        rubricId: "rubric-W2A1",
        failedCriteria: ["c1"] as unknown as number,
        perCriterion: [
          { passFail: "fail" as const },
          { passFail: "pass" as const },
        ],
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("queued");

    // Marker file written
    const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    const expectedPath = path.join(markerDir, "analyzer-request-11-2-rubric-W2A1.json");
    expect(fs.existsSync(expectedPath)).toBe(true);
    const marker = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
    expect(marker.sprintNumber).toBe(11);
    expect(marker.iteration).toBe(2);
    expect(marker.failedCount).toBe(1);

    // phase_completed event emitted
    expect(fs.existsSync(eventsPath)).toBe(true);
    const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
    const evt = lines.map((l) => JSON.parse(l)).find(
      (e: any) => e.payload?.phaseTag === "harness-analyzer-fire-pending",
    );
    expect(evt).toBeDefined();
    expect(evt.type).toBe("phase_completed");
  });

  // W2.A1 — pass-verdict: empty failedCriteriaIds array + all perCriterion pass
  // → deriveFailedCount returns 0 → hook skips → no marker, no event.
  test("synthetic_pass_verdict_no_marker — empty failedCriteria array + all perCriterion pass", async () => {
    const eventsPath = process.env.PALANTIR_MINI_EVENTS_FILE!;
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: {
        sprintNumber: 12,
        iteration: 3,
        rubric: { rubricId: "rubric-W2A1-pass" },
        projectPath: TMP,
      },
      tool_response: {
        rubricId: "rubric-W2A1-pass",
        failedCriteria: [] as unknown as number,
        perCriterion: [
          { passFail: "pass" as const },
          { passFail: "pass" as const },
        ],
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("verdict=pass");

    // No marker written
    const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    expect(fs.existsSync(markerDir)).toBe(false);

    // No phase_completed event for harness-analyzer-fire-pending
    if (fs.existsSync(eventsPath)) {
      const lines = fs.readFileSync(eventsPath, "utf8").trim().split("\n").filter(Boolean);
      const evt = lines.map((l) => JSON.parse(l)).find(
        (e: any) => e.payload?.phaseTag === "harness-analyzer-fire-pending",
      );
      expect(evt).toBeUndefined();
    }
  });

  // W2.A1 explicit: failedCriteriaIds from tool_response is written into marker payload.
  test("marker payload contains failedCriteriaIds from tool_response (W2.A1 explicit field)", async () => {
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: {
        sprintNumber: 20,
        iteration: 1,
        rubric: { rubricId: "rubric-W2A1-explicit" },
        projectPath: TMP,
      },
      tool_response: {
        rubricId: "rubric-W2A1-explicit",
        failedCriteria: 2,
        failedCriteriaIds: ["criterion-alpha", "criterion-beta"],
        perCriterion: [
          { criterionId: "criterion-alpha", passFail: "fail" as const },
          { criterionId: "criterion-beta", passFail: "fail" as const },
          { criterionId: "criterion-gamma", passFail: "pass" as const },
        ],
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("queued");

    const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    const expectedPath = path.join(markerDir, "analyzer-request-20-1-rubric-W2A1-explicit.json");
    expect(fs.existsSync(expectedPath)).toBe(true);
    const marker = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
    expect(marker.failedCount).toBe(2);
    expect(Array.isArray(marker.failedCriteriaIds)).toBe(true);
    expect(marker.failedCriteriaIds).toEqual(["criterion-alpha", "criterion-beta"]);
  });

  // W2.A1 fallback: when failedCriteriaIds absent, derive from perCriterion[].criterionId.
  test("marker payload derives failedCriteriaIds from perCriterion when explicit field absent (W2.A1 fallback)", async () => {
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: {
        sprintNumber: 21,
        iteration: 2,
        rubric: { rubricId: "rubric-W2A1-fallback" },
        projectPath: TMP,
      },
      tool_response: {
        rubricId: "rubric-W2A1-fallback",
        // No explicit failedCriteriaIds field — hook must derive from perCriterion
        perCriterion: [
          { criterionId: "crit-x", passFail: "fail" as const },
          { criterionId: "crit-y", passFail: "pass" as const },
          { criterionId: "crit-z", passFail: "fail" as const },
        ],
      },
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("queued");

    const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    const expectedPath = path.join(markerDir, "analyzer-request-21-2-rubric-W2A1-fallback.json");
    expect(fs.existsSync(expectedPath)).toBe(true);
    const marker = JSON.parse(fs.readFileSync(expectedPath, "utf8"));
    expect(marker.failedCount).toBe(2);
    expect(Array.isArray(marker.failedCriteriaIds)).toBe(true);
    expect(marker.failedCriteriaIds).toEqual(["crit-x", "crit-z"]);
  });

  // W2.A1 pass-verdict: failedCriteriaIds is empty array in marker for pass verdict is never reached
  // (hook skips before writing), but when failedCount > 0 and failedCriteriaIds = [] the hook
  // still writes the marker — the field is present but empty.
  test("marker failedCriteriaIds is empty array when none derivable (only numeric failedCriteria)", async () => {
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: {
        sprintNumber: 22,
        iteration: 1,
        rubric: { rubricId: "rubric-no-ids" },
        projectPath: TMP,
      },
      tool_response: {
        rubricId: "rubric-no-ids",
        failedCriteria: 1,
        // No failedCriteriaIds, no perCriterion with criterionId
        perCriterion: [{ passFail: "fail" as const }],
      },
    });
    expect(result.message).toContain("queued");

    const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    const marker = JSON.parse(
      fs.readFileSync(path.join(markerDir, "analyzer-request-22-1-rubric-no-ids.json"), "utf8"),
    );
    expect(Array.isArray(marker.failedCriteriaIds)).toBe(true);
    expect(marker.failedCriteriaIds).toEqual([]);
  });

  test("rubricId with special chars is sanitized in key", async () => {
    const result = await harnessAnalyzerTrigger({
      tool_name: TARGET_TOOL,
      cwd: TMP,
      session_id: SESSION_ID,
      tool_input: {
        sprintNumber: 9,
        iteration: 1,
        rubric: { rubricId: "rubric/with:weird@chars" },
      },
      tool_response: { failedCriteria: 1 },
    });
    expect(result.message).toContain("queued");
    const markerDir = path.join(os.tmpdir(), "claude-hooks", SESSION_ID);
    // Slashes/colons replaced with _ in key
    const files = fs.readdirSync(markerDir);
    expect(files.some((f) => f.includes("rubric_with_weird_chars"))).toBe(true);
  });
});
