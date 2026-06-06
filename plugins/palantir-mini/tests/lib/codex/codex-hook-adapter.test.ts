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
} from "../../../lib/codex/codex-hook-adapter";
import {
  createPromptEnvelope,
  PromptFrontDoorStore,
  type PromptEnvelope,
} from "../../../lib/prompt-front-door";

const tmpDirs: string[] = [];
const REAL_PLUGIN_ROOT = path.resolve(import.meta.dir, "../../..");

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
      "} else if (mode === 'prompt-front-door-capture') {",
      "  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: 'plugin opt-out captured' } }));",
      "} else if (mode === 'invalid-output') {",
      "  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'maybe' } }));",
      "} else if (mode === 'duplicate-context-a') {",
      "  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: 'shared context' } }));",
      "} else if (mode === 'duplicate-context-b') {",
      "  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: ' shared   context ' } }));",
      "} else if (mode === 'long-context') {",
      "  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: 'x'.repeat(5000) } }));",
      "} else if (mode === 'deny-pretool') {",
      "  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: 'blocked by fake hook' } }));",
      "} else if (mode === 'stop-block') {",
      "  console.log(JSON.stringify({ decision: 'block', reason: 'run one more verification pass' }));",
      "} else if (mode === 'stop-context') {",
      "  console.log(JSON.stringify({ systemMessage: 'stop hook context' }));",
      "} else if (mode === 'sleep') {",
      "  await new Promise((resolve) => setTimeout(resolve, 1200));",
      "  console.log(JSON.stringify({ message: 'awake' }));",
      "} else if (mode === 'throw-unhandled') {",
      "  throw new Error('simulated unhandled exception');",
      "} else if (mode === 'fail-nonzero') {",
      "  console.error('simulated hook failure');",
      "  process.exit(1);",
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
  return `bun run "${"${PALANTIR_MINI_PLUGIN_ROOT}"}/hooks/fake-hook.ts" ${mode}`;
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

