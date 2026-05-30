// palantir-mini sprint-064 W5 - reusable Codex adapter for the palantir-mini
// hook surface. Codex is the active local install target in this checkout.
/**
 * @palantirSurface
 * schemaVersion: palantir-mini/aip-fde-local-surface/v1
 * surfaceKind: runtime-adapter
 * surfaceId: runtime-adapter:codex-hook-adapter
 * workflowFamily: runtimeAdapterAndParity
 * phaseRefs:
 *   - runtime-adapter:codex-hook-bridge
 *   - hook-policy:live-read
 * aipSurfaceRefs:
 *   - runtime-projection
 *   - tools-command
 *   - security-governance
 * palantirSourceAuthorityRefs:
 *   - localResearchPath: ~/.claude/research/palantir-foundry/architecture/architecture-center-aip-architecture.md
 *     externalUrl: https://www.palantir.com/docs/foundry/architecture-center/aip-architecture/
 *     lastVerified: 2026-05-24
 *     sourceClass: palantir-aip
 * requiredContracts:
 *   semanticIntent: optional
 *   digitalTwinChange: optional
 *   workContract: optional
 *   userDecisionRecord: optional
 * mutationCapability: proposal-only
 * deterministicStatus: enforced
 * runtimeProjection:
 *   codex:
 *     support: adapter-native
 *     evidenceRefs:
 *       - hooks/codex-hooks.json
 *       - lib/codex/codex-hook-adapter.ts
 *     fallbackObligations:
 *       - Report unsupported Codex lifecycle gaps instead of claiming native parity.
 *     unsupportedSurfaceRefs:
 *       - codex:unsupported-lifecycle-hooks
 *     smokeEvidenceRefs:
 *       - tests/lib/codex/codex-hook-adapter.test.ts
 * outputStateRefs:
 *   - hookSpecificOutput
 *   - additionalContext
 *   - permissionDecision
 * validationRefs:
 *   - tests/lib/codex/codex-hook-adapter.test.ts
 *   - tests/runtime-boundary/codex-plugin-hooks.test.ts
 * unsupportedParityClaimsForbidden: true
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { emit } from "../../scripts/log";
import {
  CODEX_NATIVE_EVENTS,
  CODEX_SCHEMA_ONLY_EVENTS,
  codexFallbackFactForEvent,
  runtimeCanObserveEvent,
  runtimeHasSchemaOnlyEvent,
} from "../runtime/capability-matrix";
import { palantirMiniMcpToolAliasesFor } from "../hooks/tool-classifier";
import { resolvePalantirMiniRoot } from "../config/root";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export type JsonObject = Record<string, unknown>;

export type HookConfig = {
  type?: string;
  command?: string;
  timeout?: number;
  statusMessage?: string;
  async?: boolean;
  decision?: string;
  failureMode?: string;
  permissionDecision?: string;
  if?: string;
};

export type HookGroup = {
  matcher?: string;
  hooks?: HookConfig[];
};

export type HooksDocument = {
  hooks?: Record<string, HookGroup[]>;
};

export type HookRun = {
  hook: HookConfig;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
  timeoutObservation?: {
    eventName: string;
    hookName: string;
    command: string;
    timeoutMs: number;
  };
  parsed?: JsonObject;
};

export interface CodexAdapterOptions {
  home?: string;
  pluginRoot?: string;
  hooksJsonPath?: string;
  bunPath?: string;
  cwd?: string;
  env?: Record<string, string | undefined>;
}

interface ResolvedOptions {
  home: string;
  pluginRoot: string;
  hooksJsonPath: string;
  bunPath: string;
  cwd: string;
  env: Record<string, string | undefined>;
}

export interface CodexAdapterRunResult {
  response: JsonObject;
  matchedHooks: HookConfig[];
  runs: HookRun[];
}

export interface PromptFrontDoorIdentityContext {
  promptId: string;
  promptHash: string;
  sessionId: string;
  runtime: "claude" | "codex" | "cursor" | "gemini" | "unknown";
}

const DEFAULT_HOME = process.env.HOME || "/home/palantirkc";

export const CODEX_EVENTS = new Set<string>(CODEX_NATIVE_EVENTS);

export const DOCUMENTED_WIRE_EVENTS = new Set([
  "SessionStart",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "UserPromptSubmit",
  "SubagentStart",
  "SubagentStop",
  "Stop",
]);

function policyEventNameFor(eventName: string): string {
  return eventName === "PermissionRequest" ? "PreToolUse" : eventName;
}

function resolveOptions(options: CodexAdapterOptions = {}): ResolvedOptions {
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
  const hooksJsonPath = options.hooksJsonPath ?? path.join(pluginRoot, "hooks", "hooks.json");
  const bunPath =
    options.bunPath ??
    (existsSync(path.join(home, ".bun", "bin", "bun")) ? path.join(home, ".bun", "bin", "bun") : "bun");

  return {
    home,
    pluginRoot,
    hooksJsonPath,
    bunPath,
    cwd: options.cwd ?? process.cwd(),
    env: options.env ?? process.env,
  };
}

function diagnosticSafeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "unknown";
}

function projectRootForPayload(payload: JsonObject, options: CodexAdapterOptions = {}): string {
  const resolved = resolveOptions(options);
  return typeof payload.cwd === "string" && payload.cwd.trim() ? payload.cwd : resolved.cwd;
}

function sessionIdForPayload(payload: JsonObject): string | undefined {
  for (const key of ["session_id", "sessionId", "turn_id"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function claimDailyDiagnosticMarker(
  projectRoot: string,
  kind: string,
  eventName: string,
  hookName: string,
): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const dir = path.join(projectRoot, ".palantir-mini", "session", "codex-adapter-diagnostics");
  const markerPath = path.join(
    dir,
    `${diagnosticSafeSegment(kind)}-${diagnosticSafeSegment(eventName)}-${diagnosticSafeSegment(hookName)}-${day}.json`,
  );
  if (existsSync(markerPath)) return false;
  try {
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      markerPath,
      `${JSON.stringify({ kind, eventName, hookName, day, observedAt: new Date().toISOString() }, null, 2)}\n`,
      { encoding: "utf8", flag: "wx" },
    );
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    return code !== "EEXIST";
  }
}

async function emitCodexAdapterTimeoutObserved(
  observation: NonNullable<HookRun["timeoutObservation"]>,
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): Promise<void> {
  const projectRoot = projectRootForPayload(payload, options);
  if (!claimDailyDiagnosticMarker(projectRoot, "timeout", observation.eventName, observation.hookName)) {
    return;
  }
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: true,
        errorClass: "codex_adapter_timeout_observed",
        eventName: observation.eventName,
        hookName: observation.hookName,
        command: observation.command,
        timeoutMs: observation.timeoutMs,
      } as Record<string, unknown>,
      toolName: "codex-hook-adapter",
      cwd: projectRoot,
      sessionId: sessionIdForPayload(payload),
      identity: "codex",
      runtime: "codex",
      surface: "hook-adapter",
      memoryLayers: ["working", "episodic"],
      reasoning:
        `Codex adapter observed hook timeout event=${observation.eventName} ` +
        `hook=${observation.hookName} timeoutMs=${observation.timeoutMs}.`,
    });
  } catch {
    // Best-effort diagnostics must never change hook behavior.
  }
}

async function emitCodexAdapterCapabilityMismatch(
  eventName: string,
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): Promise<void> {
  const fallbackFact = codexFallbackFactForEvent(eventName);
  if (!fallbackFact) return;
  const projectRoot = projectRootForPayload(payload, options);
  try {
    await emit({
      type: "validation_phase_completed",
      payload: {
        phase: "runtime",
        passed: true,
        errorClass: "codex_adapter_capability_mismatch",
        runtime: "codex",
        attemptedEvent: eventName,
        fallbackFact,
      } as Record<string, unknown>,
      toolName: "codex-hook-adapter",
      cwd: projectRoot,
      sessionId: sessionIdForPayload(payload),
      identity: "codex",
      runtime: "codex",
      surface: "hook-adapter",
      memoryLayers: ["working", "episodic", "semantic"],
      reasoning:
        `Codex adapter received non-Codex event=${eventName}; emitted the documented fallback fact instead of claiming runtime parity.`,
    });
  } catch {
    // Best-effort diagnostics must never change hook behavior.
  }
}

export function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};
}

export function loadHooks(options: CodexAdapterOptions = {}): HooksDocument {
  const resolved = resolveOptions(options);
  return JSON.parse(readFileSync(resolved.hooksJsonPath, "utf8")) as HooksDocument;
}

function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}

function getToolInput(payload: JsonObject): JsonObject {
  return asObject(payload.tool_input);
}

export function collectPaths(value: unknown, acc: string[] = [], home = DEFAULT_HOME): string[] {
  if (typeof value === "string") {
    if (
      value.startsWith("/") ||
      value.startsWith("~/") ||
      value.includes("/") ||
      value.endsWith(".ts") ||
      value.endsWith(".tsx") ||
      value.endsWith(".js") ||
      value.endsWith(".json") ||
      value.endsWith(".md")
    ) {
      acc.push(value.replace(/^~(?=\/)/, home));
    }
    return acc;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, acc, home);
    return acc;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as JsonObject)) {
      if (
        /^(file_path|path|notebook_path|target|targetPath|source|destination|uri|filename)$/i.test(key)
      ) {
        collectPaths(nested, acc, home);
      } else if (Array.isArray(nested) || (nested && typeof nested === "object")) {
        collectPaths(nested, acc, home);
      }
    }
  }
  return acc;
}

export function collectPatchPaths(command: string | undefined): string[] {
  if (!command) return [];
  const paths: string[] = [];
  const patterns = [
    /^\*\*\* Add File:\s+(.+)$/gm,
    /^\*\*\* Update File:\s+(.+)$/gm,
    /^\*\*\* Delete File:\s+(.+)$/gm,
    /^\*\*\* Move to:\s+(.+)$/gm,
  ];
  for (const pattern of patterns) {
    for (const match of command.matchAll(pattern)) {
      if (match[1]) paths.push(match[1].trim());
    }
  }
  return paths;
}

function normalizeSlash(value: string): string {
  return value.replaceAll("\\", "/");
}

function globToRegExp(glob: string, starMatchesSlash = false): RegExp {
  let out = "^";
  const src = normalizeSlash(glob);
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i]!;
    const next = src[i + 1];
    if (ch === "*" && next === "*") {
      out += ".*";
      i += 1;
    } else if (ch === "*") {
      out += starMatchesSlash ? ".*" : "[^/]*";
    } else if (ch === "?") {
      out += ".";
    } else if ("\\.^$+{}[]()|".includes(ch)) {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
  }
  out += "$";
  return new RegExp(out);
}

function matchesGlob(glob: string, candidates: string[], starMatchesSlash = false): boolean {
  const rx = globToRegExp(glob, starMatchesSlash);
  return candidates.some((candidate) => rx.test(normalizeSlash(candidate)));
}

export function palantirMiniToolAliases(toolName: string): string[] {
  return palantirMiniMcpToolAliasesFor(toolName);
}

export function matcherCandidates(
  eventName: string,
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): string[] {
  const home = resolveOptions(options).home;
  const toolName = typeof payload.tool_name === "string" ? payload.tool_name : "";
  const source = typeof payload.source === "string" ? payload.source : "";
  const input = getToolInput(payload);
  const command = commandText(payload);
  const candidates = new Set<string>();

  if (eventName === "SessionStart" && source) candidates.add(source);
  if (toolName) candidates.add(toolName);
  for (const alias of palantirMiniToolAliases(toolName)) candidates.add(alias);
  if (toolName === "apply_patch") {
    candidates.add("Edit");
    candidates.add("Write");
    candidates.add("MultiEdit");
    candidates.add("NotebookEdit");
  }
  if (toolName === "multi_agent_v1.spawn_agent") {
    candidates.add("Agent");
  }
  if (toolName === "functions.exec_command") {
    candidates.add("Bash");
  }
  for (const candidatePath of collectPaths(input, [], home)) candidates.add(candidatePath);
  for (const candidatePath of collectPatchPaths(command)) candidates.add(candidatePath);
  if (command) candidates.add(command);
  return [...candidates];
}

function matchesMatcher(
  matcher: string | undefined,
  eventName: string,
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): boolean {
  if (!matcher || matcher === "*" || matcher.trim() === "") return true;
  if (eventName === "UserPromptSubmit" || eventName === "Stop") return true;

  const candidates = matcherCandidates(eventName, payload, options);
  const matcherAliases = [matcher, ...palantirMiniToolAliases(matcher)];
  if (matcherAliases.some((alias) => candidates.includes(alias))) return true;

  const parts = matcher.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1 && parts.every((part) => !part.includes("/") && !part.includes("*"))) {
    return parts.some((part) => candidates.includes(part));
  }

  if (matcher.includes("*") || matcher.includes("/")) {
    if (matchesGlob(matcher, candidates)) return true;
  }

  try {
    const rx = new RegExp(matcher);
    return candidates.some((candidate) => rx.test(candidate));
  } catch {
    return candidates.includes(matcher);
  }
}

function fileCandidates(payload: JsonObject, options: CodexAdapterOptions = {}): string[] {
  const input = getToolInput(payload);
  const command = typeof input.command === "string" ? input.command : undefined;
  const home = resolveOptions(options).home;
  return [...new Set([...collectPaths(input, [], home), ...collectPatchPaths(command)])];
}

function commandText(payload: JsonObject): string | undefined {
  const input = getToolInput(payload);
  for (const key of ["command", "cmd", "patch"]) {
    const value = input[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function toolCandidates(payload: JsonObject): string[] {
  const toolName = typeof payload.tool_name === "string" ? payload.tool_name : "";
  const tools = new Set<string>();
  if (toolName) tools.add(toolName);
  for (const alias of palantirMiniToolAliases(toolName)) tools.add(alias);
  if (toolName === "apply_patch") {
    tools.add("Edit");
    tools.add("Write");
    tools.add("MultiEdit");
    tools.add("NotebookEdit");
  }
  if (toolName === "multi_agent_v1.spawn_agent") tools.add("Agent");
  if (toolName === "functions.exec_command" || toolName === "functions.write_stdin") tools.add("Bash");
  return [...tools];
}

function matchesToolExpression(expr: string, payload: JsonObject): boolean {
  const tools = toolCandidates(payload);
  return expr.split("|").map((part) => part.trim()).filter(Boolean).some((part) => tools.includes(part));
}

function matchesPathExpression(expr: string, paths: string[]): boolean {
  const parts = expr.split("|").map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) return true;
  let sawPositive = false;
  for (const part of parts) {
    const patternMatchesCommand = part.includes(" ");
    if (part.startsWith("!")) {
      if (matchesGlob(part.slice(1), paths, patternMatchesCommand)) return false;
    } else {
      sawPositive = true;
      if (matchesGlob(part, paths, patternMatchesCommand)) return true;
    }
  }
  return !sawPositive;
}

function splitTopLevelAlternatives(expr: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < expr.length; i += 1) {
    const ch = expr[i];
    if (ch === "(") depth += 1;
    else if (ch === ")" && depth > 0) depth -= 1;
    else if (ch === "|" && depth === 0) {
      parts.push(expr.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(expr.slice(start).trim());
  return parts.filter(Boolean);
}

function matchesIf(condition: string | undefined, payload: JsonObject, options: CodexAdapterOptions = {}): boolean {
  if (!condition || condition.trim() === "") return true;
  const expr = condition.trim();
  const alternatives = splitTopLevelAlternatives(expr);
  if (alternatives.length > 1) {
    return alternatives.some((alternative) => matchesIf(alternative, payload, options));
  }
  const paths = fileCandidates(payload, options);
  const command = commandText(payload);
  const targetCandidates = command ? [...paths, command] : paths;

  if (expr.startsWith("!")) {
    return !matchesPathExpression(expr.slice(1), targetCandidates);
  }

  const call = expr.match(/^([^()]+)\((.*)\)$/);
  if (call) {
    const toolExpr = call[1]!.trim();
    const pathExpr = call[2]!.trim();
    return matchesToolExpression(toolExpr, payload) && matchesPathExpression(pathExpr, targetCandidates);
  }

  if (expr.includes("|") && !expr.includes("/") && !expr.includes("*")) {
    return matchesToolExpression(expr, payload);
  }

  if (expr.includes("*") || expr.includes("/")) {
    return matchesPathExpression(expr, targetCandidates);
  }

  return true;
}

export function matchingHooks(
  doc: HooksDocument,
  eventName: string,
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): HookConfig[] {
  const groups = doc.hooks?.[eventName] ?? [];
  const hooks: HookConfig[] = [];
  for (const group of groups) {
    if (!matchesMatcher(group.matcher, eventName, payload, options)) continue;
    for (const hook of group.hooks ?? []) {
      if (hook.type !== "command" || typeof hook.command !== "string") continue;
      if (!matchesIf(hook.if, payload, options)) continue;
      hooks.push(hook);
    }
  }
  return hooks;
}

function rewriteCommand(command: string, options: ResolvedOptions): string {
  return command
    .replaceAll("${PALANTIR_MINI_ROOT}", options.pluginRoot)
    .replaceAll("${PALANTIR_MINI_PLUGIN_ROOT}", options.pluginRoot)
    .replaceAll("${PLUGIN_ROOT}", options.pluginRoot)
    .replace(/^bun\s+run\s+/, `${options.bunPath} run `);
}

function deepCloneObject(value: JsonObject): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

function pluginPalantirToolName(toolName: string): string | undefined {
  const aliases = palantirMiniToolAliases(toolName);
  return aliases.find((alias) => alias.startsWith("mcp__plugin_palantir-mini_palantir-mini__"));
}

export function adaptPayloadForHookScripts(payload: JsonObject): JsonObject {
  const next = deepCloneObject(payload);
  const toolName = typeof next.tool_name === "string" ? next.tool_name : "";
  const input = asObject(next.tool_input);
  next.tool_input = input;

  const pluginMcpName = pluginPalantirToolName(toolName);
  if (pluginMcpName) {
    next.tool_name = pluginMcpName;
    return next;
  }

  if (toolName === "apply_patch") {
    const command = typeof input.command === "string" ? input.command : "";
    const paths = collectPatchPaths(command);
    if (paths.length > 0 && typeof input.file_path !== "string") {
      input.file_path = paths[0];
    }
    next.tool_name = command.includes("*** Add File:") && !command.includes("*** Update File:") ? "Write" : "Edit";
  } else if (toolName === "functions.exec_command") {
    next.tool_name = "Bash";
  }

  return next;
}

export function parseHookJson(stdout: string): JsonObject | undefined {
  const trimmed = stdout.trim();
  if (!trimmed) return undefined;
  const lines = trimmed.split(/\r?\n/).reverse();
  for (const line of lines) {
    const candidate = line.trim();
    if (!candidate.startsWith("{")) continue;
    try {
      return asObject(JSON.parse(candidate));
    } catch {
      continue;
    }
  }
  try {
    return asObject(JSON.parse(trimmed));
  } catch {
    return undefined;
  }
}

export async function runCommandHook(
  hook: HookConfig,
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): Promise<HookRun> {
  const resolved = resolveOptions(options);
  const command = rewriteCommand(hook.command ?? "", resolved);
  const timeoutMs = Math.max(1, hook.timeout ?? 3000) * 1000;
  const cwd = typeof payload.cwd === "string" && payload.cwd.trim() ? payload.cwd : resolved.cwd;
  const hookPayload = adaptPayloadForHookScripts(payload);
  const proc = Bun.spawn(["bash", "-lc", command], {
    cwd,
    env: {
      ...process.env,
      ...resolved.env,
      PALANTIR_MINI_ROOT: resolved.pluginRoot,
      PALANTIR_MINI_PLUGIN_ROOT: resolved.pluginRoot,
      PLUGIN_ROOT: resolved.pluginRoot,
      PALANTIR_MINI_HOST_RUNTIME: "codex",
    },
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });

  proc.stdin.write(stringifyJson(hookPayload));
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
  if (timedOut) {
    const hookName = command.match(/hooks\/([^"'\s/]+\.(?:ts|js))/)?.[1] ?? "unknown";
    run.timeoutObservation = {
      eventName: typeof payload.hook_event_name === "string" ? payload.hook_event_name : "unknown",
      hookName,
      command,
      timeoutMs,
    };
    await emitCodexAdapterTimeoutObserved(run.timeoutObservation, payload, options);
  }
  const parsed = parseHookJson(stdout);
  if (parsed) run.parsed = parsed;
  return run;
}

function getNestedObject(root: JsonObject | undefined, key: string): JsonObject {
  return asObject(root?.[key]);
}

function textField(root: JsonObject | undefined, key: string): string | undefined {
  const value = root?.[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function promptIdentityField(context: string, field: keyof PromptFrontDoorIdentityContext): string | undefined {
  const match = context.match(new RegExp(`^\\s*${field}:\\s*(.+?)\\s*$`, "m"));
  return match?.[1]?.trim();
}

export function extractPromptFrontDoorIdentityContext(
  additionalContext: string,
): PromptFrontDoorIdentityContext | undefined {
  const promptId = promptIdentityField(additionalContext, "promptId");
  const promptHash = promptIdentityField(additionalContext, "promptHash");
  const sessionId = promptIdentityField(additionalContext, "sessionId");
  const runtime = promptIdentityField(additionalContext, "runtime");
  if (!promptId || !promptHash || !sessionId || !runtime) return undefined;
  if (
    runtime !== "claude" &&
    runtime !== "codex" &&
    runtime !== "cursor" &&
    runtime !== "gemini" &&
    runtime !== "unknown"
  ) {
    return undefined;
  }
  return { promptId, promptHash, sessionId, runtime };
}

function blockReason(run: HookRun): string | undefined {
  const parsed = run.parsed;
  if (run.exitCode === 2) return run.stderr.trim() || "palantir-mini hook blocked this action";
  if ((run.timedOut || (run.exitCode !== null && run.exitCode !== 0)) && run.hook.failureMode === "fail-closed") {
    return run.stderr.trim() || `palantir-mini hook failed closed: ${run.hook.command}`;
  }
  if ((run.timedOut || (run.exitCode !== null && run.exitCode !== 0)) && run.hook.decision === "block") {
    return run.stderr.trim() || `palantir-mini blocking hook failed closed: ${run.hook.command}`;
  }
  if ((run.timedOut || (run.exitCode !== null && run.exitCode !== 0)) && run.hook.permissionDecision === "deny") {
    return run.stderr.trim() || `palantir-mini permission hook failed closed: ${run.hook.command}`;
  }
  if (!parsed) return undefined;
  const specific = getNestedObject(parsed, "hookSpecificOutput");
  if (textField(specific, "permissionDecision") === "deny") {
    return textField(specific, "permissionDecisionReason") || textField(parsed, "reason") || textField(parsed, "message");
  }
  if (textField(parsed, "permissionDecision") === "deny") {
    return textField(parsed, "reason") || textField(parsed, "message");
  }
  if (textField(parsed, "decision") === "block") {
    return textField(parsed, "reason") || textField(parsed, "message") || "palantir-mini hook blocked this action";
  }
  return undefined;
}

const DEFAULT_CONTEXT_LIMIT_CHARS = 2400;

const CONTEXT_LIMIT_CHARS_BY_EVENT: Record<string, number> = {
  SessionStart:      1600,
  UserPromptSubmit: 4000,
  PreCompact:       1600,
  PostCompact:      1600,
  Stop:             1600,
};

function contextLimitForEvent(eventName: string): number {
  return CONTEXT_LIMIT_CHARS_BY_EVENT[eventName] ?? DEFAULT_CONTEXT_LIMIT_CHARS;
}

function contextDedupeKey(ctx: string): string {
  return ctx.replace(/\s+/g, " ").trim();
}

function capContext(eventName: string, context: string): string {
  const limit = contextLimitForEvent(eventName);
  if (context.length <= limit) return context;

  let footer = "";
  let headLimit = limit;
  let omitted = context.length - limit;
  do {
    footer = `\n\n[palantir-mini Codex adapter: context capped at ${limit} chars; omitted ${omitted} chars from hook output.]`;
    headLimit = Math.max(0, limit - footer.length);
    omitted = context.length - headLimit;
  } while ((context.slice(0, headLimit).trimEnd() + footer).length > limit && headLimit > 0);

  return context.slice(0, headLimit).trimEnd() + footer;
}

function collectContext(eventName: string, runs: HookRun[]): string {
  const chunks: string[] = [];
  const seen = new Set<string>();
  const pushChunk = (chunk: string) => {
    const key = contextDedupeKey(chunk);
    if (!key || seen.has(key)) return;
    seen.add(key);
    chunks.push(chunk);
  };

  for (const run of runs) {
    const parsed = run.parsed;
    if (!parsed) {
      if (run.timedOut) pushChunk(`palantir-mini Codex adapter: timed out running ${run.hook.command}`);
      else if (run.exitCode && run.exitCode !== 0) {
        pushChunk(`palantir-mini Codex adapter: hook exited ${run.exitCode}: ${run.stderr.trim()}`);
      }
      continue;
    }
    const specific = getNestedObject(parsed, "hookSpecificOutput");
    const ctx =
      textField(parsed, "additionalContext") ||
      textField(parsed, "systemMessage") ||
      textField(specific, "additionalContext");
    if (ctx) pushChunk(ctx);
  }
  return capContext(eventName, chunks.join("\n\n"));
}

export function unsupportedEventSummary(doc: HooksDocument, options: CodexAdapterOptions = {}): string {
  const resolved = resolveOptions(options);
  const entries = Object.entries(doc.hooks ?? {});
  const unsupported = entries
    .filter(([event]) => !runtimeCanObserveEvent("codex", event) && !runtimeHasSchemaOnlyEvent("codex", event))
    .map(([event, groups]) => `${event}:${groups.flatMap((group) => group.hooks ?? []).length}`);
  const schemaOnly = entries
    .filter(([event]) => runtimeHasSchemaOnlyEvent("codex", event))
    .map(([event, groups]) => `${event}:${groups.flatMap((group) => group.hooks ?? []).length}`);

  const parts = [
    `source=${resolved.hooksJsonPath}`,
    `nativeGaps=${unsupported.length ? unsupported.join(",") : "none"}`,
    `schemaOnly=${schemaOnly.length ? schemaOnly.join(",") : "none"}`,
  ];
  return `palantir-mini Codex adapter active (${parts.join("; ")}).`;
}

export function responseFor(
  eventName: string,
  runs: HookRun[],
  doc: HooksDocument,
  options: CodexAdapterOptions = {},
): JsonObject {
  const context = collectContext(eventName, runs);
  const block = runs.map(blockReason).find(Boolean);

  if (eventName === "PreToolUse" && block) {
    return {
      systemMessage: block,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: block,
      },
    };
  }

  if (eventName === "PermissionRequest" && block) {
    return {
      systemMessage: block,
      hookSpecificOutput: {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "deny",
          message: block,
        },
      },
    };
  }

  if (eventName === "PostToolUse" && block) {
    return {
      decision: "block",
      reason: block,
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: context || block,
      },
    };
  }

  if (eventName === "UserPromptSubmit" && block) {
    return {
      decision: "block",
      reason: block,
    };
  }

  if (eventName === "Stop" && block) {
    return {
      decision: "block",
      reason: block,
    };
  }

  if (eventName === "SessionStart") {
    const adapterContext = unsupportedEventSummary(doc, options);
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: [adapterContext, context].filter(Boolean).join("\n\n"),
      },
    };
  }

  if (eventName === "UserPromptSubmit" && context) {
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: context,
      },
    };
  }

  if ((eventName === "PreCompact" || eventName === "PostCompact") && context) {
    return {
      continue: true,
      systemMessage: context,
    };
  }

  if (eventName === "Stop") {
    return context ? { continue: true, systemMessage: context } : { continue: true };
  }

  return context ? { systemMessage: context } : {};
}

export function inspectHooks(doc: HooksDocument, options: CodexAdapterOptions = {}): JsonObject {
  const resolved = resolveOptions(options);
  const rows = Object.entries(doc.hooks ?? {}).map(([event, groups]) => {
    const commandCount = groups.flatMap((group) => group.hooks ?? []).length;
    return {
      event,
      commandCount,
      codexNativeEvent: runtimeCanObserveEvent("codex", event),
      codexSchemaOnlyEvent: runtimeHasSchemaOnlyEvent("codex", event),
      codexSchemaEvent: runtimeCanObserveEvent("codex", event) || runtimeHasSchemaOnlyEvent("codex", event),
      documentedWire: DOCUMENTED_WIRE_EVENTS.has(event),
    };
  });
  return { source: resolved.hooksJsonPath, rows };
}

export async function runCodexHookAdapter(
  eventName: string,
  inputPayload: JsonObject,
  options: CodexAdapterOptions = {},
): Promise<CodexAdapterRunResult> {
  const doc = loadHooks(options);
  if (eventName && runtimeHasSchemaOnlyEvent("codex", eventName)) {
    await emitCodexAdapterCapabilityMismatch(eventName, inputPayload, options);
    return {
      matchedHooks: [],
      runs: [],
      response: {
        systemMessage:
          `palantir-mini Codex adapter skipped schema-only event ${eventName}; native Codex lifecycle firing is unproven.`,
      },
    };
  }

  if (!eventName || !runtimeCanObserveEvent("codex", eventName)) {
    await emitCodexAdapterCapabilityMismatch(eventName, inputPayload, options);
    return {
      matchedHooks: [],
      runs: [],
      response: { systemMessage: `palantir-mini Codex adapter skipped unsupported event ${eventName ?? "unknown"}` },
    };
  }

  const policyEventName = policyEventNameFor(eventName);
  const payload = deepCloneObject(inputPayload);
  payload.hook_event_name = policyEventName;

  const hooks = matchingHooks(doc, policyEventName, payload, options);
  const syncHooks = hooks.filter((hook) => !hook.async);
  const asyncHooks = hooks.filter((hook) => hook.async);

  for (const hook of asyncHooks) {
    runCommandHook(hook, payload, options).catch(() => {});
  }

  const runs: HookRun[] = [];
  for (const hook of syncHooks) {
    runs.push(await runCommandHook(hook, payload, options));
  }

  return {
    response: responseFor(eventName, runs, doc, options),
    matchedHooks: hooks,
    runs,
  };
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

export async function runCodexHookAdapterCli(
  argv = process.argv,
  stdinText?: string,
  options: CodexAdapterOptions = {},
): Promise<string> {
  const eventName = argv[2];
  const doc = loadHooks(options);

  if (eventName === "--inspect") {
    return JSON.stringify(inspectHooks(doc, options), null, 2);
  }

  if (eventName === "--match") {
    const matchEventName = argv[3] ?? "";
    const policyEventName = policyEventNameFor(matchEventName);
    const payload = await readPayload(stdinText);
    payload.hook_event_name = policyEventName;
    const hooks = matchingHooks(doc, policyEventName, payload, options);
    return JSON.stringify(
      {
        event: matchEventName,
        policyEventName,
        toolName: payload.tool_name,
        candidates: matcherCandidates(policyEventName, payload, options),
        matchedCommands: hooks.map((hook) => hook.command),
      },
      null,
      2,
    );
  }

  const payload = await readPayload(stdinText);
  const result = await runCodexHookAdapter(eventName ?? "", payload, options);
  return JSON.stringify(result.response);
}

if (import.meta.main) {
  process.stdout.write(await runCodexHookAdapterCli());
}
