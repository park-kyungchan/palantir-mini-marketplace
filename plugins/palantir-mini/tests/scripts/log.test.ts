import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit, resolveEmitRoot, type LogEnvelope } from "../../scripts/log";

const originalHostRuntime = process.env.PALANTIR_MINI_HOST_RUNTIME;
const originalEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
const originalEventsFileForce = process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
const originalProjectEnv = process.env.PALANTIR_MINI_PROJECT;
const tmpDirs: string[] = [];
type LogOverrides = Partial<Omit<LogEnvelope, "type" | "payload" | "toolName" | "cwd">>;

function restoreEnv(): void {
  if (originalHostRuntime === undefined) delete process.env.PALANTIR_MINI_HOST_RUNTIME;
  else process.env.PALANTIR_MINI_HOST_RUNTIME = originalHostRuntime;

  if (originalEventsFile === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE;
  else process.env.PALANTIR_MINI_EVENTS_FILE = originalEventsFile;

  if (originalEventsFileForce === undefined) delete process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
  else process.env.PALANTIR_MINI_EVENTS_FILE_FORCE = originalEventsFileForce;
}

function makeTmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-log-"));
  tmpDirs.push(dir);
  // Self-contained marker: makes this dir its own resolveEmitRoot() answer
  // regardless of ambient `.palantir-mini` state elsewhere under os.tmpdir()
  // (the exact stray-marker condition g10 guards against).
  fs.mkdirSync(path.join(dir, ".palantir-mini"), { recursive: true });
  return dir;
}

async function emitSessionStarted(overrides: LogOverrides = {}): Promise<Record<string, unknown>> {
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;

  const project = makeTmpProject();
  await emit({
    type: "session_started",
    payload: { model: "test-model", effort: "low" },
    toolName: "scripts/log.test",
    cwd: project,
    sessionId: "sess-log-test",
    valueGrade: "T1",
    ...overrides,
  });

  const eventsPath = path.join(project, ".palantir-mini", "session", "events.jsonl");
  return JSON.parse(fs.readFileSync(eventsPath, "utf8").trim()) as Record<string, unknown>;
}

