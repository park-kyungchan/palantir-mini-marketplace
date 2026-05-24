// palantir-mini v1.4 — task-completed-inbox-clean tests
// Phase A-4: dedicated inbox-clean hook for defect #9 prevention.
// Tests the new task-completed-inbox-clean.ts (companion to task-completed-gate.ts).

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import taskCompletedInboxClean, {
  listInboxFiles,
  cleanInboxForTask,
} from "../../hooks/task-completed-inbox-clean";
import { readEvents } from "../../lib/event-log/read";

function makeTmpProject(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-tcic-${label}-`));
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

describe("listInboxFiles (task-completed-inbox-clean)", () => {
  let tmpRoot: string;
  beforeEach(() => { tmpRoot = makeTmpProject("li"); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  test("returns absolute paths for inbox-*.json files", () => {
    writeInbox(tmpRoot, "a", []);
    writeInbox(tmpRoot, "b", []);
    const dir   = path.join(tmpRoot, ".palantir-mini", "session");
    const files = listInboxFiles(dir);
    expect(files.length).toBe(2);
    expect(files.every((f) => path.isAbsolute(f))).toBe(true);
  });

  test("returns empty array for nonexistent dir", () => {
    expect(listInboxFiles("/nonexistent/path")).toEqual([]);
  });

  test("ignores non-inbox files", () => {
    const dir = path.join(tmpRoot, ".palantir-mini", "session");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "other.json"), "{}");
    fs.writeFileSync(path.join(dir, "inbox-lead.json"), "{}");
    expect(listInboxFiles(dir).length).toBe(1);
  });
});

describe("cleanInboxForTask (task-completed-inbox-clean)", () => {
  let tmpRoot: string;
  beforeEach(() => { tmpRoot = makeTmpProject("ct"); });
  afterEach(() => { fs.rmSync(tmpRoot, { recursive: true, force: true }); });

  test("removes task_assignment matching taskId", () => {
    const f = writeInbox(tmpRoot, "r", [
      { id: "m1", type: "task_assignment", taskId: "t-1", read: false },
      { id: "m2", type: "status_update",   taskId: "t-1", read: false },
      { id: "m3", type: "task_assignment", taskId: "t-2", read: false },
    ]);
    const removed = cleanInboxForTask(f, "t-1");
    expect(removed).toBe(1);
    const reloaded = JSON.parse(fs.readFileSync(f, "utf8"));
    expect(reloaded.messages).toHaveLength(2);
  });

  test("returns 0 and does not rewrite when no match", () => {
    const f = writeInbox(tmpRoot, "r", [
      { id: "m1", type: "status_update", taskId: "t-1", read: false },
    ]);
    const before = fs.readFileSync(f, "utf8");
    const removed = cleanInboxForTask(f, "t-99");
    expect(removed).toBe(0);
    expect(fs.readFileSync(f, "utf8")).toBe(before);
  });

  test("removes multiple matching entries", () => {
    const f = writeInbox(tmpRoot, "r", [
      { id: "m1", type: "task_assignment", taskId: "t-42", read: false },
      { id: "m2", type: "task_assignment", taskId: "t-42", read: false },
      { id: "m3", type: "task_assignment", taskId: "t-42", read: false },
    ]);
    expect(cleanInboxForTask(f, "t-42")).toBe(3);
    const reloaded = JSON.parse(fs.readFileSync(f, "utf8"));
    expect(reloaded.messages).toEqual([]);
  });
});

describe("taskCompletedInboxClean hook integration", () => {
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

  test("emits phase_completed and inbox_cleaned when match found", async () => {
    writeInbox(tmpRoot, "lead", [
      { id: "m1", type: "task_assignment", taskId: "T-50", read: false },
      { id: "m2", type: "task_assignment", taskId: "T-51", read: false },
    ]);
    const res = await taskCompletedInboxClean({ task_id: "T-50", cwd: tmpRoot });
    expect(res.decision).toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "phase_completed")).toBe(true);
    const cleaned = events.find((e) => e.type === "inbox_cleaned");
    expect(cleaned).toBeDefined();
    expect((cleaned!.payload as { removedCount: number }).removedCount).toBe(1);
    expect((cleaned!.payload as { taskId: string }).taskId).toBe("T-50");
  });

  test("no inbox_cleaned event when no match", async () => {
    writeInbox(tmpRoot, "r", [
      { id: "m1", type: "status_update", taskId: "T-60", read: false },
    ]);
    await taskCompletedInboxClean({ task_id: "T-60", cwd: tmpRoot });
    const events = readEvents(eventsPathFor(tmpRoot));
    expect(events.some((e) => e.type === "inbox_cleaned")).toBe(false);
    expect(events.some((e) => e.type === "phase_completed")).toBe(true);
  });

  test("sweeps multiple inbox files simultaneously", async () => {
    for (const r of ["a", "b", "c"]) {
      writeInbox(tmpRoot, r, [{ id: `m-${r}`, type: "task_assignment", taskId: "T-70", read: false }]);
    }
    await taskCompletedInboxClean({ task_id: "T-70", cwd: tmpRoot });
    const events = readEvents(eventsPathFor(tmpRoot));
    const cleaned = events.find((e) => e.type === "inbox_cleaned");
    expect((cleaned!.payload as { removedCount: number }).removedCount).toBe(3);
    expect((cleaned!.payload as { inboxFiles: string[] }).inboxFiles).toHaveLength(3);
  });

  test("missing task_id defaults to 'unknown-task'", async () => {
    const res = await taskCompletedInboxClean({ cwd: tmpRoot });
    expect(res.decision).toBe("continue");
    const events = readEvents(eventsPathFor(tmpRoot));
    const phase  = events.find((e) => e.type === "phase_completed");
    expect((phase!.payload as { taskId: string }).taskId).toBe("unknown-task");
  });
});
