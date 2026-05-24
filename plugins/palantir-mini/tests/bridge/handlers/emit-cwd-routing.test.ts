/**
 * palantir-mini v2.13.1 — emit() cwd routing regression suite (B-30).
 *
 * Covers: handler-supplied env.cwd takes precedence over projectRoot() / env
 * var fallback so audit trail lands in the project the handler was invoked
 * for, not the MCP server's launch cwd.
 *
 * Regression guard: harness-h4 canary (2026-04-24) observed all Playwright +
 * grading events routing to ~/.palantir-mini/session/events.jsonl even though
 * the handlers resolved `project = args.projectPath` for palantir-math.
 * Audit trail split violated rule 10 (events.jsonl append-only substrate).
 */

import { test, expect, describe, afterEach, beforeEach } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { emit, eventsPathFor } from "../../../scripts/log";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};

function makeProjectDir(label: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `pm-emit-routing-${label}-`));
  fs.mkdirSync(path.join(dir, ".palantir-mini", "session"), { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_PARENT_PROJECT = process.env.PALANTIR_MINI_PARENT_PROJECT;
  delete process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_PARENT_PROJECT;
});

afterEach(() => {
  for (const k of Object.keys(savedEnv)) {
    const v = savedEnv[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function toolInvocationPayload(toolName: string, durationMs = 12): {
  toolName: string;
  durationMs: number;
  success: boolean;
} {
  return { toolName, durationMs, success: true };
}

describe("emit() cwd routing (B-30 regression)", () => {
  test("explicit env.cwd overrides projectRoot() — event lands in handler's project", async () => {
    const handlerProject = makeProjectDir("handler");
    const homeProject = makeProjectDir("home");
    // Simulate MCP server launched from home
    process.env.PALANTIR_MINI_PROJECT = homeProject;

    const seq = await emit({
      type: "tool_invocation_completed",
      toolName: "test-handler",
      cwd: handlerProject,
      reasoning: "B-30 routing probe",
      payload: toolInvocationPayload("test-handler"),
    });
    expect(typeof seq).toBe("number");

    const handlerEvents = eventsPathFor(handlerProject);
    const homeEvents = eventsPathFor(homeProject);
    expect(fs.existsSync(handlerEvents)).toBe(true);
    // Home events file should NOT exist since routing resolved to handlerProject
    expect(fs.existsSync(homeEvents)).toBe(false);

    const raw = fs.readFileSync(handlerEvents, "utf8").trim();
    const parsed = JSON.parse(raw);
    expect(parsed.type).toBe("tool_invocation_completed");
    expect(parsed.throughWhich.cwd).toBe(handlerProject);
  });

  test("foreign PALANTIR_MINI_EVENTS_FILE override does not steal explicit env.cwd events", async () => {
    const handlerProject = makeProjectDir("handler-foreign-override");
    const foreignProject = makeProjectDir("foreign-override");
    process.env.PALANTIR_MINI_EVENTS_FILE = path.join(foreignProject, ".palantir-mini", "session", "events.jsonl");

    await emit({
      type: "tool_invocation_completed",
      toolName: "test-handler",
      cwd: handlerProject,
      reasoning: "B-30 routing probe with foreign events override",
      payload: toolInvocationPayload("test-handler"),
    });

    const handlerEvents = eventsPathFor(handlerProject);
    const foreignEvents = path.join(foreignProject, ".palantir-mini", "session", "events.jsonl");
    expect(fs.existsSync(handlerEvents)).toBe(true);
    expect(fs.existsSync(foreignEvents)).toBe(false);
  });

  test("empty env.cwd falls back to projectRoot() — env var honored", async () => {
    const fallbackProject = makeProjectDir("fallback");
    process.env.PALANTIR_MINI_PROJECT = fallbackProject;

    const seq = await emit({
      type: "tool_invocation_completed",
      toolName: "test-handler",
      cwd: "",
      payload: toolInvocationPayload("test-handler"),
    });
    expect(typeof seq).toBe("number");

    const fallbackEvents = eventsPathFor(fallbackProject);
    expect(fs.existsSync(fallbackEvents)).toBe(true);
    const raw = fs.readFileSync(fallbackEvents, "utf8").trim();
    const parsed = JSON.parse(raw);
    expect(parsed.payload.toolName).toBe("test-handler");
  });

  test("two sequential emits with different env.cwd land in separate project logs", async () => {
    const projectA = makeProjectDir("parallel-a");
    const projectB = makeProjectDir("parallel-b");

    await emit({
      type: "tool_invocation_completed",
      toolName: "handler-a",
      cwd: projectA,
      payload: toolInvocationPayload("handler-a"),
    });
    await emit({
      type: "tool_invocation_completed",
      toolName: "handler-b",
      cwd: projectB,
      payload: toolInvocationPayload("handler-b"),
    });

    const eventsA = fs.readFileSync(eventsPathFor(projectA), "utf8").trim();
    const eventsB = fs.readFileSync(eventsPathFor(projectB), "utf8").trim();
    expect(JSON.parse(eventsA).payload.toolName).toBe("handler-a");
    expect(JSON.parse(eventsB).payload.toolName).toBe("handler-b");
    // Neither file leaks into the other project
    expect(eventsA.includes("handler-b")).toBe(false);
    expect(eventsB.includes("handler-a")).toBe(false);
  });
});
