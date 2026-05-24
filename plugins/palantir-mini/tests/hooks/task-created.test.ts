// palantir-mini v3.5.0 — task-created hook tests (D2)
// Coverage: emit task_created event happy path + best-effort emit failure tolerance + payload defaults.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import taskCreated from "../../hooks/task-created";

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "task-created-"));
  tmpDirs.push(dir);
  return dir;
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

describe("taskCreated hook", () => {
  test("happy path — emits task_created with full payload, returns recorded message", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    const result = await taskCreated({
      task_id: "tsk-001",
      subject: "Cluster A",
      description: "5 handler decomps",
      session_id: "sess-1",
      cwd: root,
    });

    expect(result.message).toContain("task_created recorded");
    expect(result.message).toContain("tsk-001");
    expect(fs.existsSync(eventsFile)).toBe(true);
    const lastLine = fs.readFileSync(eventsFile, "utf8").trim().split("\n").pop()!;
    const event = JSON.parse(lastLine) as { type: string; payload: { taskId: string; subject?: string } };
    expect(event.type).toBe("task_created");
    expect(event.payload.taskId).toBe("tsk-001");
    expect(event.payload.subject).toBe("Cluster A");
  });

  test("payload defaults — missing task_id falls back to 'unknown', cwd defaults to process.cwd()", async () => {
    const root = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(root, ".palantir-mini", "session", "events.jsonl");

    const result = await taskCreated({});
    expect(result.message).toContain("unknown");
    expect(result.message).toMatch(/id=unknown/);
  });

  test("emit failure — best-effort tolerance, still returns message", async () => {
    // Point events file to an unwritable parent (read-only-like) — emit should
    // catch and return message regardless. We cannot make /proc/0 writable, so
    // we use a path containing a NUL char which fs.mkdir/append will reject.
    const root = makeTmpDir();
    process.env.PALANTIR_MINI_PROJECT = root;
    // Force event-log target into a path component the runtime cannot create
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(root, "\0invalid", "events.jsonl");

    const result = await taskCreated({ task_id: "tsk-002" });
    // Even on emit failure, hook returns success (best-effort)
    expect(result.message).toContain("task_created recorded");
    expect(result.message).toContain("tsk-002");
  });
});
