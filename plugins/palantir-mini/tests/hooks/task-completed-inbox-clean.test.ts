// palantir-mini v1.1 — task-completed inbox clean tests
// Defect #9 coverage: TaskCompleted sweeps inbox-*.json files, removes stale
// task_assignment entries, emits inbox_cleaned event.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import taskCompletedGate, {
  listInboxFiles,
  cleanInboxForTask,
} from "../../hooks/task-completed-gate";
import { readEvents } from "../../lib/event-log/read";

function makeTmpProject(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-tc-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

function writeInbox(root: string, recipient: string, messages: unknown[]): string {
  const dir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `inbox-${recipient}.json`);
  fs.writeFileSync(file, JSON.stringify({ recipient, messages }), "utf8");
  return file;
}

describe("cleanInboxForTask helper", () => {
  let tmpRoot: string;
  beforeEach(() => { tmpRoot = makeTmpProject("h"); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  test("matching task_assignment removed; count returned", () => {
    const f = writeInbox(tmpRoot, "lead", [
      { id: "m1", type: "task_assignment", taskId: "t-1", read: false },
      { id: "m2", type: "status_update",   taskId: "t-1", read: false },
      { id: "m3", type: "task_assignment", taskId: "t-2", read: false },
    ]);
    const removed = cleanInboxForTask(f, "t-1");
    expect(removed).toBe(1);
    const reloaded = JSON.parse(fs.readFileSync(f, "utf8"));
    expect(reloaded.messages).toHaveLength(2);
    const ids = (reloaded.messages as Array<{ id: string }>).map((m) => m.id);
    expect(ids).toEqual(["m2", "m3"]);
  });

  test("no match returns 0 and does not rewrite", () => {
    const f = writeInbox(tmpRoot, "lead", [{ id: "m1", type: "status_update", taskId: "t-1", read: false }]);
    const before = fs.readFileSync(f, "utf8");
    const removed = cleanInboxForTask(f, "t-99");
    expect(removed).toBe(0);
    expect(fs.readFileSync(f, "utf8")).toBe(before);
  });

  test("multiple matches all removed", () => {
    const f = writeInbox(tmpRoot, "lead", [
      { id: "m1", type: "task_assignment", taskId: "t-42", read: false },
      { id: "m2", type: "task_assignment", taskId: "t-42", read: false },
      { id: "m3", type: "task_assignment", taskId: "t-42", read: false },
    ]);
    const removed = cleanInboxForTask(f, "t-42");
    expect(removed).toBe(3);
    const reloaded = JSON.parse(fs.readFileSync(f, "utf8"));
    expect(reloaded.messages).toEqual([]);
  });

  test("listInboxFiles returns absolute paths", () => {
    writeInbox(tmpRoot, "a", []);
    writeInbox(tmpRoot, "b", []);
    const files = listInboxFiles(tmpRoot);
    expect(files.length).toBe(2);
    expect(files.every((f) => path.isAbsolute(f))).toBe(true);
  });
});

describe("task-completed integration", () => {
  let tmpRoot: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpRoot = makeTmpProject("integ");
    savedEnv.PALANTIR_MINI_PROJECT     = process.env.PALANTIR_MINI_PROJECT;
    savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
    process.env.PALANTIR_MINI_PROJECT     = tmpRoot;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsPathFor(tmpRoot);
  });

  afterEach(() => {
    for (const k of Object.keys(savedEnv)) {
      const v = savedEnv[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  test("phase_completed always emitted; inbox_cleaned when matches present", async () => {
    writeInbox(tmpRoot, "researcher", [
      { id: "m1", type: "task_assignment", taskId: "T-10", read: false },
      { id: "m2", type: "task_assignment", taskId: "T-11", read: false },
    ]);
    const res = await taskCompletedGate({ task_id: "T-10", phase_tag: "P1", cwd: tmpRoot });
    expect(res.decision).toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "phase_completed")).toBe(true);
    const cleaned = events.find((e) => e.type === "inbox_cleaned");
    expect(cleaned).toBeDefined();
    expect((cleaned!.payload as { removedCount: number }).removedCount).toBe(1);
    expect((cleaned!.payload as { taskId: string }).taskId).toBe("T-10");
  });

  test("no matching task_assignment → no inbox_cleaned event", async () => {
    writeInbox(tmpRoot, "r", [{ id: "m1", type: "status_update", taskId: "T-20", read: false }]);
    await taskCompletedGate({ task_id: "T-20", cwd: tmpRoot });
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "inbox_cleaned")).toBe(false);
    expect(events.some((e) => e.type === "phase_completed")).toBe(true);
  });

  test("multiple inbox files swept simultaneously", async () => {
    writeInbox(tmpRoot, "a", [{ id: "m1", type: "task_assignment", taskId: "T-30", read: false }]);
    writeInbox(tmpRoot, "b", [{ id: "m2", type: "task_assignment", taskId: "T-30", read: false }]);
    writeInbox(tmpRoot, "c", [{ id: "m3", type: "task_assignment", taskId: "T-30", read: false }]);
    await taskCompletedGate({ task_id: "T-30", cwd: tmpRoot });
    const events = readEvents(eventsPathFor(tmpRoot));
    const cleaned = events.find((e) => e.type === "inbox_cleaned");
    expect((cleaned!.payload as { removedCount: number }).removedCount).toBe(3);
    expect((cleaned!.payload as { inboxFiles: string[] }).inboxFiles).toHaveLength(3);
  });

  test("missing task_id falls back gracefully", async () => {
    const res = await taskCompletedGate({ cwd: tmpRoot });
    expect(res.decision).toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    const phase = events.find((e) => e.type === "phase_completed");
    expect((phase!.payload as { taskId: string }).taskId).toBe("unknown-task");
  });
});
