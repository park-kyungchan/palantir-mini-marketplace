import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { emit, type LogEnvelope } from "../../scripts/log";

const originalHostRuntime = process.env.PALANTIR_MINI_HOST_RUNTIME;
const originalEventsFile = process.env.PALANTIR_MINI_EVENTS_FILE;
const originalEventsFileForce = process.env.PALANTIR_MINI_EVENTS_FILE_FORCE;
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
