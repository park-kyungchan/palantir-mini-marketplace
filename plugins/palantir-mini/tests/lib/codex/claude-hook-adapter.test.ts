import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  extractPromptFrontDoorIdentityContext,
  loadHooks,
  runCodexHookAdapter,
  runCodexHookAdapterCli,
  type CodexAdapterOptions,
  type HooksDocument,
} from "../../../lib/codex/claude-hook-adapter";

const tmpDirs: string[] = [];

function makePlugin(hooks: HooksDocument, env: Record<string, string | undefined> = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pm-codex-adapter-"));
  tmpDirs.push(root);
  fs.mkdirSync(path.join(root, "hooks"), { recursive: true });
  fs.writeFileSync(path.join(root, "hooks", "hooks.json"), `${JSON.stringify(hooks, null, 2)}\n`);
  fs.writeFileSync(
    path.join(root, "hooks", "fake-hook.ts"),
    [
      "import { appendFileSync } from 'node:fs';",
      "const mode = process.argv[2] ?? '';",
      "const text = await Bun.stdin.text();",
      "const payload = text.trim() ? JSON.parse(text) : {};",
      "if (process.env.FAKE_HOOK_RECORD_PATH) {",
      "  appendFileSync(process.env.FAKE_HOOK_RECORD_PATH, `${JSON.stringify({ mode, payload })}\\n`);",
      "}",
      "if (mode === 'user-context') {",
      "  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: `gate ${payload.prompt}` } }));",
      "} else if (mode === 'deny-pretool') {",
      "  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'blocked by fake hook' } }));",
      "} else if (mode === 'stop-block') {",
      "  console.log(JSON.stringify({ decision: 'block', reason: 'run one more verification pass' }));",
      "} else if (mode === 'stop-context') {",
      "  console.log(JSON.stringify({ systemMessage: 'stop hook context' }));",
      "} else if (mode === 'sleep') {",
      "  await new Promise((resolve) => setTimeout(resolve, 1200));",
      "  console.log(JSON.stringify({ message: 'awake' }));",
      "} else {",
      "  console.log(JSON.stringify({ message: `fake ${mode}` }));",
      "}",
    ].join("\n"),
  );
  const options: CodexAdapterOptions = {
    home: root,
    pluginRoot: root,
    hooksJsonPath: path.join(root, "hooks", "hooks.json"),
    bunPath: process.execPath,
    cwd: root,
    env: { ...process.env, ...env },
  };
  return { root, options };
}

function command(mode: string): string {
  return `bun run "${"${CLAUDE_PLUGIN_ROOT}"}/hooks/fake-hook.ts" ${mode}`;
}

