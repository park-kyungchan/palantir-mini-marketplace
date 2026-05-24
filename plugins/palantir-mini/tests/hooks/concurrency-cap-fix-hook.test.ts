// palantir-mini v3.7.0 — concurrency-cap-fix hook integration sibling (A.4 split)

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import concurrencyCapFix from "../../hooks/concurrency-cap-fix";

describe("concurrencyCapFix hook", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-ccf-evt-"));
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(tmpDir, "events.jsonl");
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  test("skips non in_progress transitions", async () => {
    const res = await concurrencyCapFix({ status: "completed", owner: "x" });
    expect(res.message).toContain("not an in_progress transition");
  });

  test("skips when no owner", async () => {
    const res = await concurrencyCapFix({ status: "in_progress" });
    expect(res.message).toContain("no owner");
  });

  test("allows first claim when only this task exists", async () => {
    const res = await concurrencyCapFix({
      status:  "in_progress",
      owner:   "clean-agent",
      task_id: "new-task",
      tasks:   [{ id: "new-task", owner: "clean-agent", status: "in_progress" }],
    });
    expect(res.decision).toBe("continue");
    expect(res.message).toContain("existing=0");
  });

  test("allows claim when existing < 2", async () => {
    const res = await concurrencyCapFix({
      status:  "in_progress",
      owner:   "a1",
      task_id: "t3",
      tasks:   [{ id: "t1", owner: "a1", status: "in_progress" }],
    });
    expect(res.decision).toBe("continue");
  });

  test("blocks when existing >= 2 (legacy decision + CC v2.1.89+ permissionDecision shape)", async () => {
    const res = await concurrencyCapFix({
      status:  "in_progress",
      owner:   "a1",
      task_id: "t3",
      tasks: [
        { id: "t1", owner: "a1", status: "in_progress" },
        { id: "t2", owner: "a1", status: "in_progress" },
      ],
    });
    expect(res.decision).toBe("block");                                   // legacy
    expect(res.hookSpecificOutput?.permissionDecision).toBe("deny");      // v1.5 sprint-053 W3C
    expect(res.hookSpecificOutput?.permissionDecisionReason).toBeTruthy();
    expect(res.reason).toContain("2 in_progress");
    expect(res.reason).toContain("global");
  });

  test("blocks when existing reaches 3 after exclusion", async () => {
    const res = await concurrencyCapFix({
      status:  "in_progress",
      owner:   "x",
      task_id: "t4",
      tasks: [
        { id: "t1", owner: "x", status: "in_progress" },
        { id: "t2", owner: "x", status: "in_progress" },
        { id: "t3", owner: "x", status: "in_progress" },
      ],
    });
    expect(res.decision).toBe("block");
    expect(res.hookSpecificOutput?.permissionDecision).toBe("deny");
  });

  test("reason mentions global task glob fix vs phase-a3 hardcode", async () => {
    const res = await concurrencyCapFix({
      status:  "in_progress",
      owner:   "bloated",
      task_id: "t99",
      tasks: [
        { id: "t1", owner: "bloated", status: "in_progress" },
        { id: "t2", owner: "bloated", status: "in_progress" },
      ],
    });
    expect(res.reason).toContain("ALL teams");
  });
});