async function savePluginOptOutEnvelope(
  projectRoot: string,
  sessionId = "session-opt-out",
): Promise<PromptEnvelope> {
  const envelope = createPromptEnvelope({
    rawPrompt: "palantir-mini 사용하지 말고 일반 Codex 런타임으로만 작업해.",
    sessionId,
    runtime: "codex",
    projectRoot,
    palantirMiniPluginOptOut: {
      explicit: true,
      matchedMarker: "palantir-mini 사용하지 말고",
      reason: "User prompt explicitly requested that the palantir-mini plugin not be used for this turn.",
    },
  });
  await new PromptFrontDoorStore({ projectRoot }).saveEnvelope(envelope);
  return envelope;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Codex hook adapter", () => {
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

  test("UserPromptSubmit dedupes normalized additionalContext chunks", async () => {
    const { root, options } = makePlugin({
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [
              { type: "command", command: command("duplicate-context-a"), timeout: 3 },
              { type: "command", command: command("duplicate-context-b"), timeout: 3 },
            ],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "UserPromptSubmit",
      { cwd: root, turn_id: "turn-dedupe", prompt: "approve DTC" },
      options,
    );

    expect(result.response).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: "shared context",
      },
    });
  });

  test("UserPromptSubmit caps oversized additionalContext with an explicit footer", async () => {
    const { root, options } = makePlugin({
      hooks: {
        UserPromptSubmit: [
          {
            hooks: [{ type: "command", command: command("long-context"), timeout: 3 }],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "UserPromptSubmit",
      { cwd: root, turn_id: "turn-context-cap", prompt: "approve DTC" },
      options,
    );

    const ctx = (result.response.hookSpecificOutput as { additionalContext?: string }).additionalContext ?? "";
    expect(ctx.length).toBeLessThanOrEqual(4000);
    expect(ctx).toContain("palantir-mini Codex adapter: context capped at 4000 chars");
    expect(ctx).toContain("omitted");
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

  test("UserPromptSubmit opt-out bypasses all palantir-mini hooks silently", async () => {
    const { root, options } = makePlugin(
      {
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [
                { type: "command", command: command("prompt-front-door-capture"), timeout: 3 },
                { type: "command", command: command("user-context"), timeout: 3 },
                { type: "command", command: command("duplicate-context-a"), timeout: 3 },
              ],
            },
          ],
        },
      },
      { FAKE_HOOK_RECORD_PATH: path.join(os.tmpdir(), `pm-codex-adapter-record-${Date.now()}.jsonl`) },
    );
    const recordPath = options.env?.FAKE_HOOK_RECORD_PATH ?? "";

    const result = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: root,
        session_id: "session-direct-opt-out",
        turn_id: "turn-direct-opt-out",
        prompt: "Do not use palantir-mini for this turn. Just edit the local file.",
      },
      options,
    );

    expect(result.matchedHooks).toEqual([]);
    expect(result.runs).toEqual([]);
    expect(result.response).toEqual({});
    expect(fs.existsSync(recordPath)).toBe(false);
  });

  test("session hard opt-out keeps later short UserPromptSubmit and PermissionRequest silent", async () => {
    const recordPath = path.join(os.tmpdir(), `pm-codex-hard-optout-${Date.now()}.jsonl`);
    const { root, options } = makePlugin(
      {
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [{ type: "command", command: command("user-context"), timeout: 3 }],
            },
          ],
          PreToolUse: [
            {
              matcher: "Edit|Write",
              hooks: [{ type: "command", command: command("deny-pretool"), timeout: 3 }],
            },
          ],
        },
      },
      { FAKE_HOOK_RECORD_PATH: recordPath },
    );
    tmpDirs.push(recordPath);

    const first = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: root,
        session_id: "session-hard-opt-out",
        turn_id: "turn-hard-opt-out-1",
        prompt: "Do not use palantir-mini for this session. Work as plain Codex.",
      },
      options,
    );
    expect(first.matchedHooks).toEqual([]);
    expect(first.runs).toEqual([]);
    expect(first.response).toEqual({});

    const shortReply = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: root,
        session_id: "session-hard-opt-out",
        turn_id: "turn-hard-opt-out-2",
        prompt: "A",
      },
      options,
    );
    expect(shortReply.matchedHooks).toEqual([]);
    expect(shortReply.runs).toEqual([]);
    expect(shortReply.response).toEqual({});

    const permission = await runCodexHookAdapter(
      "PermissionRequest",
      {
        cwd: path.join(root, "lib", "codex"),
        session_id: "session-hard-opt-out",
        tool_name: "apply_patch",
        tool_input: { command: "*** Update File: lib/codex/example.ts\n@@\n" },
      },
      options,
    );
    expect(permission.matchedHooks).toEqual([]);
    expect(permission.runs).toEqual([]);
    expect(permission.response).toEqual({});
    expect(fs.existsSync(recordPath)).toBe(false);
  });

  test("explicit opt-in after session hard opt-out reactivates UserPromptSubmit hooks", async () => {
    const recordPath = path.join(os.tmpdir(), `pm-codex-hard-optin-${Date.now()}.jsonl`);
    const { root, options } = makePlugin(
      {
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [{ type: "command", command: command("user-context"), timeout: 3 }],
            },
          ],
        },
      },
      { FAKE_HOOK_RECORD_PATH: recordPath },
    );
    tmpDirs.push(recordPath);

    await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: root,
        session_id: "session-hard-opt-in",
        turn_id: "turn-hard-opt-in-1",
        prompt: "palantir-mini 사용하지 말고 일반 Codex로만 진행해.",
      },
      options,
    );

    const result = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: root,
        session_id: "session-hard-opt-in",
        turn_id: "turn-hard-opt-in-2",
        prompt: "Use palantir-mini for this turn.",
      },
      options,
    );

    expect(result.matchedHooks.map((hook) => hook.command)).toEqual([command("user-context")]);
    expect(result.runs).toHaveLength(1);
    expect(result.response.hookSpecificOutput).toEqual({
      hookEventName: "UserPromptSubmit",
      additionalContext: "gate Use palantir-mini for this turn.",
    });
    const record = fs.readFileSync(recordPath, "utf8").trim();
    expect(record).toContain("user-context");
  });

  test("PermissionRequest in meta-harness bypasses shared PreToolUse hooks", async () => {
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
      "PermissionRequest",
      {
        cwd: "/home/palantirkc/meta-harness",
        tool_name: "apply_patch",
        tool_input: { command: "*** Add File: _workspace/example.md\n+hello\n" },
      },
      {
        ...options,
        pluginRoot: REAL_PLUGIN_ROOT,
        hooksJsonPath: path.join(root, "hooks", "hooks.json"),
      },
    );

    expect(result.matchedHooks).toEqual([]);
    expect(result.runs).toEqual([]);
    expect(result.response).toEqual({});
  });

  test("PreToolUse opt-out skips plugin enforcement hooks from current prompt-front-door state", async () => {
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
    await savePluginOptOutEnvelope(root);

    const result = await runCodexHookAdapter(
      "PreToolUse",
      {
        cwd: root,
        session_id: "session-opt-out",
        tool_name: "apply_patch",
        tool_input: { command: "*** Update File: src/example.ts\n@@\n" },
      },
      options,
    );

    expect(result.matchedHooks).toEqual([]);
    expect(result.runs).toEqual([]);
    expect(result.response).toEqual({});
  });

  test("stored opt-out does not suppress a later non-opt-out UserPromptSubmit", async () => {
    const recordPath = path.join(os.tmpdir(), `pm-codex-adapter-record-${Date.now()}.jsonl`);
    const { root, options } = makePlugin(
      {
        hooks: {
          UserPromptSubmit: [
            {
              hooks: [
                { type: "command", command: command("prompt-front-door-capture"), timeout: 3 },
                { type: "command", command: command("user-context"), timeout: 3 },
              ],
            },
          ],
        },
      },
      { FAKE_HOOK_RECORD_PATH: recordPath },
    );
    await savePluginOptOutEnvelope(root);

    const result = await runCodexHookAdapter(
      "UserPromptSubmit",
      {
        cwd: root,
        session_id: "session-opt-out",
        turn_id: "turn-opt-back-in",
        prompt: "Use the palantir-mini workflow for this turn.",
      },
      options,
    );

    expect(result.matchedHooks.map((hook) => hook.command)).toEqual([
      command("prompt-front-door-capture"),
      command("user-context"),
    ]);
    expect(result.runs).toHaveLength(2);

    const modes = fs
      .readFileSync(recordPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => (JSON.parse(line) as { mode: string }).mode);
    expect(modes).toEqual(["prompt-front-door-capture", "user-context"]);
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

  test("PreToolUse failureMode fail-closed denies on nonzero hook failure", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "Edit|Write",
            hooks: [
              {
                type: "command",
                command: command("fail-nonzero"),
                timeout: 3,
                permissionDecision: "defer",
                failureMode: "fail-closed",
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
        tool_input: { command: "*** Update File: src/example.ts\n@@\n" },
      },
      options,
    );

    expect(result.response.hookSpecificOutput).toEqual({
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "simulated hook failure",
    });
  });

  test("PreToolUse failureMode fail-closed denies on unhandled hook exception", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "Edit|Write",
            hooks: [
              {
                type: "command",
                command: command("throw-unhandled"),
                timeout: 3,
                permissionDecision: "defer",
                failureMode: "fail-closed",
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
        tool_input: { command: "*** Update File: src/example.ts\n@@\n" },
      },
      options,
    );

    expect(result.response.hookSpecificOutput).toMatchObject({
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
    });
    expect(
      String(
        (result.response.hookSpecificOutput as { permissionDecisionReason?: string })
          .permissionDecisionReason,
      ),
    ).toContain("simulated unhandled exception");
  });

  test("PreToolUse failureMode fail-closed denies on timed out hook", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "Edit",
            hooks: [
              {
                type: "command",
                command: command("sleep"),
                timeout: 0.001,
                permissionDecision: "defer",
                failureMode: "fail-closed",
              },
            ],
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
    expect(result.response.hookSpecificOutput).toMatchObject({
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
    });
    expect(
      String(
        (result.response.hookSpecificOutput as { permissionDecisionReason?: string })
          .permissionDecisionReason,
      ),
    ).toContain("timed out");
  });

  test("PreToolUse failureMode fail-closed denies on governance output schema mismatch", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "Edit",
            hooks: [
              {
                type: "command",
                command: command("invalid-output"),
                timeout: 3,
                permissionDecision: "defer",
                failureMode: "fail-closed",
                outputSchemaRef: "schemas/hooks/governance-hook.output.schema.json",
              },
            ],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "PreToolUse",
      { cwd: root, tool_name: "Edit", tool_input: { file_path: "src/a.ts" } },
      options,
    );

    expect(result.response.hookSpecificOutput).toMatchObject({
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
    });
    expect(
      String(
        (result.response.hookSpecificOutput as { permissionDecisionReason?: string })
          .permissionDecisionReason,
      ),
    ).toContain("schema mismatch");
  });

  test("PreToolUse failureMode fail-closed denies on input schema mismatch", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "*",
            hooks: [
              {
                type: "command",
                command: command("capture"),
                timeout: 3,
                permissionDecision: "defer",
                failureMode: "fail-closed",
                inputSchemaRef: "schemas/hooks/pretooluse.input.schema.json",
              },
            ],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "PreToolUse",
      { cwd: root, tool_input: { file_path: "src/a.ts" } },
      options,
    );

    expect(result.response.hookSpecificOutput).toMatchObject({
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
    });
    expect(
      String(
        (result.response.hookSpecificOutput as { permissionDecisionReason?: string })
          .permissionDecisionReason,
      ),
    ).toContain("tool_name must be a non-empty string");
  });

  test("PreToolUse adapter CLI fails closed on invalid stdin JSON", async () => {
    const { options } = makePlugin({ hooks: { PreToolUse: [] } });

    const output = await runCodexHookAdapterCli(["bun", "adapter", "PreToolUse"], "{ invalid json", options);
    const parsed = JSON.parse(output) as {
      hookSpecificOutput?: {
        hookEventName?: string;
        permissionDecision?: string;
        permissionDecisionReason?: string;
      };
    };

    expect(parsed.hookSpecificOutput).toMatchObject({
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
    });
    expect(parsed.hookSpecificOutput?.permissionDecisionReason).toContain("stdin is not valid JSON");
  });

  test("PermissionRequest uses PreToolUse policy hooks while preserving wire event response", async () => {
    const recordPath = path.join(os.tmpdir(), `pm-codex-permission-policy-${Date.now()}.jsonl`);
    const { root, options } = makePlugin(
      {
        hooks: {
          PreToolUse: [
            {
              matcher: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
              hooks: [{ type: "command", command: command("capture"), timeout: 3 }],
            },
          ],
        },
      },
      { FAKE_HOOK_RECORD_PATH: recordPath },
    );
    tmpDirs.push(recordPath);

    const result = await runCodexHookAdapter(
      "PermissionRequest",
      {
        cwd: root,
        tool_name: "mcp__palantir_mini__commit_edits",
        tool_input: {},
      },
      options,
    );

    expect(result.matchedHooks.map((hook) => hook.command)).toEqual([command("capture")]);
    expect(result.response).toEqual({});
    const record = JSON.parse(fs.readFileSync(recordPath, "utf8").trim()) as {
      payload: { hook_event_name?: string; tool_name?: string };
    };
    expect(record.payload.hook_event_name).toBe("PreToolUse");
    expect(record.payload.tool_name).toBe("mcp__plugin_palantir-mini_palantir-mini__commit_edits");
  });

  test("PermissionRequest deny preserves Codex PermissionRequest response shape", async () => {
    const { root, options } = makePlugin({
      hooks: {
        PreToolUse: [
          {
            matcher: "mcp__plugin_palantir-mini_palantir-mini__commit_edits",
            hooks: [{ type: "command", command: command("deny-pretool"), timeout: 3 }],
          },
        ],
      },
    });

    const result = await runCodexHookAdapter(
      "PermissionRequest",
      {
        cwd: root,
        tool_name: "mcp__palantir_mini__commit_edits",
        tool_input: {},
      },
      options,
    );

    expect(result.response).toEqual({
      systemMessage: "blocked by fake hook",
      hookSpecificOutput: {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "deny",
          message: "blocked by fake hook",
        },
      },
    });
  });

  test("PermissionRequest matcher covers protected palantir-mini MCP aliases", async () => {
    const operations = [
      "commit_edits",
      "apply_edit_function",
      "ontology_context_query",
    ];
    const aliasesFor = (operation: string) => [
      `mcp__plugin_palantir-mini_palantir-mini__${operation}`,
      `mcp__palantir_mini__${operation}`,
      `mcp__palantir_mini__.${operation}`,
      `mcp__palantir-mini__${operation}`,
      `mcp_palantir-mini_${operation}`,
      `mcp_palantir_mini_${operation}`,
    ];

    for (const operation of operations) {
      const { options } = makePlugin({
        hooks: {
          PreToolUse: [
            {
              matcher: `mcp__plugin_palantir-mini_palantir-mini__${operation}`,
              hooks: [{ type: "command", command: command("capture"), timeout: 3 }],
            },
          ],
        },
      });

      for (const toolName of aliasesFor(operation)) {
        const output = await runCodexHookAdapterCli(
          ["bun", "adapter", "--match", "PermissionRequest"],
          JSON.stringify({ tool_name: toolName, tool_input: {} }),
          options,
        );
        const parsed = JSON.parse(output) as {
          event: string;
          policyEventName: string;
          matchedCommands: string[];
        };

        expect(parsed.event).toBe("PermissionRequest");
        expect(parsed.policyEventName).toBe("PreToolUse");
        expect(parsed.matchedCommands).toEqual([command("capture")]);
      }
    }
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

  test("--inspect keeps unsupported native gap events visible", async () => {
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
    for (const event of ["PreCompact", "PostCompact", "SubagentStart", "SubagentStop"]) {
      expect(byEvent.get(event)).toMatchObject({
        codexNativeEvent: true,
        codexSchemaOnlyEvent: false,
        codexSchemaEvent: true,
        documentedWire: true,
      });
    }
    for (const event of ["TaskCreated", "TaskCompleted", "TeammateIdle"]) {
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

  test("non-Codex event attempts emit capability mismatch diagnostics", async () => {
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

  test("compact lifecycle hooks run through the native Codex adapter surface", async () => {
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

    expect(result.matchedHooks).toHaveLength(1);
    expect(result.runs).toHaveLength(1);
    expect(result.runs[0]?.hook.command).toBe(command("capture"));
    expect(readProjectEvents(root)).toEqual([]);
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
