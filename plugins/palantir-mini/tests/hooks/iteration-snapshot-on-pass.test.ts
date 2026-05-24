// palantir-mini v4.6.0 — iteration-snapshot-on-pass hook tests (sprint-052 W4.A)
// Coverage: tool-name gate, quick-sprint skip, non-pass verdict skip,
//           happy path (full mode pass → snapshot emitted), no contract,
//           no harness dir, corrupt JSON, iteration dir creation.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import iterationSnapshotOnPass from "../../hooks/iteration-snapshot-on-pass";

const TARGET_TOOL = "mcp__plugin_palantir-mini_palantir-mini__commit_edits";

let TMP: string;
let savedEventsFile: string | undefined;
let SESSION_ID: string;

/** Build a minimal tracked project structure under root. */
function makeProject(root: string): void {
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  fs.mkdirSync(path.join(root, ".palantir-mini", "harness", "sprints"), { recursive: true });
}

/** Write a contract.json in a sprint directory. Returns absolute contractPath. */
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

/** Read all events from the test events.jsonl. */
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
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "pm-iter-snapshot-"));
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

describe("iteration-snapshot-on-pass hook", () => {
  // ─── tool-name gate ──────────────────────────────────────────────────────
  test("skips when tool_name is not commit_edits", async () => {
    const result = await iterationSnapshotOnPass({
      tool_name:  "Edit",
      cwd:        TMP,
      session_id: SESSION_ID,
    });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped (tool=Edit)");
  });

  test("skips on null payload gracefully", async () => {
    const result = await iterationSnapshotOnPass(null);
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("skipped");
  });

  // ─── quick-sprint guard ──────────────────────────────────────────────────
  test("skips when contract.mode === 'quick'", async () => {
    writeContract(TMP, "sprint-052-quick", {
      contractId:     "sprint-052-quick",
      sprintNumber:   52,
      status:         "bound",
      iterationLimit: 1,
      mode:           "quick",
    });

    const result = await iterationSnapshotOnPass({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: { verdict: "pass", sprintNumber: 52 },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("mode=quick");

    const events = readEvents();
    expect(events.filter((e) => e["type"] === "iteration_snapshot_taken").length).toBe(0);
  });

  // ─── non-pass verdict guard ──────────────────────────────────────────────
  test("skips when verdict is 'fail'", async () => {
    writeContract(TMP, "sprint-052-full", {
      contractId:     "sprint-052-full",
      sprintNumber:   52,
      status:         "bound",
      iterationLimit: 3,
      mode:           "full",
    });

    const result = await iterationSnapshotOnPass({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: { verdict: "fail", sprintNumber: 52 },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("verdict=fail");

    const events = readEvents();
    expect(events.filter((e) => e["type"] === "iteration_snapshot_taken").length).toBe(0);
  });

  test("skips when verdict is 'timeout'", async () => {
    writeContract(TMP, "sprint-052-full", {
      contractId: "sprint-052-full",
      status:     "bound",
      mode:       "full",
    });

    const result = await iterationSnapshotOnPass({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: { verdict: "timeout" },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("verdict=timeout");
  });

  // ─── happy path: full mode pass ──────────────────────────────────────────
  test("happy: full mode + verdict=pass → iteration_snapshot_taken emitted", async () => {
    writeContract(TMP, "sprint-052-full", {
      contractId:     "sprint-052-full",
      sprintNumber:   52,
      status:         "bound",
      iterationLimit: 3,
      mode:           "full",
    });

    const result = await iterationSnapshotOnPass({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: {
        project:      TMP,
        iteration:    2,
        changedFiles: ["hooks/foo.ts", "tests/hooks/foo.test.ts"],
      },
      tool_response: {
        verdict:      "pass",
        sprintNumber: 52,
        contractId:   "sprint-052-full",
      },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("recorded iteration 2");
    expect(result.message).toContain("sprint-052-full");
    expect(result.message).toContain("mode=full");
    expect(result.additionalContext).toContain("ITERATION SNAPSHOT RECORDED");
    expect(result.additionalContext).toContain("manifestRef:");

    const events = readEvents();
    const snapEvent = events.find((e) => e["type"] === "iteration_snapshot_taken");
    expect(snapEvent).toBeDefined();

    const payload = snapEvent!["payload"] as Record<string, unknown>;
    expect(payload["sprintId"]).toBe("sprint-052-full");
    expect(payload["iteration"]).toBe(2);
    expect(payload["mode"]).toBe("full");
    expect(payload["sprintNumber"]).toBe(52);
    // manifestRef is a sha256 hex string (64 chars)
    expect(typeof payload["manifestRef"]).toBe("string");
    expect((payload["manifestRef"] as string).length).toBe(64);
    // iterationDir is a relative path
    expect(typeof payload["iterationDir"]).toBe("string");
    expect((payload["iterationDir"] as string)).toContain("iteration-002");
    // worktreeRef may be empty string in non-git tmpdir — just check it's a string
    expect(typeof payload["worktreeRef"]).toBe("string");

    // withWhat rule 26 compliance
    const withWhat = snapEvent!["withWhat"] as Record<string, unknown>;
    expect(withWhat).toBeDefined();
    expect(withWhat["reasoning"]).toContain("pass-verdict snapshot");
    expect(Array.isArray(withWhat["memoryLayers"])).toBe(true);
    const layers = withWhat["memoryLayers"] as string[];
    expect(layers).toContain("procedural");
    expect(layers).toContain("episodic");
  });

  test("happy: lite mode + verdict=pass → snapshot emitted", async () => {
    writeContract(TMP, "sprint-052-lite", {
      contractId:     "sprint-052-lite",
      sprintNumber:   52,
      status:         "bound",
      iterationLimit: 2,
      mode:           "lite",
    });

    const result = await iterationSnapshotOnPass({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: { verdict: "pass", contractId: "sprint-052-lite" },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("mode=lite");

    const events = readEvents();
    const snapEvent = events.find((e) => e["type"] === "iteration_snapshot_taken");
    expect(snapEvent).toBeDefined();
    const payload = snapEvent!["payload"] as Record<string, unknown>;
    expect(payload["mode"]).toBe("lite");
  });

  // ─── iteration dir creation ──────────────────────────────────────────────
  test("creates iterationDir when it does not exist", async () => {
    writeContract(TMP, "sprint-052-full", {
      contractId:     "sprint-052-full",
      sprintNumber:   52,
      status:         "bound",
      iterationLimit: 3,
      mode:           "full",
    });

    await iterationSnapshotOnPass({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: { verdict: "pass", sprintNumber: 52 },
    });

    const iterDir = path.join(
      TMP,
      ".palantir-mini",
      "harness",
      "sprints",
      "sprint-052-full",
      "iterations",
      "iteration-001",
    );
    expect(fs.existsSync(iterDir)).toBe(true);
  });

  // ─── manifestRef determinism ─────────────────────────────────────────────
  test("manifestRef is deterministic for same inputs", async () => {
    writeContract(TMP, "sprint-052-full", {
      contractId:     "sprint-052-full",
      sprintNumber:   52,
      status:         "bound",
      iterationLimit: 3,
      mode:           "full",
    });

    const makePayload = () => ({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: {
        project:      TMP,
        iteration:    1,
        changedFiles: ["b.ts", "a.ts"],
      },
      tool_response: { verdict: "pass" as const },
    });

    const r1 = await iterationSnapshotOnPass(makePayload());
    const r2 = await iterationSnapshotOnPass(makePayload());

    const events = readEvents();
    const snapEvents = events.filter((e) => e["type"] === "iteration_snapshot_taken");
    // Both calls emitted a snapshot
    expect(snapEvents.length).toBeGreaterThanOrEqual(2);
    // Both have the same manifestRef (deterministic)
    const refs = snapEvents.map((e) => (e["payload"] as Record<string, unknown>)["manifestRef"]);
    expect(refs[0]).toBe(refs[1]);

    expect(r1.decision).toBe("continue");
    expect(r2.decision).toBe("continue");
  });

  // ─── no contract ─────────────────────────────────────────────────────────
  test("no contract: skips silently, no event", async () => {
    // Project exists but no sprint dirs
    const result = await iterationSnapshotOnPass({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: { verdict: "pass" },
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("no-bound-contract");

    const events = readEvents();
    expect(events.filter((e) => e["type"] === "iteration_snapshot_taken").length).toBe(0);
  });

  // ─── no harness dir ──────────────────────────────────────────────────────
  test("no harness dir: project with no .palantir-mini/harness/ → skip silently", async () => {
    const bare = fs.mkdtempSync(path.join(os.tmpdir(), "pm-no-harness-snap-"));
    fs.mkdirSync(path.join(bare, ".palantir-mini", "session"), { recursive: true });

    try {
      const result = await iterationSnapshotOnPass({
        tool_name:  TARGET_TOOL,
        cwd:        bare,
        session_id: SESSION_ID,
        tool_input: { project: bare, iteration: 1 },
        tool_response: { verdict: "pass" },
      });

      expect(result.decision).toBe("continue");
      expect(result.message).toContain("no-harness-dir");
    } finally {
      fs.rmSync(bare, { recursive: true, force: true });
    }
  });

  // ─── corrupt contract JSON ───────────────────────────────────────────────
  test("corrupt contract.json → fail-safe skip, no crash, decision=continue", async () => {
    const dir = path.join(TMP, ".palantir-mini", "harness", "sprints", "sprint-bad");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "contract.json"), "{ NOT VALID JSON !!!", "utf8");

    const result = await iterationSnapshotOnPass({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: { verdict: "pass" },
    });

    // Corrupt contract treated like no-contract
    expect(result.decision).toBe("continue");
    const events = readEvents();
    expect(events.filter((e) => e["type"] === "iteration_snapshot_taken").length).toBe(0);
  });

  // ─── undefined verdict (only verdict field absent) ───────────────────────
  test("no verdict field in tool_response → proceeds (verdict undefined = not explicitly non-pass)", async () => {
    writeContract(TMP, "sprint-052-full", {
      contractId:     "sprint-052-full",
      sprintNumber:   52,
      status:         "bound",
      iterationLimit: 3,
      mode:           "full",
    });

    const result = await iterationSnapshotOnPass({
      tool_name:  TARGET_TOOL,
      cwd:        TMP,
      session_id: SESSION_ID,
      tool_input: { project: TMP, iteration: 1 },
      tool_response: {}, // no verdict field
    });

    // When verdict is undefined (no explicit fail), hook should proceed and emit
    expect(result.decision).toBe("continue");
    // No crash
  });
});
