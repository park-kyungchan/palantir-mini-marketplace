// palantir-mini Gemini hook adapter.
// Gemini CLI exposes different hook event names and JSON response semantics
// than Claude/Codex. This adapter maps Gemini-native lifecycle events to the
// canonical palantir-mini hook intent without making ~/.gemini a semantic fork.

import { existsSync } from "node:fs";
import path from "node:path";
import {
  adaptPayloadForClaude,
  asObject,
  loadHooks,
  matchingHooks,
  parseHookJson,
  type HookConfig,
  type HookRun,
  type JsonObject,
} from "../codex/claude-hook-adapter";
import { resolvePalantirMiniRoot } from "../config/root";

export type GeminiHookEvent =
  | "SessionStart"
  | "BeforeAgent"
  | "BeforeTool"
  | "AfterTool"
  | "AfterAgent"
  | "PreCompress"
  | "SessionEnd";

type GeminiAdapterOptions = {
  home?: string;
  pluginRoot?: string;
  hooksJsonPath?: string;
  bunPath?: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
};

type ResolvedGeminiOptions = Required<GeminiAdapterOptions>;

const DEFAULT_HOME = process.env.HOME || "/home/palantirkc";

export const GEMINI_EVENT_POLICY_MAP: Record<GeminiHookEvent, string> = {
  SessionStart: "SessionStart",
  BeforeAgent: "UserPromptSubmit",
  BeforeTool: "PreToolUse",
  AfterTool: "PostToolUse",
  AfterAgent: "Stop",
  PreCompress: "PreCompact",
  SessionEnd: "Stop",
};

function resolveOptions(options: GeminiAdapterOptions = {}): ResolvedGeminiOptions {
  const home = options.home ?? DEFAULT_HOME;
  const pluginRoot =
    options.pluginRoot ??
    options.env?.PALANTIR_MINI_ROOT ??
    options.env?.PALANTIR_MINI_PLUGIN_ROOT ??
    options.env?.PLUGIN_ROOT ??
    process.env.PALANTIR_MINI_ROOT ??
    process.env.PALANTIR_MINI_PLUGIN_ROOT ??
    process.env.PLUGIN_ROOT ??
    resolvePalantirMiniRoot({ HOME: home });
  const bunPath =
    options.bunPath ??
    (existsSync(path.join(home, ".bun", "bin", "bun")) ? path.join(home, ".bun", "bin", "bun") : "bun");

  return {
    home,
    pluginRoot,
    hooksJsonPath: options.hooksJsonPath ?? path.join(pluginRoot, "hooks", "hooks.json"),
    bunPath,
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
  };
}

function rewriteCommand(command: string, options: ResolvedGeminiOptions): string {
  return command
    .replaceAll("${PALANTIR_MINI_ROOT}", options.pluginRoot)
    .replaceAll("${PALANTIR_MINI_PLUGIN_ROOT}", options.pluginRoot)
    .replaceAll("${PLUGIN_ROOT}", options.pluginRoot)
    .replaceAll("${CLAUDE_PLUGIN_ROOT}", options.pluginRoot)
    .replace(/^bun\s+run\s+/, `${options.bunPath} run `);
}

function normalizePayloadForPolicy(
  eventName: GeminiHookEvent,
  payload: JsonObject,
  options: ResolvedGeminiOptions,
): JsonObject {
  const policyEventName = GEMINI_EVENT_POLICY_MAP[eventName];
  const next = JSON.parse(JSON.stringify(payload)) as JsonObject;
  next.hook_event_name = policyEventName;
  next.gemini_hook_event_name = eventName;
  if (typeof next.cwd !== "string" || next.cwd.length === 0) {
    next.cwd = options.env.GEMINI_CWD ?? options.env.GEMINI_PROJECT_DIR ?? options.cwd;
  }
  if (typeof next.session_id !== "string" || next.session_id.length === 0) {
    next.session_id = options.env.GEMINI_SESSION_ID ?? "gemini-local";
  }
  return next;
}

async function runCommandHookForGemini(
  hook: HookConfig,
  payload: JsonObject,
  options: ResolvedGeminiOptions,
): Promise<HookRun> {
  const command = rewriteCommand(hook.command ?? "", options);
  const timeoutMs = Math.max(1, hook.timeout ?? 60) * 1000;
  const cwd = typeof payload.cwd === "string" && payload.cwd.trim() ? payload.cwd : options.cwd;
  const proc = Bun.spawn(["bash", "-lc", command], {
    cwd,
    env: {
      ...process.env,
      ...options.env,
      PALANTIR_MINI_ROOT: options.pluginRoot,
      PALANTIR_MINI_PLUGIN_ROOT: options.pluginRoot,
      PLUGIN_ROOT: options.pluginRoot,
      CLAUDE_PLUGIN_ROOT: options.pluginRoot,
      PALANTIR_MINI_HOST_RUNTIME: "gemini",
    },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  proc.stdin.write(`${JSON.stringify(adaptPayloadForClaude(payload))}\n`);
  proc.stdin.end();

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited.catch(() => null),
  ]);
  clearTimeout(timer);

  const run: HookRun = { hook, stdout, stderr, exitCode, timedOut };
  const parsed = parseHookJson(stdout);
  if (parsed) run.parsed = parsed;
  return run;
}

