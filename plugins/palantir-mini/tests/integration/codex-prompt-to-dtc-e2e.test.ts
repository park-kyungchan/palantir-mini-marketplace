import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { runCodexHookAdapter } from "../../lib/codex/codex-hook-adapter";

const tmpDirs: string[] = [];
const savedEnv: Record<string, string | undefined> = {};
const PLUGIN_ROOT = path.resolve(import.meta.dir, "../..");

function makeTmpProject(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-codex-prompt-dtc-disabled-"));
  tmpDirs.push(root);
  fs.mkdirSync(path.join(root, ".palantir-mini", "session"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), "{\"name\":\"codex-prompt-dtc-disabled\"}\n");
  return root;
}

function eventsPathFor(root: string): string {
  return path.join(root, ".palantir-mini", "session", "events.jsonl");
}

beforeEach(() => {
  savedEnv.PALANTIR_MINI_PROJECT = process.env.PALANTIR_MINI_PROJECT;
  savedEnv.PALANTIR_MINI_EVENTS_FILE = process.env.PALANTIR_MINI_EVENTS_FILE;
  savedEnv.PALANTIR_MINI_HOST_RUNTIME = process.env.PALANTIR_MINI_HOST_RUNTIME;
  delete process.env.PALANTIR_MINI_PROJECT;
  delete process.env.PALANTIR_MINI_EVENTS_FILE;
  delete process.env.PALANTIR_MINI_HOST_RUNTIME;
});

afterEach(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Codex Prompt-to-DTC hook registration", () => {
  test("active Codex registry does not auto-capture UserPromptSubmit", async () => {
    const project = makeTmpProject();
    const adapterResult = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: project,
        session_id: "codex-disabled-session",
        turn_id: "turn-codex-disabled",
        prompt: "Do not auto-capture this Codex prompt.",
      },
      {
        home: os.tmpdir(),
        pluginRoot: PLUGIN_ROOT,
        hooksJsonPath: path.join(PLUGIN_ROOT, "hooks", "hooks.json"),
        bunPath: process.execPath,
        cwd: project,
        env: {
          ...process.env,
          PALANTIR_MINI_PROJECT: project,
          PALANTIR_MINI_EVENTS_FILE: eventsPathFor(project),
          PALANTIR_MINI_HOST_RUNTIME: "codex",
        },
      },
    );

    expect(adapterResult.matchedHooks).toEqual([]);
    expect(adapterResult.runs).toEqual([]);
    expect(adapterResult.response).toEqual({});
    expect(
      fs.existsSync(path.join(project, ".palantir-mini", "session", "prompt-front-door")),
    ).toBe(false);
  });
});
