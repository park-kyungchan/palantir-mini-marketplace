import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  extractPromptFrontDoorIdentityContext,
  runCodexHookAdapter,
} from "../../lib/codex/codex-hook-adapter";

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

// QUARANTINED skip-with-written-reason (2026-06-10): the Codex runtime lane is ON HOLD by user
// directive (backlog HANDOFF §0 — ~/harness-upstream/_workspace/2026-06-10-pm-backlog-completion/
// HANDOFF-2026-06-10-backlog-completion.md, W6a). These Codex-exclusive e2e cases fail on main and
// are intentionally skipped — do NOT fix, modify, or delete them while the hold lasts; un-skip when
// the Codex lane resumes.
describe.skip("Codex Prompt-to-DTC hook registration", () => {
  test("active Codex registry captures UserPromptSubmit prompt-front-door identity", async () => {
    const project = makeTmpProject();
    const adapterResult = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: project,
        session_id: "codex-capture-session",
        turn_id: "turn-codex-capture",
        prompt: "Use palantir-mini to start Prompt Front Door capture for this Codex prompt.",
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

    expect(adapterResult.matchedHooks.map((hook) => hook.command)).toEqual([
      expect.stringContaining("prompt-front-door-capture"),
      expect.stringContaining("context-capsule-init"),
    ]);
    expect(adapterResult.runs.length).toBe(2);
    const additionalContext =
      (adapterResult.response.hookSpecificOutput as { additionalContext?: string } | undefined)
        ?.additionalContext ?? "";
    const identity = extractPromptFrontDoorIdentityContext(additionalContext);
    expect(identity?.sessionId).toBe("codex-capture-session");
    expect(identity?.runtime).toBe("codex");
    expect(
      fs.existsSync(path.join(project, ".palantir-mini", "session", "prompt-front-door")),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(
          project,
          ".palantir-mini",
          "session",
          "prompt-front-door",
          "current",
          "codex-codex-capture-session.json",
        ),
      ),
    ).toBe(true);
  });

  test("path-mentioned project root captures UserPromptSubmit when Codex cwd is outside the project", async () => {
    const project = makeTmpProject();
    const detachedCwd = fs.mkdtempSync(path.join(os.tmpdir(), "pm-codex-detached-cwd-"));
    tmpDirs.push(detachedCwd);
    fs.mkdirSync(path.join(detachedCwd, ".palantir-mini", "session"), { recursive: true });

    const adapterResult = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: detachedCwd,
        session_id: "codex-path-session",
        turn_id: "turn-codex-path-capture",
        prompt: `palantir-mini로 ${project} Ontology Engineering을 진행해.`,
      },
      {
        home: os.tmpdir(),
        pluginRoot: PLUGIN_ROOT,
        hooksJsonPath: path.join(PLUGIN_ROOT, "hooks", "hooks.json"),
        bunPath: process.execPath,
        cwd: detachedCwd,
        env: {
          ...process.env,
          PALANTIR_MINI_HOST_RUNTIME: "codex",
        },
      },
    );

    expect(adapterResult.matchedHooks.map((hook) => hook.command)).toEqual([
      expect.stringContaining("prompt-front-door-capture"),
      expect.stringContaining("context-capsule-init"),
    ]);
    const additionalContext =
      (adapterResult.response.hookSpecificOutput as { additionalContext?: string } | undefined)
        ?.additionalContext ?? "";
    const identity = extractPromptFrontDoorIdentityContext(additionalContext);
    expect(identity?.sessionId).toBe("codex-path-session");
    expect(
      fs.existsSync(
        path.join(
          project,
          ".palantir-mini",
          "session",
          "prompt-front-door",
          "current",
          "codex-codex-path-session.json",
        ),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(detachedCwd, ".palantir-mini", "session", "prompt-front-door")),
    ).toBe(false);
  });

  test("short UserPromptSubmit continuation captures after prior prompt-front-door state", async () => {
    const project = makeTmpProject();
    const options = {
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
    };

    await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: project,
        session_id: "codex-continuation-session",
        turn_id: "turn-codex-continuation-start",
        prompt: "palantir-mini로 turn-by-turn Ontology Engineering을 진행해.",
      },
      options,
    );

    const continuationResult = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: project,
        session_id: "codex-continuation-session",
        turn_id: "turn-codex-continuation-a",
        prompt: "A",
      },
      options,
    );

    expect(continuationResult.matchedHooks.map((hook) => hook.command)).toEqual([
      expect.stringContaining("prompt-front-door-capture"),
      expect.stringContaining("context-capsule-init"),
    ]);
    const additionalContext =
      (continuationResult.response.hookSpecificOutput as { additionalContext?: string } | undefined)
        ?.additionalContext ?? "";
    const identity = extractPromptFrontDoorIdentityContext(additionalContext);
    expect(identity?.sessionId).toBe("codex-continuation-session");

    const pointer = JSON.parse(
      fs.readFileSync(
        path.join(
          project,
          ".palantir-mini",
          "session",
          "prompt-front-door",
          "current",
          "codex-codex-continuation-session.json",
        ),
        "utf8",
      ),
    ) as { promptId: string };
    const envelope = JSON.parse(
      fs.readFileSync(
        path.join(
          project,
          ".palantir-mini",
          "session",
          "prompt-front-door",
          "sessions",
          "codex-continuation-session",
          `${pointer.promptId}.json`,
        ),
        "utf8",
      ),
    ) as { promptExcerpt: string; previousPromptHash?: string };
    expect(envelope.promptExcerpt).toBe("A");
    expect(typeof envelope.previousPromptHash).toBe("string");
  });

  test("short continuation reuses the path-mentioned project root when cwd is another tracked project", async () => {
    const project = makeTmpProject();
    const detachedCwd = fs.mkdtempSync(path.join(os.tmpdir(), "pm-codex-detached-continuation-"));
    const runtimeHome = fs.mkdtempSync(path.join(os.tmpdir(), "pm-codex-runtime-home-"));
    tmpDirs.push(detachedCwd, runtimeHome);
    fs.mkdirSync(path.join(detachedCwd, ".palantir-mini", "session"), { recursive: true });

    const options = {
      home: runtimeHome,
      pluginRoot: PLUGIN_ROOT,
      hooksJsonPath: path.join(PLUGIN_ROOT, "hooks", "hooks.json"),
      bunPath: process.execPath,
      cwd: detachedCwd,
      env: {
        ...process.env,
        PALANTIR_MINI_HOST_RUNTIME: "codex",
      },
    };

    await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: detachedCwd,
        session_id: "codex-path-continuation-session",
        turn_id: "turn-codex-path-continuation-start",
        prompt: `palantir-mini로 ${project} Ontology Engineering을 진행해.`,
      },
      options,
    );

    const continuationResult = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: detachedCwd,
        session_id: "codex-path-continuation-session",
        turn_id: "turn-codex-path-continuation-a",
        prompt: "A",
      },
      options,
    );

    expect(continuationResult.matchedHooks.map((hook) => hook.command)).toEqual([
      expect.stringContaining("prompt-front-door-capture"),
      expect.stringContaining("context-capsule-init"),
    ]);
    const projectPointerPath = path.join(
      project,
      ".palantir-mini",
      "session",
      "prompt-front-door",
      "current",
      "codex-codex-path-continuation-session.json",
    );
    expect(fs.existsSync(projectPointerPath)).toBe(true);
    expect(
      fs.existsSync(path.join(detachedCwd, ".palantir-mini", "session", "prompt-front-door")),
    ).toBe(false);

    const pointer = JSON.parse(fs.readFileSync(projectPointerPath, "utf8")) as { promptId: string };
    const envelope = JSON.parse(
      fs.readFileSync(
        path.join(
          project,
          ".palantir-mini",
          "session",
          "prompt-front-door",
          "sessions",
          "codex-path-continuation-session",
          `${pointer.promptId}.json`,
        ),
        "utf8",
      ),
    ) as { promptExcerpt: string; previousPromptHash?: string };
    expect(envelope.promptExcerpt).toBe("A");
    expect(typeof envelope.previousPromptHash).toBe("string");
  });
});