function readProjectEvents(projectRoot: string): Array<Record<string, unknown>> {
  const eventsPath = path.join(projectRoot, ".palantir-mini", "session", "events.jsonl");
  if (!fs.existsSync(eventsPath)) return [];
  return fs
    .readFileSync(eventsPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Codex Claude hook adapter", () => {
  test("UserPromptSubmit surfaces hookSpecificOutput.additionalContext", async () => {
    const { root, options } = makePlugin({
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [{ type: "command", command: command("user-context"), timeout: 3 }],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "UserPromptSubmit",
      { cwd: root, turn_id: "turn-1", prompt: "approve DTC" },
      options,
    );

    expect(result.response).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: "gate approve DTC",
      },
    });
  });

  test("adapter live-reads hooks.json between invocations", async () => {
    const { root, options } = makePlugin({
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [{ type: "command", command: command("user-context"), timeout: 3 }],
          },
        ],
      },
    });

    const first = await runCodexHookAdapter(
      "UserPromptSubmit",
      { cwd: root, turn_id: "turn-live-read-1", prompt: "first prompt" },
      options,
    );

    expect(first.matchedHooks.map((hook) => hook.command)).toEqual([command("user-context")]);
    expect(first.response).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: "gate first prompt",
      },
    });

    fs.writeFileSync(
      path.join(root, "hooks", "hooks.json"),
      `${JSON.stringify(
        {
          hooks: {
            UserPromptSubmit: [
              {
                hooks: [{ type: "command", command: command("capture"), timeout: 3 }],
              },
            ],
          },
        } satisfies HooksDocument,
        null,
        2,
      )}\n`,
    );

    const second = await runCodexHookAdapter(
      "UserPromptSubmit",
      { cwd: root, turn_id: "turn-live-read-2", prompt: "second prompt" },
      options,
    );

    expect(second.matchedHooks.map((hook) => hook.command)).toEqual([command("capture")]);
    expect(second.runs[0]?.parsed).toEqual({ message: "fake capture" });
  });

  test("PreToolUse deny uses Codex hook-specific output", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "Edit|Write",
            hooks: [{ type: "command", command: command("deny-pretool"), timeout: 3 }],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "PreToolUse",
      {
        cwd: root,
        tool_name: "apply_patch",
        tool_input: { command: "*** Update File: src/example.ts\n@@\n" },
      },
      options,
    );

    expect(result.response.hookSpecificOutput).toEqual({
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "blocked by fake hook",
    });
    expect(result.response.systemMessage).toBe("blocked by fake hook");
  });

  test("PreToolUse maps dotted Codex palantir-mini MCP names to Claude plugin matchers", async () => {
    const recordPath = path.join(os.tmpdir(), `pm-codex-alias-${Date.now()}.jsonl`);
    const { root, options } = makePlugin(
      {
        hooks: {
          PreToolUse: [
            {
              matcher: "mcp__plugin_palantir-mini_palantir-mini__emit_event",
              hooks: [{ type: "command", command: command("capture"), timeout: 3 }],
            },
          ],
        },
      },
      { FAKE_HOOK_RECORD_PATH: recordPath },
    );
    tmpDirs.push(recordPath);

    const result = await runCodexHookAdapter(
      "PreToolUse",
      {
        cwd: root,
        tool_name: "mcp__palantir_mini__.emit_event",
        tool_input: { envelope: { type: "validation_phase_completed" } },
      },
      options,
    );

    expect(result.matchedHooks.map((hook) => hook.command)).toEqual([command("capture")]);
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8").trim()) as {
      payload: { tool_name?: string };
    };
    expect(record.payload.tool_name).toBe("mcp__plugin_palantir-mini_palantir-mini__emit_event");
  });

  test("PreToolUse supports ORed Tool(path) if expressions", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "Edit|Write|MultiEdit",
            hooks: [
              {
                type: "command",
                command: command("deny-pretool"),
                if: "Edit(**/plugins/palantir-mini/**)|Write(**/plugins/palantir-mini/**)|MultiEdit(**/plugins/palantir-mini/**)",
                timeout: 3,
              },
            ],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "PreToolUse",
      {
        cwd: root,
        tool_name: "apply_patch",
        tool_input: {
          command: "*** Update File: .claude/plugins/palantir-mini/hooks/hooks.json\n@@\n",
        },
      },
      options,
    );

    expect(result.matchedHooks.map((hook) => hook.command)).toEqual([command("deny-pretool")]);
    expect(result.response.systemMessage).toBe("blocked by fake hook");
  });

  test("PreToolUse supports ORed Bash(command) if expressions", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash",
            hooks: [
              {
                type: "command",
                command: command("deny-pretool"),
                if: "Bash(git commit*)|Bash(git add*)|Bash(git stash*)|Bash(git push*)",
                timeout: 3,
              },
            ],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "PreToolUse",
      {
        cwd: root,
        tool_name: "functions.exec_command",
        tool_input: { command: "git add .claude/plugins/palantir-mini/hooks/hooks.json" },
      },
      options,
    );

    expect(result.matchedHooks.map((hook) => hook.command)).toEqual([command("deny-pretool")]);
    expect(result.response.systemMessage).toBe("blocked by fake hook");
  });

  test("PreToolUse maps Codex spawn_agent to Claude Agent matcher", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "Agent",
            hooks: [{ type: "command", command: command("deny-pretool"), timeout: 3 }],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "PreToolUse",
      {
        cwd: root,
        tool_name: "multi_agent_v1.spawn_agent",
        tool_input: {
          prompt:
            "Role: verifier\nProject root: /home/palantirkc\nObjective: inspect hook policy registry",
        },
      },
      options,
    );

    expect(result.matchedHooks.map((hook) => hook.command)).toEqual([command("deny-pretool")]);
    expect(result.response.systemMessage).toBe("blocked by fake hook");
  });

  test("Stop executes plugin hooks and returns continuation decision", async () => {
    const recordPath = path.join(os.tmpdir(), `pm-codex-stop-${Date.now()}.jsonl`);
    const { root, options } = makePlugin(
      {
        hooks: {
          Stop: [
            {
              hooks: [{ type: "command", command: command("stop-block"), timeout: 3 }],
            },
          ],
        },
      },
      { FAKE_HOOK_RECORD_PATH: recordPath },
    );
    tmpDirs.push(recordPath);

    const result = await runCodexHookAdapter(
      "Stop",
      { cwd: root, turn_id: "turn-stop", last_assistant_message: "done" },
      options,
    );

    expect(result.response).toEqual({
      decision: "block",
      reason: "run one more verification pass",
    });
    expect(fs.readFileSync(recordPath, "utf8")).toContain('"hook_event_name":"Stop"');
  });

  test("Stop without continuation can still surface common systemMessage", async () => {
    const { root, options } = makePlugin({
      hooks: {
        Stop: [
          {
            hooks: [{ type: "command", command: command("stop-context"), timeout: 3 }],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter("Stop", { cwd: root, turn_id: "turn-stop" }, options);

    expect(result.response).toEqual({
      continue: true,
      systemMessage: "stop hook context",
    });
  });

  test("--inspect keeps Claude-native gap events visible", async () => {
    const { options } = makePlugin({
      hooks: {
        Stop: [{ hooks: [{ type: "command", command: command("stop-context") }] }],
        PreCompact: [{ hooks: [{ type: "command", command: command("noop") }] }],
        PostCompact: [{ hooks: [{ type: "command", command: command("noop") }] }],
        TaskCreated: [{ hooks: [{ type: "command", command: command("noop") }] }],
        TaskCompleted: [{ hooks: [{ type: "command", command: command("noop") }] }],
        TeammateIdle: [{ hooks: [{ type: "command", command: command("noop") }] }],
        SubagentStart: [{ hooks: [{ type: "command", command: command("noop") }] }],
        SubagentStop: [{ hooks: [{ type: "command", command: command("noop") }] }],
      },
    });

    const output = await runCodexHookAdapterCli(["bun", "adapter", "--inspect"], undefined, options);
    const parsed = JSON.parse(output) as {
      rows: Array<{
        event: string;
        codexNativeEvent: boolean;
        codexSchemaOnlyEvent: boolean;
        codexSchemaEvent: boolean;
        documentedWire: boolean;
      }>;
    };
    const byEvent = new Map(parsed.rows.map((row) => [row.event, row]));

    expect(byEvent.get("Stop")).toMatchObject({
      codexNativeEvent: true,
      codexSchemaOnlyEvent: false,
      codexSchemaEvent: true,
      documentedWire: true,
    });
    for (const event of ["PreCompact", "PostCompact"]) {
      expect(byEvent.get(event)).toMatchObject({
        codexNativeEvent: false,
        codexSchemaOnlyEvent: true,
        codexSchemaEvent: true,
        documentedWire: false,
      });
    }
    for (const event of ["TaskCreated", "TaskCompleted", "TeammateIdle", "SubagentStart", "SubagentStop"]) {
      expect(byEvent.get(event)).toMatchObject({
        codexNativeEvent: false,
        codexSchemaOnlyEvent: false,
        codexSchemaEvent: false,
        documentedWire: false,
      });
    }
  });

  test("--match UserPromptSubmit preserves hook order", async () => {
    const { options } = makePlugin({
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [
              { type: "command", command: command("capture"), timeout: 3 },
              { type: "command", command: command("inbox"), timeout: 3, async: true },
            ],
          },
        ],
      },
    });

    const output = await runCodexHookAdapterCli(
      ["bun", "adapter", "--match", "UserPromptSubmit"],
      JSON.stringify({ prompt: "capture this prompt" }),
      options,
    );
    const parsed = JSON.parse(output) as { matchedCommands: string[] };

    expect(parsed.matchedCommands).toEqual([command("capture"), command("inbox")]);
    expect(loadHooks(options).hooks?.UserPromptSubmit?.[0]?.hooks?.[0]?.async).toBeUndefined();
  });

  test("timed out hooks record structured timeout observation", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "Edit",
            hooks: [{ type: "command", command: command("sleep"), timeout: 0.001 }],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "PreToolUse",
      { cwd: root, tool_name: "Edit", tool_input: { file_path: "src/a.ts" } },
      options,
    );

    expect(result.runs[0]?.timedOut).toBe(true);
    expect(result.runs[0]?.timeoutObservation).toMatchObject({
      eventName: "PreToolUse",
      hookName: "fake-hook.ts",
      timeoutMs: 1000,
    });
    const event = readProjectEvents(root).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        (entry.payload as { errorClass?: string })?.errorClass === "codex_adapter_timeout_observed",
    );
    expect(event?.payload).toMatchObject({
      eventName: "PreToolUse",
      hookName: "fake-hook.ts",
      timeoutMs: 1000,
    });
    expect(
      fs.existsSync(path.join(root, ".palantir-mini", "session", "codex-adapter-diagnostics")),
    ).toBe(true);
  });

  test("Claude-only event attempts emit capability mismatch diagnostics", async () => {
    const { root, options } = makePlugin({
      hooks: {
        TaskCreated: [
          {
            hooks: [{ type: "command", command: command("noop"), timeout: 3 }],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter("TaskCreated", { cwd: root, session_id: "session-1" }, options);

    expect(result.matchedHooks).toEqual([]);
    expect(result.response.systemMessage).toContain("unsupported event TaskCreated");
    const event = readProjectEvents(root).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        (entry.payload as { errorClass?: string })?.errorClass === "codex_adapter_capability_mismatch",
    );
    expect(event?.payload).toMatchObject({
      runtime: "codex",
      attemptedEvent: "TaskCreated",
      fallbackFact: {
        event: "TaskCreated",
      },
    });
  });

  test("schema-only event attempts are skipped with explicit mismatch diagnostics", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreCompact: [
          {
            hooks: [{ type: "command", command: command("capture"), timeout: 3 }],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter("PreCompact", { cwd: root, session_id: "session-1" }, options);

    expect(result.matchedHooks).toEqual([]);
    expect(result.runs).toEqual([]);
    expect(result.response.systemMessage).toContain("schema-only event PreCompact");
    const event = readProjectEvents(root).find(
      (entry) =>
        entry.type === "validation_phase_completed" &&
        (entry.payload as { errorClass?: string })?.errorClass === "codex_adapter_capability_mismatch",
    );
    expect(event?.payload).toMatchObject({
      runtime: "codex",
      attemptedEvent: "PreCompact",
      fallbackFact: {
        event: "PreCompact",
      },
    });
  });

  test("extractPromptFrontDoorIdentityContext parses prompt-front-door additionalContext", () => {
    const parsed = extractPromptFrontDoorIdentityContext(
      [
        "palantir-mini prompt front door captured this prompt.",
        "",
        "Before ontology-affecting routing, call `pm_semantic_intent_gate` with:",
        "  promptId: prompt-session-20260510T000000-1-abcdef",
        "  promptHash: abcdef1234567890",
        "  sessionId: session-1",
        "  runtime: codex",
      ].join("\n"),
    );

    expect(parsed).toEqual({
      promptId: "prompt-session-20260510T000000-1-abcdef",
      promptHash: "abcdef1234567890",
      sessionId: "session-1",
      runtime: "codex",
    });
  });
});