function textField(root: JsonObject | undefined, key: string): string | undefined {
  const value = root?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function blockReason(run: HookRun): string | undefined {
  const parsed = run.parsed;
  if (run.exitCode === 2) return run.stderr.trim() || "palantir-mini hook blocked this action";
  if ((run.timedOut || (run.exitCode !== null && run.exitCode !== 0)) && run.hook.decision === "block") {
    return run.stderr.trim() || `palantir-mini blocking hook failed closed: ${run.hook.command}`;
  }
  if ((run.timedOut || (run.exitCode !== null && run.exitCode !== 0)) && run.hook.permissionDecision === "deny") {
    return run.stderr.trim() || `palantir-mini permission hook failed closed: ${run.hook.command}`;
  }
  if (!parsed) return undefined;
  const specific = asObject(parsed.hookSpecificOutput);
  if (textField(specific, "permissionDecision") === "deny") {
    return textField(specific, "permissionDecisionReason") || textField(parsed, "reason") || textField(parsed, "message");
  }
  if (textField(parsed, "permissionDecision") === "deny") {
    return textField(parsed, "reason") || textField(parsed, "message");
  }
  if (textField(parsed, "decision") === "block" || textField(parsed, "decision") === "deny") {
    return textField(parsed, "reason") || textField(parsed, "message") || "palantir-mini hook blocked this action";
  }
  return undefined;
}

function collectContext(runs: HookRun[]): string {
  const chunks: string[] = [];
  for (const run of runs) {
    const parsed = run.parsed;
    if (!parsed) {
      if (run.timedOut) chunks.push(`palantir-mini Gemini adapter timed out running ${run.hook.command}`);
      else if (run.exitCode && run.exitCode !== 0) {
        chunks.push(`palantir-mini Gemini adapter hook exited ${run.exitCode}: ${run.stderr.trim()}`);
      }
      continue;
    }
    const specific = asObject(parsed.hookSpecificOutput);
    const context =
      textField(parsed, "additionalContext") ||
      textField(parsed, "systemMessage") ||
      textField(specific, "additionalContext");
    if (context) chunks.push(context);
  }
  return chunks.join("\n\n");
}

function geminiResponseFor(eventName: GeminiHookEvent, runs: HookRun[]): JsonObject {
  const reason = runs.map(blockReason).find(Boolean);
  const context = collectContext(runs);

  if (reason && (eventName === "BeforeAgent" || eventName === "BeforeTool" || eventName === "AfterTool" || eventName === "AfterAgent")) {
    return { decision: "deny", reason, systemMessage: reason };
  }
  if (context && (eventName === "BeforeAgent" || eventName === "AfterTool")) {
    return { hookSpecificOutput: { hookEventName: eventName, additionalContext: context } };
  }
  if (eventName === "SessionStart" && context) {
    return { hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: context } };
  }
  if (context) return { systemMessage: context };
  return {};
}

export async function runGeminiHookAdapter(
  eventName: string,
  inputPayload: JsonObject,
  options: GeminiAdapterOptions = {},
): Promise<{ response: JsonObject; matchedHooks: HookConfig[]; runs: HookRun[]; policyEventName?: string }> {
  if (!(eventName in GEMINI_EVENT_POLICY_MAP)) {
    return {
      response: { systemMessage: `palantir-mini Gemini adapter skipped unsupported event ${eventName || "unknown"}` },
      matchedHooks: [],
      runs: [],
    };
  }

  const resolved = resolveOptions(options);
  const geminiEventName = eventName as GeminiHookEvent;
  const policyEventName = GEMINI_EVENT_POLICY_MAP[geminiEventName];
  const doc = loadHooks({ ...resolved, pluginRoot: resolved.pluginRoot, hooksJsonPath: resolved.hooksJsonPath });
  const payload = normalizePayloadForPolicy(geminiEventName, inputPayload, resolved);
  const hooks = matchingHooks(doc, policyEventName, payload, {
    ...resolved,
    pluginRoot: resolved.pluginRoot,
    hooksJsonPath: resolved.hooksJsonPath,
  });

  const syncHooks = hooks.filter((hook) => !hook.async);
  const asyncHooks = hooks.filter((hook) => hook.async);
  for (const hook of asyncHooks) runCommandHookForGemini(hook, payload, resolved).catch(() => {});

  const runs: HookRun[] = [];
  for (const hook of syncHooks) runs.push(await runCommandHookForGemini(hook, payload, resolved));

  return { response: geminiResponseFor(geminiEventName, runs), matchedHooks: hooks, runs, policyEventName };
}

async function readPayload(stdinText?: string): Promise<JsonObject> {
  const text = stdinText ?? (await Bun.stdin.text());
  if (text.trim().length === 0) return {};
  try {
    return asObject(JSON.parse(text));
  } catch {
    return {};
  }
}

export async function runGeminiHookAdapterCli(
  argv = process.argv,
  stdinText?: string,
  options: GeminiAdapterOptions = {},
): Promise<string> {
  const eventName = argv[2] ?? "";
  if (eventName === "--inspect") {
    return JSON.stringify({
      eventMap: GEMINI_EVENT_POLICY_MAP,
      pluginRoot: resolveOptions(options).pluginRoot,
    }, null, 2);
  }
  const payload = await readPayload(stdinText);
  const result = await runGeminiHookAdapter(eventName, payload, options);
  return JSON.stringify(result.response);
}

if (import.meta.main) {
  process.stdout.write(await runGeminiHookAdapterCli());
}
