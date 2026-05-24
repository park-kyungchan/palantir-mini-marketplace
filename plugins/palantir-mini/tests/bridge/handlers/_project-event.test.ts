// palantir-mini — _project-event helper tests (v3.4.0 N4 wave 2)
// Coverage: resolveProjectPath fallback semantics + emitForProject env override
// (PALANTIR_MINI_PROJECT scoping). Helper not MCP-bridged but used by handlers
// like pre_sprint_diff (T9) to route emit() to the correct project events.jsonl.

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  emitForProject,
  resolveProjectPath,
} from "../../../bridge/handlers/_project-event";
import { readEvents } from "../../../lib/event-log/read";

function makeTmpRoot(label: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `pm-pe-${label}-`));
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

const tmpRoots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv["PALANTIR_MINI_PROJECT"] = process.env["PALANTIR_MINI_PROJECT"];
  savedEnv["PALANTIR_MINI_EVENTS_FILE"] = process.env["PALANTIR_MINI_EVENTS_FILE"];
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const r of tmpRoots.splice(0)) fs.rmSync(r, { recursive: true, force: true });
});

function setupRoot(label: string): string {
  const root = makeTmpRoot(label);
  tmpRoots.push(root);
  return root;
}

describe("resolveProjectPath", () => {
  test("returns trimmed input when string given", () => {
    expect(resolveProjectPath("/foo/bar")).toBe("/foo/bar");
  });

  test("trims whitespace from input", () => {
    expect(resolveProjectPath("  /foo/bar  ")).toBe("/foo/bar");
  });

  test("falls back to resolveProjectRoot() on undefined", () => {
    const result = resolveProjectPath(undefined);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("falls back to resolveProjectRoot() on empty string", () => {
    const result = resolveProjectPath("");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("falls back to resolveProjectRoot() on whitespace-only string", () => {
    const result = resolveProjectPath("   ");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("respects PALANTIR_MINI_PROJECT env when no arg", () => {
    process.env["PALANTIR_MINI_PROJECT"] = "/env/path";
    expect(resolveProjectPath(undefined)).toBe("/env/path");
  });

  test("explicit arg wins over env", () => {
    process.env["PALANTIR_MINI_PROJECT"] = "/env/path";
    expect(resolveProjectPath("/explicit/path")).toBe("/explicit/path");
  });
});

describe("emitForProject", () => {
  test("scopes events.jsonl to provided project (env override)", async () => {
    const root = setupRoot("scoped");
    process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsPathFor(root);

    await emitForProject(root, {
      type: "test_event_for_project_event_helper" as any,
      payload: { marker: "alpha" },
      toolName: "test",
      cwd: root,
      reasoning: "_project-event scoping smoke test",
    } as any);

    const events = readEvents(eventsPathFor(root));
    const found = events.filter((e: any) => e.type === "test_event_for_project_event_helper");
    expect(found.length).toBe(1);
    expect((found[0]!.payload as any).marker).toBe("alpha");
  });

  test("returns sequence number from emit()", async () => {
    const root = setupRoot("sequence");
    process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsPathFor(root);

    const seq = await emitForProject(root, {
      type: "test_event_seq" as any,
      payload: {},
      toolName: "test",
      cwd: root,
      reasoning: "sequence return",
    } as any);

    expect(typeof seq).toBe("number");
    expect(seq).toBeGreaterThan(0);
  });

  test("restores PALANTIR_MINI_PROJECT env after call (was set)", async () => {
    process.env["PALANTIR_MINI_PROJECT"] = "/preset/path";
    const root = setupRoot("env-restore-set");
    process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsPathFor(root);

    await emitForProject(root, {
      type: "test_env_restore" as any,
      payload: {},
      toolName: "test",
      cwd: root,
      reasoning: "env restore",
    } as any);

    expect(process.env["PALANTIR_MINI_PROJECT"]).toBe("/preset/path");
  });

  test("removes PALANTIR_MINI_PROJECT env after call (was unset)", async () => {
    delete process.env["PALANTIR_MINI_PROJECT"];
    const root = setupRoot("env-restore-unset");
    process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsPathFor(root);

    await emitForProject(root, {
      type: "test_env_restore_unset" as any,
      payload: {},
      toolName: "test",
      cwd: root,
      reasoning: "env restore unset",
    } as any);

    expect(process.env["PALANTIR_MINI_PROJECT"]).toBeUndefined();
  });

  test("undefined projectPath falls back to resolveProjectRoot()", async () => {
    const root = setupRoot("undefined-project");
    process.env["PALANTIR_MINI_PROJECT"] = root;
    process.env["PALANTIR_MINI_EVENTS_FILE"] = eventsPathFor(root);

    await emitForProject(undefined, {
      type: "test_undefined_project" as any,
      payload: {},
      toolName: "test",
      cwd: root,
      reasoning: "undefined fallback",
    } as any);

    const events = readEvents(eventsPathFor(root));
    expect(events.filter((e: any) => e.type === "test_undefined_project").length).toBe(1);
  });
});
