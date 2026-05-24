// palantir-mini v3.5.0 — teammate-idle hook tests (D3)
// Coverage: happy path no shutdown + shutdown gate triggered + threshold boundary
// + emit failure tolerance + message/context shape.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import teammateIdle from "../../hooks/teammate-idle";

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "teammate-idle-"));
  tmpDirs.push(dir);
  return dir;
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

describe("teammateIdle hook", () => {
  test("happy path — emits teammate_idle, no shutdown when idle below threshold", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    const result = await teammateIdle({
      agent_id: "alpha",
      idle_count: 1,
      blocked_by_depth: 0,
      cwd: root,
    });

    expect(result.message).toContain("teammate_idle recorded");
    expect(result.message).toContain("agent=alpha");
    expect(result.additionalContext).toBeUndefined();
    const types = readEventsTypes(eventsFile);
    expect(types).toContain("teammate_idle");
    expect(types).not.toContain("shutdown_request");
  });

  test("shutdown gate triggered — idleCount=3 + blockedByDepth=2 emits shutdown_request + additionalContext", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    const result = await teammateIdle({
      agent_id: "beta",
      idle_count: 3,
      blocked_by_depth: 2,
      cwd: root,
    });

    expect(result.message).toContain("agent=beta");
    expect(result.additionalContext).toBeDefined();
    expect(result.additionalContext).toContain("auto-shutdown");
    expect(result.additionalContext).toContain("agent=beta");
    const types = readEventsTypes(eventsFile);
    expect(types).toContain("teammate_idle");
    expect(types).toContain("shutdown_request");
  });

  test("threshold boundary — idleCount=3 + blockedByDepth=1 does NOT shutdown (depth must exceed 1)", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    const result = await teammateIdle({
      agent_id: "gamma",
      idle_count: 3,
      blocked_by_depth: 1,
      cwd: root,
    });

    expect(result.additionalContext).toBeUndefined();
    const types = readEventsTypes(eventsFile);
    expect(types).toContain("teammate_idle");
    expect(types).not.toContain("shutdown_request");
  });

  test("threshold boundary — idleCount=2 + blockedByDepth=5 does NOT shutdown (idle must reach 3)", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    const result = await teammateIdle({
      agent_id: "delta",
      idle_count: 2,
      blocked_by_depth: 5,
      cwd: root,
    });

    expect(result.additionalContext).toBeUndefined();
    const types = readEventsTypes(eventsFile);
    expect(types).not.toContain("shutdown_request");
  });

  test("payload defaults — missing fields fall back to safe values, no shutdown", async () => {
    const root = makeTmpDir();
    const eventsFile = path.join(root, ".palantir-mini", "session", "events.jsonl");
    process.env.PALANTIR_MINI_PROJECT = root;
    process.env.PALANTIR_MINI_EVENTS_FILE = eventsFile;

    const result = await teammateIdle({});
    expect(result.message).toContain("agent=unknown");
    expect(result.message).toContain("idleCount=0");
    expect(result.additionalContext).toBeUndefined();
  });
});