afterEach(() => {
  restoreEnv();
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("scripts/log emit identity defaulting", () => {
  test("uses PALANTIR_MINI_HOST_RUNTIME when identity is omitted", async () => {
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";

    const row = await emitSessionStarted();

    expect((row.byWhom as { identity?: string }).identity).toBe("codex");
  });

  test("uses explicit identity before PALANTIR_MINI_HOST_RUNTIME", async () => {
    process.env.PALANTIR_MINI_HOST_RUNTIME = "codex";

    const row = await emitSessionStarted({ identity: "monitor" });

    expect((row.byWhom as { identity?: string }).identity).toBe("monitor");
  });

  test("uses explicit runtime before PALANTIR_MINI_HOST_RUNTIME", async () => {
    process.env.PALANTIR_MINI_HOST_RUNTIME = "claude";

    const row = await emitSessionStarted({ runtime: "gemini" });

    const byWhom = row.byWhom as { identity?: string; runtime?: string };
    expect(byWhom.identity).toBe("gemini");
    expect(byWhom.runtime).toBe("gemini");
  });

  test("falls back to claude-code when no runtime identity is available", async () => {
    delete process.env.PALANTIR_MINI_HOST_RUNTIME;

    const row = await emitSessionStarted();

    expect((row.byWhom as { identity?: string }).identity).toBe("claude-code");
  });
});

// F1b — hook-side emit() choke: edit_committed / submission_criteria_failed assert the
// governed commit path ran and may ONLY originate from lib/actions/commit.ts (the
// ActionType write-back gate, ssot/palantir approval-and-lineage). A hook reaching emit()
// with these types is forging commit-provenance → fail closed. Non-reserved types pass.
describe("scripts/log emit reserved commit-provenance choke (F1b)", () => {
  async function emitType(type: string): Promise<number> {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
    delete process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
    const project = makeTmpProject();
    return emit({
      type: type as LogEnvelope["type"],
      payload: { driftType: "stale_codegen", affectedObjectType: "x.ts" } as LogEnvelope["payload"],
      toolName: "scripts/log.test",
      cwd: project,
      sessionId: "sess-choke-test",
      identity: "claude-code",
    });
  }

  test("emit() THROWS on edit_committed (reserved)", async () => {
    await expect(emitType("edit_committed")).rejects.toThrow(/reserved commit-provenance type/);
  });

  test("emit() THROWS on submission_criteria_failed (reserved)", async () => {
    await expect(emitType("submission_criteria_failed")).rejects.toThrow(/reserved commit-provenance type/);
  });

  test("emit() reserved-type throw carries errorClass reserved_provenance_type_hook_emit", async () => {
    let caught: (Error & { errorClass?: string }) | undefined;
    try {
      await emitType("edit_committed");
    } catch (e) {
      caught = e as Error & { errorClass?: string };
    }
    expect(caught).toBeDefined();
    expect(caught!.errorClass).toBe("reserved_provenance_type_hook_emit");
  });

  test("emit() PASSES drift_detected (not reserved)", async () => {
    await expect(emitType("drift_detected")).resolves.toBeGreaterThanOrEqual(0);
  });

  test("emit() PASSES a normal non-reserved type (session_started)", async () => {
    delete process.env.PALANTIR_MINI_EVENTS_FILE;
    delete process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
    const project = makeTmpProject();
    const seq = await emit({
      type: "session_started",
      payload: { model: "test-model", effort: "low" },
      toolName: "scripts/log.test",
      cwd: project,
      sessionId: "sess-choke-test",
      identity: "claude-code",
    });
    expect(seq).toBeGreaterThanOrEqual(0);
  });
});

// g10 fix — resolveEmitRoot() resolution order: PALANTIR_MINI_PROJECT, when
// set, is the highest-priority explicit override (wins over a supplied cwd
// too); otherwise findProjectRoot() is now actually consulted so a deep
// startDir resolves to its ancestor marker; falls back to the raw startDir
// when no marker exists anywhere up the chain.
describe("scripts/log resolveEmitRoot resolution order", () => {
  afterEach(() => {
    if (originalProjectEnv === undefined) delete process.env.PALANTIR_MINI_PROJECT;
    else process.env.PALANTIR_MINI_PROJECT = originalProjectEnv;
  });

  test("PALANTIR_MINI_PROJECT wins over process.cwd() when no cwd is supplied (env override wins)", () => {
    const projectDir = makeTmpProject();
    fs.mkdirSync(path.join(projectDir, ".palantir-mini"), { recursive: true });
    process.env.PALANTIR_MINI_PROJECT = projectDir;

    expect(resolveEmitRoot(undefined)).toBe(projectDir);
  });

  test("findProjectRoot walks a deep supplied cwd up to its ancestor marker (findProjectRoot used otherwise)", () => {
    delete process.env.PALANTIR_MINI_PROJECT;
    const projectDir = makeTmpProject();
    fs.mkdirSync(path.join(projectDir, ".palantir-mini"), { recursive: true });
    const deepCwd = path.join(projectDir, "a", "b", "c");
    fs.mkdirSync(deepCwd, { recursive: true });

    expect(resolveEmitRoot(deepCwd)).toBe(projectDir);
  });

  test("falls back to the raw startDir when no marker exists anywhere up the chain", () => {
    delete process.env.PALANTIR_MINI_PROJECT;
    // Deliberately NOT makeTmpProject() (which now self-seeds a marker) — this
    // case needs a startDir with no marker anywhere in its ancestry. Stub
    // existsSync so ambient stray `.palantir-mini` markers elsewhere under
    // os.tmpdir() (the exact g10 condition) can't false-positive the walk.
    const bareDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-log-bare-"));
    tmpDirs.push(bareDir);
    const noMarkerCwd = path.join(bareDir, "a", "b");
    fs.mkdirSync(noMarkerCwd, { recursive: true });

    const existsSpy = spyOn(fs, "existsSync").mockReturnValue(false);
    try {
      expect(resolveEmitRoot(noMarkerCwd)).toBe(noMarkerCwd);
    } finally {
      existsSpy.mockRestore();
    }
  });

  test("PALANTIR_MINI_PROJECT wins over a supplied cwd (explicit override is highest priority)", () => {
    const handlerProject = makeTmpProject();
    fs.mkdirSync(path.join(handlerProject, ".palantir-mini"), { recursive: true });
    const envProject = makeTmpProject();
    fs.mkdirSync(path.join(envProject, ".palantir-mini"), { recursive: true });
    process.env.PALANTIR_MINI_PROJECT = envProject;

    expect(resolveEmitRoot(handlerProject)).toBe(envProject);
  });
});
