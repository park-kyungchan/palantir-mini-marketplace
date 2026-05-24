// palantir-mini v3.5.0 — task-completed-gate hook tests (D1)
// Coverage: happy path inbox sweep + 2 events + no inboxes path + malformed inbox best-effort
// + atomic write via tmp+rename + message/decision shape.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import taskCompletedGate, {
  cleanInboxForTask,
  listInboxFiles,
} from "../../hooks/task-completed-gate";

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tcg-"));
  tmpDirs.push(dir);
  return dir;
}

function writeInbox(root: string, name: string, messages: unknown[]): string {
  const sessionDir = path.join(root, ".palantir-mini", "session");
  fs.mkdirSync(sessionDir, { recursive: true });
  const inboxPath = path.join(sessionDir, `inbox-${name}.json`);
  fs.writeFileSync(inboxPath, JSON.stringify({ recipient: name, messages }, null, 2));
  return inboxPath;
}

function readEventsTypes(eventsFile: string): string[] {
  if (!fs.existsSync(eventsFile)) return [];
  return fs
    .readFileSync(eventsFile, "utf8")
    .trim()
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => (JSON.parse(l) as { type: string }).type);
}

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
});

afterEach(() => {
  if (savedEnv.PALANTIR_MINI_PROJECT === undefined) delete process.env.PALANTIR_MINI_PROJECT;
  else process.env.PALANTIR_MINI_PROJECT = savedEnv.PALANTIR_MINI_PROJECT;
  if (savedEnv.PALANTIR_MINI_EVENTS_FILE === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = savedEnv.PALANTIR_MINI_EVENTS_FILE;
  for (const d of tmpDirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

describe("listInboxFiles", () => {
  test("returns inbox-*.json paths under session dir", () => {
    const root = makeTmpDir();
    writeInbox(root, "alpha", []);
    writeInbox(root, "beta", []);
    fs.writeFileSync(
      path.join(root, ".palantir-mini", "session", "events.jsonl"),
      "",
    ); // not an inbox
    const list = listInboxFiles(root);
    expect(list.length).toBe(2);
    expect(list.every((p) => p.includes("inbox-"))).toBe(true);
  });

  test("returns empty when session dir does not exist", () => {
    const root = makeTmpDir();
    expect(listInboxFiles(root)).toEqual([]);
  });
});

describe("cleanInboxForTask", () => {
  test("removes task_assignment messages with matching taskId, atomic write", () => {
    const root = makeTmpDir();
    const inbox = writeInbox(root, "alpha", [
      { id: "m1", type: "task_assignment", taskId: "tsk-001", read: false },
      { id: "m2", type: "task_assignment", taskId: "tsk-002", read: false },
      { id: "m3", type: "broadcast", taskId: "tsk-001", read: false },
    ]);
    const removed = cleanInboxForTask(inbox, "tsk-001");
    expect(removed).toBe(1);
    const after = JSON.parse(fs.readFileSync(inbox, "utf8")) as {
      messages: Array<{ id: string }>;
    };
    expect(after.messages.length).toBe(2);
    expect(after.messages.map((m) => m.id).sort()).toEqual(["m2", "m3"]);
  });

  test("returns 0 when malformed JSON, never throws", () => {
    const root = makeTmpDir();
    const inbox = path.join(root, ".palantir-mini", "session", "inbox-x.json");
    fs.mkdirSync(path.dirname(inbox), { recursive: true });
    fs.writeFileSync(inbox, "{ not valid json");
    const removed = cleanInboxForTask(inbox, "any");
    expect(removed).toBe(0);
  });
});

describe("taskCompletedGate hook", () => {
  test("happy path — emits phase_completed + inbox_cleaned, returns continue with cleaned message", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    writeInbox(root, "alpha", [
      { id: "m1", type: "task_assignment", taskId: "tsk-001", read: false },
    ]);

    const result = await taskCompletedGate({
      task_id: "tsk-001",
      phase_tag: "ship",
      cwd: root,
    });

    expect(result.decision).toBe("continue");
    expect(result.message).toContain("tsk-001");
    expect(result.message).toContain("cleaned 1 inbox");
    const types = readEventsTypes(eventsFile);
    expect(types).toContain("phase_completed");
    expect(types).toContain("inbox_cleaned");
  });

  test("no inboxes — phase_completed emitted, no inbox_cleaned event", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    const result = await taskCompletedGate({ task_id: "tsk-002", cwd: root });
    expect(result.decision).toBe("continue");
    expect(result.message).not.toContain("cleaned");
    const types = readEventsTypes(eventsFile);
    expect(types).toContain("phase_completed");
    expect(types).not.toContain("inbox_cleaned");
  });

  test("payload defaults — missing task_id falls back to 'unknown-task'", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    const result = await taskCompletedGate({ cwd: root });
    expect(result.decision).toBe("continue");
    expect(result.message).toContain("unknown-task");
  });

  test("multiple inboxes — only inbox(es) with matching taskId surface in inbox_cleaned event", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    writeInbox(root, "alpha", [
      { id: "a1", type: "task_assignment", taskId: "tsk-A", read: false },
    ]);
    writeInbox(root, "beta", [
      { id: "b1", type: "task_assignment", taskId: "tsk-A", read: false },
      { id: "b2", type: "task_assignment", taskId: "tsk-B", read: false },
    ]);

    const result = await taskCompletedGate({ task_id: "tsk-A", cwd: root });
    expect(result.message).toContain("cleaned 2 inbox");

    // Verify inbox-beta.json still has b2 (tsk-B not touched)
    const betaInbox = JSON.parse(
      fs.readFileSync(path.join(root, ".palantir-mini", "session", "inbox-beta.json"), "utf8"),
    ) as { messages: Array<{ id: string }> };
    expect(betaInbox.messages.length).toBe(1);
    expect(betaInbox.messages[0]?.id).toBe("b2");
  });
});
