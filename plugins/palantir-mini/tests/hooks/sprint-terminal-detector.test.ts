// palantir-mini v3.13.0 — sprint-terminal-detector hook tests (BackProp P2)
// Coverage: tool-name gate, happy path (bound→completed + sprint_completed event),
// idempotency (already completed = no-op), no contract, corrupt JSON.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import sprintTerminalDetector from "../../hooks/sprint-terminal-detector";

const TARGET_TOOL = "mcp__plugin_palantir-mini_palantir-mini__commit_edits";

let TMP: string;
let savedEventsFile: string | undefined;
let SESSION_ID: string;

/** Helper: build a minimal tracked project structure under TMP. */
function makeProject(root: string): void {
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  fs.mkdirSync(path.join(root, ".palantir-mini", "harness", "sprints"), { recursive: true });
}

/** Helper: write a contract.json in a sprint directory. */
function writeContract(
  root: string,
  sprintDir: string,
  contract: Record<string, unknown>,
): string {
  const dir = path.join(root, ".palantir-mini", "harness", "sprints", sprintDir);
  fs.mkdirSync(dir, { recursive: true });
  const contractPath = path.join(dir, "contract.json");
  fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2), "utf8");
  return contractPath;
}

/** Helper: read all events from the test events.jsonl. */
function readEvents(): Array<Record<string, unknown>> {
  const p = process.env.PALANTIR_MINI_EVENTS_FILE!;
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-sprint-terminal-"));
  makeProject(TMP);
  savedEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
  process.env.PALANTIR_MINI_EVENTS_FILE = path.join(
    TMP,
    ".palantir-mini",
    "session",
    "events.jsonl",
  );
  SESSION_ID = `test-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
});

afterEach(() => {
  if (savedEventsFile !== undefined) {
    process.env.PALANTIR_MINI_EVENTS_FILE = savedEventsFile;
  } else {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
  }
  if (TMP && fs.existsSync(TMP)) {
    fs.rmSync(TMP, { recursive: true, force: true });
  }
});

describe("sprint-terminal-detector hook", () => {
  // ─── tool-name gate ──────────────────────────────────────────────────────
  test("skips when tool_name is not commit_edits", async () => {
    const result = await sprintTerminalDetector({
      tool_name: "Edit",
      cwd: TMP,
      session_id: SESSION_ID,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped (tool=Edit)");
  });

  test("skips on null payload gracefully", async () => {
    const result = await sprintTerminalDetector(null);
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  // ─── Case 1: happy path ──────────────────────────────────────────────────
  test("happy: bound contract + verdict=pass + iteration=iterationLimit → status=completed + sprint_completed emitted", async () => {
    const contractPath = writeContract(TMP, "sprint-006-backprop-quick", {
      contractId:     "sprint-006-backprop-quick",
      sprintNumber:   6,
      status:         "bound",
      iterationLimit: 1,
      mode:           "quick",
    });

    const result = await sprintTerminalDetector({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: {
        project:   TMP,
        iteration: 1,
      },
      tool_response: {
        verdict:         "pass",
        passedCriteria:  3,
        failedCriteria:  0,
        overallScore:    30,
        maxPossibleScore: 30,
        sprintNumber:    6,
        iterationCount:  1,
        contractId:      "sprint-006-backprop-quick",
      },
    });

    // Hook returns continue
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("closed sprint 6");
    expect(result.message).toContain("verdict=pass");
    expect(result.additionalContext).toContain("SPRINT TERMINAL DETECTED");
    expect(result.additionalContext).toContain("status=completed written");

    // contract.json updated to status=completed
    const updated = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    expect(updated.status).toBe("completed");
    expect(typeof updated.closedAt).toBe("string");
    expect(updated.closedAt.length).toBeGreaterThan(0);
    // Existing fields preserved
    expect(updated.sprintNumber).toBe(6);
    expect(updated.mode).toBe("quick");

    // sprint_completed event emitted in events.jsonl
    const events = readEvents();
    const scEvent = events.find((e) => e["type"] === "sprint_completed");
    expect(scEvent).toBeDefined();
    const payload = scEvent!["payload"] as Record<string, unknown>;
    expect(payload["project"]).toBe(TMP);
    expect(payload["sprintNumber"]).toBe(6);
    expect(payload["contractId"]).toBe("sprint-006-backprop-quick");
    expect(payload["verdict"]).toBe("passed");
    expect(payload["iterationCount"]).toBe(1);
    expect(payload["bestScore"]).toBe(1);
    expect((payload["terminationCriteria"] as string[])).toContain("threshold_met");
  });

  test("terminal: iteration=iterationLimit with fail verdict → forced close + verdict=failed", async () => {
    const contractPath = writeContract(TMP, "sprint-007-full", {
      contractId:     "sprint-007-full",
      sprintNumber:   7,
      status:         "bound",
      iterationLimit: 3,
      mode:           "full",
    });

    const result = await sprintTerminalDetector({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: {
        project:   TMP,
        iteration: 3,
      },
      tool_response: {
        failedCriteria:  2,
        passedCriteria:  1,
        iterationCount:  3,
        contractId:      "sprint-007-full",
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("closed sprint 7");

    const updated = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    expect(updated.status).toBe("completed");

    const events = readEvents();
    const scEvent = events.find((e) => e["type"] === "sprint_completed");
    expect(scEvent).toBeDefined();
    const payload = scEvent!["payload"] as Record<string, unknown>;
    expect(payload["verdict"]).toBe("failed");
    expect((payload["terminationCriteria"] as string[])).toContain("iteration_limit_reached");
  });

  // ─── Case 2: idempotency ─────────────────────────────────────────────────
  test("idempotency: contract already status=completed → no-op, no second event", async () => {
    writeContract(TMP, "sprint-006-quick", {
      contractId:     "sprint-006-quick",
      sprintNumber:   6,
      status:         "completed",
      closedAt:       "2026-04-30T10:00:00.000Z",
      iterationLimit: 1,
    });

    const result = await sprintTerminalDetector({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: {
        verdict:        "pass",
        passedCriteria: 3,
        failedCriteria: 0,
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("no-op");
    expect(result.message).toContain("already completed");

    // No sprint_completed event emitted
    const events = readEvents();
    const scEvents = events.filter((e) => e["type"] === "sprint_completed");
    expect(scEvents.length).toBe(0);
  });

  // ─── Case 3: no contract ─────────────────────────────────────────────────
  test("no contract: missing contract.json → skip silently, message contains no-bound-contract", async () => {
    // Project exists but no sprint dirs
    const result = await sprintTerminalDetector({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: {
        verdict:        "pass",
        passedCriteria: 3,
        failedCriteria: 0,
      },
    });

    expect(result.decision).toBe("continue");
    // message or additionalContext carries the reason
    const full = result.message + (result.additionalContext ?? "");
    expect(full).toContain("no-bound-contract");

    const events = readEvents();
    expect(events.filter((e) => e["type"] === "sprint_completed").length).toBe(0);
  });

  test("no harness dir: project with no .palantir-mini/harness/ → skip silently", async () => {
    // Create a project without harness dir
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), "pm-no-harness-"));
    fs.mkdirSync(path.join(bare, ".palantir-mini", "session"), { recursive: true });
    // no harness/ subdir

    try {
      const result = await sprintTerminalDetector({
        tool_name:  TARGET_TOOL,
        cwd:        bare,
        session_id: SESSION_ID,
        tool_input: { project: bare, iteration: 1 },
        tool_response: { verdict: "pass", passedCriteria: 1, failedCriteria: 0 },
      });

      expect(result.decision).toBe("continue");
      const full = result.message + (result.additionalContext ?? "");
      expect(full).toContain("no-harness-dir");
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });

  // ─── Case 4: corrupt JSON ────────────────────────────────────────────────
  test("corrupt JSON contract.json → fail-safe skip, no crash, decision=continue", async () => {
    const dir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-bad");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "contract.json"), "{ NOT VALID JSON !!!", "utf8");

    const result = await sprintTerminalDetector({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: {
        verdict:        "pass",
        passedCriteria: 2,
        failedCriteria: 0,
      },
    });

    // Should skip silently — corrupt contract is treated like no-contract
    expect(result.decision).toBe("continue");
    // No crash (test itself validates this)
    const events = readEvents();
    expect(events.filter((e) => e["type"] === "sprint_completed").length).toBe(0);
  });

  // ─── non-terminal (mid-sprint) guard ─────────────────────────────────────
  test("non-terminal: fail verdict with iterations remaining → skip, no status change", async () => {
    const contractPath = writeContract(TMP, "sprint-008-full", {
      contractId:     "sprint-008-full",
      sprintNumber:   8,
      status:         "bound",
      iterationLimit: 3,
    });

    const result = await sprintTerminalDetector({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: {
        failedCriteria: 2,
        passedCriteria: 1,
        iterationCount: 1,
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("non-terminal");

    // contract.json NOT updated
    const unchanged = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    expect(unchanged.status).toBe("bound");
    expect(unchanged.closedAt).toBeUndefined();

    // No sprint_completed event
    const events = readEvents();
    expect(events.filter((e) => e["type"] === "sprint_completed").length).toBe(0);
  });
});
