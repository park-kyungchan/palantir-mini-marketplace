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

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawn as spawnChildProcess } from "node:child_process";
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
import {
  detectPalantirMiniPluginOptOut,
  type PalantirMiniPluginOptOut,
} from "../ontology-engineering-response-template";
import { decideCodexPalantirMiniActivation } from "./palantir-mini-activation-policy";
import {
  PROMPT_RUNTIMES,
  PromptFrontDoorStore,
  isPromptRuntime,
  type PromptEnvelope,
  type PromptRuntime,
} from "../prompt-front-door";

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
  inputSchemaRef?: string;
  outputSchemaRef?: string;
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
  schemaMismatch?: string;
  timeoutObservation?: {
    eventName: string;
    hookName: string;
    command: string;
    timeoutMs: number;
  };
  parsed?: JsonObject;
};

type PayloadReadResult =
  | { payload: JsonObject; invalidJson?: undefined }
  | { payload: JsonObject; invalidJson: string };

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

export interface PalantirMiniPluginBypass {
  explicit: true;
  matchedMarker: string;
  source: "prompt" | "prompt-front-door";
  promptId?: string;
}

const DEFAULT_HOME = process.env.HOME || "/home/palantirkc";
const SESSION_PROJECT_ROOT_SCHEMA_VERSION = "codex-adapter/session-project-root/v1";
const SESSION_PLUGIN_OPT_OUT_SCHEMA_VERSION = "codex-adapter/session-plugin-opt-out/v1";

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

function promptFrontDoorSafeSegment(value: string): string {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function projectRootForPayload(payload: JsonObject, options: CodexAdapterOptions = {}): string {
  const resolved = resolveOptions(options);
  return typeof payload.cwd === "string" && payload.cwd.trim() ? payload.cwd : resolved.cwd;
}

function stripPathMentionBoundary(value: string): string {
  return value.replace(/[)\].,;:!?'"`>]+$/g, "");
}

function absolutePathMentions(value: string | undefined): string[] {
  if (!value) return [];
  const mentions: string[] = [];
  for (const match of value.matchAll(/(?:^|[\s"'`(<])((?:\/[^\s"'`<>)|;,]+)+)/g)) {
    const candidate = stripPathMentionBoundary(match[1] ?? "");
    if (candidate) mentions.push(candidate);
  }
  return mentions;
}

function findTrackedProjectRoot(start: string): string | undefined {
  let cur = path.resolve(start);
  const root = path.parse(cur).root;
  while (cur !== root) {
    if (existsSync(path.join(cur, ".palantir-mini"))) return cur;
    cur = path.dirname(cur);
  }
  return undefined;
}

function projectRootFromEventsFile(eventsFile: string | undefined): string | undefined {
  if (!eventsFile || !eventsFile.trim()) return undefined;
  const sessionDir = path.dirname(path.resolve(eventsFile));
  const palantirMiniDir = path.dirname(sessionDir);
  if (path.basename(palantirMiniDir) === ".palantir-mini") {
    const projectRoot = path.dirname(palantirMiniDir);
    return findTrackedProjectRoot(projectRoot);
  }
  return findTrackedProjectRoot(sessionDir);
}

function readJsonObject(filePath: string): JsonObject | undefined {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonObject : undefined;
  } catch {
    return undefined;
  }
}

function sessionProjectRootPath(home: string, sessionId: string): string {
  return path.join(
    home,
    ".palantir-mini",
    "session",
    "codex-adapter",
    "session-project-roots",
    `codex-${promptFrontDoorSafeSegment(sessionId)}.json`,
  );
}

function sessionPluginOptOutPath(home: string, sessionId: string): string {
  return path.join(
    home,
    ".palantir-mini",
    "session",
    "codex-adapter",
    "session-plugin-opt-outs",
    `codex-${promptFrontDoorSafeSegment(sessionId)}.json`,
  );
}

function readSessionProjectRootHint(payload: JsonObject, options: CodexAdapterOptions = {}): string | undefined {
  const sessionId = sessionIdForPayload(payload);
  if (!sessionId) return undefined;
  const resolved = resolveOptions(options);
  const record = readJsonObject(sessionProjectRootPath(resolved.home, sessionId));
  const projectRoot = typeof record?.projectRoot === "string" ? path.resolve(record.projectRoot) : undefined;
  if (!projectRoot) return undefined;
  return findTrackedProjectRoot(projectRoot) === projectRoot ? projectRoot : undefined;
}

function rememberSessionProjectRootHint(
  payload: JsonObject,
  options: CodexAdapterOptions = {},
  projectRoot: string | undefined,
): void {
  const sessionId = sessionIdForPayload(payload);
  if (!sessionId || !projectRoot) return;
  const normalizedRoot = path.resolve(projectRoot);
  if (findTrackedProjectRoot(normalizedRoot) !== normalizedRoot) return;

  const resolved = resolveOptions(options);
  const filePath = sessionProjectRootPath(resolved.home, sessionId);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      tmpPath,
      `${JSON.stringify({
        schemaVersion: SESSION_PROJECT_ROOT_SCHEMA_VERSION,
        runtime: "codex",
        sessionId,
        projectRoot: normalizedRoot,
        updatedAt: new Date().toISOString(),
      }, null, 2)}\n`,
      "utf8",
    );
    renameSync(tmpPath, filePath);
  } catch {
    // Continuity hints must never become mutation authority or block a hook run.
  }
}

function optOutForBypass(bypass: PalantirMiniPluginBypass): PalantirMiniPluginOptOut {
  return {
    explicit: true,
    matchedMarker: bypass.matchedMarker,
    reason:
      bypass.source === "prompt-front-door"
        ? "A prior prompt in this Codex session explicitly requested that the palantir-mini plugin not be used."
        : "User prompt explicitly requested that the palantir-mini plugin not be used for this turn.",
  };
}

function readSessionPluginOptOut(
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): PalantirMiniPluginOptOut | undefined {
  const sessionId = sessionIdForPayload(payload);
  if (!sessionId) return undefined;
  const resolved = resolveOptions(options);
  const record = readJsonObject(sessionPluginOptOutPath(resolved.home, sessionId));
  const optOut = asObject(record?.optOut);
  if (optOut.explicit !== true || typeof optOut.matchedMarker !== "string") return undefined;
  return {
    explicit: true,
    matchedMarker: optOut.matchedMarker,
    reason:
      typeof optOut.reason === "string"
        ? optOut.reason
        : "A prior prompt in this Codex session explicitly requested that the palantir-mini plugin not be used.",
  };
}

function rememberSessionPluginOptOut(
  payload: JsonObject,
  options: CodexAdapterOptions = {},
  optOut: PalantirMiniPluginOptOut | undefined,
): void {
  const sessionId = sessionIdForPayload(payload);
  if (!sessionId || !optOut?.explicit) return;

  const resolved = resolveOptions(options);
  const filePath = sessionPluginOptOutPath(resolved.home, sessionId);
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      tmpPath,
      `${JSON.stringify({
        schemaVersion: SESSION_PLUGIN_OPT_OUT_SCHEMA_VERSION,
        runtime: "codex",
        sessionId,
        optOut,
        updatedAt: new Date().toISOString(),
      }, null, 2)}\n`,
      "utf8",
    );
    renameSync(tmpPath, filePath);
  } catch {
    // Session opt-out continuity must never become mutation authority or block
    // a hook run; the current prompt-level opt-out still protects this turn.
  }
}

function projectRootHintForPayload(payload: JsonObject, options: CodexAdapterOptions = {}): string | undefined {
  const resolved = resolveOptions(options);
  const envProject = resolved.env.PALANTIR_MINI_PROJECT ?? process.env.PALANTIR_MINI_PROJECT;
  if (envProject && findTrackedProjectRoot(envProject)) return path.resolve(envProject);

  const eventsProject = projectRootFromEventsFile(
    resolved.env.PALANTIR_MINI_EVENTS_FILE ?? process.env.PALANTIR_MINI_EVENTS_FILE,
  );
  if (eventsProject) return eventsProject;

  const prompt = typeof payload.prompt === "string" ? payload.prompt : undefined;
  for (const mentionedPath of absolutePathMentions(prompt)) {
    const projectRoot = findTrackedProjectRoot(mentionedPath);
    if (projectRoot) return projectRoot;
  }

  const storedProject = readSessionProjectRootHint(payload, options);
  if (storedProject) return storedProject;

  const cwd = typeof payload.cwd === "string" && payload.cwd.trim() ? payload.cwd : resolved.cwd;
  const cwdProject = findTrackedProjectRoot(cwd);
  if (cwdProject) return cwdProject;

  return undefined;
}

function sessionIdForPayload(payload: JsonObject): string | undefined {
  for (const key of ["session_id", "sessionId", "turn_id"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function promptHashMatchesPayload(envelope: PromptEnvelope, payload: JsonObject): boolean {
  const input = asObject(payload.tool_input);
  const expectedPromptHash = input.promptHash;
  return typeof expectedPromptHash !== "string" || envelope.promptHash === expectedPromptHash;
}

function promptIdForPayload(payload: JsonObject): string | undefined {
  const input = asObject(payload.tool_input);
  const promptId = input.promptId;
  return typeof promptId === "string" && promptId.trim() ? promptId : undefined;
}

function runtimeForPayload(payload: JsonObject, options: CodexAdapterOptions = {}): PromptRuntime | undefined {
  const resolved = resolveOptions(options);
  const envRuntime = resolved.env.PALANTIR_MINI_HOST_RUNTIME ?? process.env.PALANTIR_MINI_HOST_RUNTIME;
  if (isPromptRuntime(envRuntime)) return envRuntime;
  const input = asObject(payload.tool_input);
  const inputRuntime = input.runtime;
  if (isPromptRuntime(inputRuntime)) return inputRuntime;
  if (typeof payload.turn_id === "string" && payload.turn_id.trim()) return "codex";
  return undefined;
}

function uniqueAbsPaths(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value || !value.trim()) continue;
    const resolved = path.resolve(value);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    result.push(resolved);
  }
  return result;
}

function promptFrontDoorRootCandidates(
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): string[] {
  const resolved = resolveOptions(options);
  const cwd = typeof payload.cwd === "string" && payload.cwd.trim() ? payload.cwd : resolved.cwd;
  const trackedRoot = findTrackedProjectRoot(cwd);
  const projectRootHint = projectRootHintForPayload(payload, options);
  return uniqueAbsPaths([
    resolved.env.PALANTIR_MINI_PROJECT,
    process.env.PALANTIR_MINI_PROJECT,
    projectRootFromEventsFile(resolved.env.PALANTIR_MINI_EVENTS_FILE),
    projectRootFromEventsFile(process.env.PALANTIR_MINI_EVENTS_FILE),
    projectRootHint,
    trackedRoot,
    "/home/palantirkc/palantir-mini-marketplace",
    cwd,
    resolved.cwd,
    resolved.home,
  ]);
}

async function readCurrentPromptEnvelope(
  projectRoot: string,
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): Promise<PromptEnvelope | undefined> {
  const sessionId = sessionIdForPayload(payload);
  if (!sessionId) return undefined;

  const store = new PromptFrontDoorStore({ projectRoot });
  const promptId = promptIdForPayload(payload);
  if (promptId) {
    const envelope = (await store.readEnvelope(sessionId, promptId)) ?? undefined;
    return envelope && promptHashMatchesPayload(envelope, payload) ? envelope : undefined;
  }

  const preferred = runtimeForPayload(payload, options);
  const runtimes = preferred
    ? [preferred, ...PROMPT_RUNTIMES.filter((runtime) => runtime !== preferred)]
    : PROMPT_RUNTIMES;
  for (const runtime of runtimes) {
    const pointer = await store.readCurrentPointer(runtime, sessionId);
    if (!pointer) continue;
    const envelope = (await store.readEnvelope(pointer.sessionId, pointer.promptId)) ?? undefined;
    if (envelope && promptHashMatchesPayload(envelope, payload)) return envelope;
  }
  return undefined;
}

async function currentPromptFrontDoorOptOut(
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): Promise<PalantirMiniPluginBypass | undefined> {
  for (const root of promptFrontDoorRootCandidates(payload, options)) {
    try {
      const envelope = await readCurrentPromptEnvelope(root, payload, options);
      if (!envelope?.palantirMiniPluginOptOut?.explicit) continue;
      return {
        explicit: true,
        matchedMarker: envelope.palantirMiniPluginOptOut.matchedMarker,
        source: "prompt-front-door",
        promptId: envelope.promptId,
      };
    } catch {
      // Prompt-front-door lookup is best-effort. A missing or corrupt store must
      // not fail closed before a user has explicitly opted in to palantir-mini.
    }
  }
  return undefined;
}

export function directPromptPluginOptOut(payload: JsonObject): PalantirMiniPluginBypass | undefined {
  const prompt = payload.prompt;
  if (typeof prompt !== "string" || prompt.trim().length === 0) return undefined;
  const optOut = detectPalantirMiniPluginOptOut(prompt);
  return optOut
    ? {
        explicit: true,
        matchedMarker: optOut.matchedMarker,
        source: "prompt",
      }
    : undefined;
}

function isPromptFrontDoorCaptureHook(hook: HookConfig): boolean {
  return typeof hook.command === "string" && /\bprompt-front-door-capture\b/.test(hook.command);
}

function pluginBypassResponse(eventName: string, bypass: PalantirMiniPluginBypass): JsonObject {
  if (eventName === "UserPromptSubmit") {
    return {
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: [
          "palantir-mini plugin opt-out is active for this prompt.",
          `Matched opt-out marker: ${bypass.matchedMarker}`,
          "Codex will not apply palantir-mini workflow routing, response-template enforcement, Prompt-DTC gates, or MCP-first hook enforcement for this prompt.",
        ].join("\n"),
      },
    };
  }
  if (
    eventName === "SessionStart" ||
    eventName === "PreCompact" ||
    eventName === "PostCompact" ||
    eventName === "Stop"
  ) {
    return { continue: true };
  }
  return {};
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

function validatePreToolUseInputSchema(payload: JsonObject): string | undefined {
  if (payload.hook_event_name !== "PreToolUse") return "hook_event_name must be PreToolUse";
  if (typeof payload.tool_name !== "string" || payload.tool_name.trim().length === 0) {
    return "tool_name must be a non-empty string";
  }
  if (
    payload.tool_input !== undefined &&
    (payload.tool_input === null ||
      typeof payload.tool_input !== "object" ||
      Array.isArray(payload.tool_input))
  ) {
    return "tool_input must be an object when present";
  }
  return undefined;
}

function validateGovernanceHookOutputSchema(output: JsonObject): string | undefined {
  const decision = output.decision;
  if (decision !== undefined && decision !== "block" && decision !== "continue") {
    return "decision must be block or continue";
  }
  const specific = asObject(output.hookSpecificOutput);
  const permissionDecision = specific.permissionDecision ?? output.permissionDecision;
  if (
    permissionDecision !== undefined &&
    permissionDecision !== "deny" &&
    permissionDecision !== "allow"
  ) {
    return "permissionDecision must be deny or allow";
  }
  const hookEventName = specific.hookEventName;
  if (hookEventName !== undefined && typeof hookEventName !== "string") {
    return "hookSpecificOutput.hookEventName must be a string";
  }
  return undefined;
}

function validateKnownHookSchema(schemaRef: string | undefined, value: JsonObject): string | undefined {
  if (!schemaRef) return undefined;
  const normalized = normalizeSlash(schemaRef);
  if (normalized.endsWith("schemas/hooks/pretooluse.input.schema.json")) {
    return validatePreToolUseInputSchema(value);
  }
  if (normalized.endsWith("schemas/hooks/governance-hook.output.schema.json")) {
    return validateGovernanceHookOutputSchema(value);
  }
  return undefined;
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

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function runShellCommandWithPayload(
  command: string,
  hookPayload: JsonObject,
  options: {
    cwd: string;
    env: Record<string, string | undefined>;
    timeoutMs: number;
  },
): Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }> {
  const payloadPath = path.join(
    "/tmp",
    `palantir-mini-codex-hook-payload-${process.pid}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.json`,
  );
  writeFileSync(payloadPath, stringifyJson(hookPayload), { encoding: "utf8", mode: 0o600 });
  return await new Promise<{ stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }>((resolve) => {
    const proc = spawnChildProcess("bash", ["-lc", `${command} < ${shellQuote(payloadPath)}`], {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const settle = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        unlinkSync(payloadPath);
      } catch {
        // Best-effort cleanup only. Hook behavior must come from the run result.
      }
      resolve({ stdout, stderr, exitCode, timedOut });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, options.timeoutMs);

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    proc.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    proc.on("error", (err) => {
      stderr += stderr ? `\n${err.message}` : err.message;
      settle(null);
    });
    proc.on("close", (code) => {
      settle(code);
    });
  });
}

export async function runCommandHook(
  hook: HookConfig,
  payload: JsonObject,
  options: CodexAdapterOptions = {},
): Promise<HookRun> {
  const resolved = resolveOptions(options);
  const command = rewriteCommand(hook.command ?? "", resolved);
  const timeoutMs = Math.max(1, hook.timeout ?? 3000) * 1000;
  const projectRootHint = projectRootHintForPayload(payload, options);
  const hookProjectRoot =
    resolved.env.PALANTIR_MINI_PROJECT ?? process.env.PALANTIR_MINI_PROJECT ?? projectRootHint;
  const cwd = hookProjectRoot ??
    (typeof payload.cwd === "string" && payload.cwd.trim() ? payload.cwd : resolved.cwd);
  const hookPayload = adaptPayloadForHookScripts({
    ...payload,
    ...(hookProjectRoot ? { cwd: hookProjectRoot } : {}),
  });
  const inputSchemaMismatch = validateKnownHookSchema(hook.inputSchemaRef, hookPayload);
  if (inputSchemaMismatch) {
    return {
      hook,
      stdout: "",
      stderr: `palantir-mini hook input schema mismatch: ${inputSchemaMismatch}`,
      exitCode: 1,
      timedOut: false,
      schemaMismatch: inputSchemaMismatch,
    };
  }
  const runResult = await runShellCommandWithPayload(command, hookPayload, {
    cwd,
    env: {
      ...process.env,
      ...resolved.env,
      PALANTIR_MINI_ROOT: resolved.pluginRoot,
      PALANTIR_MINI_PLUGIN_ROOT: resolved.pluginRoot,
      PLUGIN_ROOT: resolved.pluginRoot,
      ...(hookProjectRoot ? { PALANTIR_MINI_PROJECT: hookProjectRoot } : {}),
      PALANTIR_MINI_HOST_RUNTIME: "codex",
    },
    timeoutMs,
  });

  const run: HookRun = {
    hook,
    stdout: runResult.stdout,
    stderr: runResult.stderr,
    exitCode: runResult.exitCode,
    timedOut: runResult.timedOut,
  };
  if (runResult.timedOut) {
    const hookName = command.match(/hooks\/([^"'\s/]+\.(?:ts|js))/)?.[1] ?? "unknown";
    run.timeoutObservation = {
      eventName: typeof payload.hook_event_name === "string" ? payload.hook_event_name : "unknown",
      hookName,
      command,
      timeoutMs,
    };
    await emitCodexAdapterTimeoutObserved(run.timeoutObservation, payload, options);
  }
  const parsed = parseHookJson(run.stdout);
  if (parsed) {
    run.parsed = parsed;
    const outputSchemaMismatch = validateKnownHookSchema(hook.outputSchemaRef, parsed);
    if (outputSchemaMismatch) {
      run.schemaMismatch = outputSchemaMismatch;
    }
  }
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
  if (
    run.schemaMismatch &&
    (run.hook.failureMode === "fail-closed" ||
      run.hook.decision === "block" ||
      run.hook.permissionDecision === "defer" ||
      run.hook.permissionDecision === "deny")
  ) {
    return `palantir-mini hook schema mismatch: ${run.schemaMismatch}`;
  }
  if (run.exitCode === 2) return run.stderr.trim() || "palantir-mini hook blocked this action";
  if ((run.timedOut || (run.exitCode !== null && run.exitCode !== 0)) && run.hook.failureMode === "fail-closed") {
    if (run.timedOut) {
      return `palantir-mini hook timed out after ${run.timeoutObservation?.timeoutMs ?? "unknown"}ms: ${run.hook.command}`;
    }
    return run.stderr.trim() || `palantir-mini hook failed closed: ${run.hook.command}`;
  }
  if ((run.timedOut || (run.exitCode !== null && run.exitCode !== 0)) && run.hook.decision === "block") {
    if (run.timedOut) {
      return `palantir-mini blocking hook timed out after ${run.timeoutObservation?.timeoutMs ?? "unknown"}ms: ${run.hook.command}`;
    }
    return run.stderr.trim() || `palantir-mini blocking hook failed closed: ${run.hook.command}`;
  }
  if ((run.timedOut || (run.exitCode !== null && run.exitCode !== 0)) && run.hook.permissionDecision === "deny") {
    if (run.timedOut) {
      return `palantir-mini permission hook timed out after ${run.timeoutObservation?.timeoutMs ?? "unknown"}ms: ${run.hook.command}`;
    }
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
  const resolved = resolveOptions(options);
  const directBypass = directPromptPluginOptOut(inputPayload);
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
  const payloadProjectRootHint = projectRootHintForPayload(payload, options);
  rememberSessionProjectRootHint(payload, options, payloadProjectRootHint);
  if (directBypass?.explicit) {
    rememberSessionPluginOptOut(payload, options, optOutForBypass(directBypass));
  }
  const sessionOptOut = directBypass?.explicit
    ? undefined
    : readSessionPluginOptOut(payload, options);

  const toolInput = asObject(payload.tool_input);
  const activationDecision = decideCodexPalantirMiniActivation({
    eventName,
    policyEventName,
    cwd: typeof payload.cwd === "string" ? payload.cwd : resolved.cwd,
    pluginRoot: resolved.pluginRoot,
    hooksJsonPath: resolved.hooksJsonPath,
    toolName: typeof payload.tool_name === "string" ? payload.tool_name : undefined,
    toolInput,
    prompt: typeof payload.prompt === "string" ? payload.prompt : undefined,
    sessionId: sessionIdForPayload(payload),
    candidateProjectRoots: promptFrontDoorRootCandidates(payload, options),
    env: resolved.env,
    hardOptOut: sessionOptOut,
  });

  if (activationDecision.mode === "silent-bypass") {
    return {
      response: {},
      matchedHooks: [],
      runs: [],
    };
  }

  const storedBypass =
    directBypass || eventName === "UserPromptSubmit" ? undefined : await currentPromptFrontDoorOptOut(payload, options);
  const bypass = directBypass ?? storedBypass;
  const matchedHooks = matchingHooks(doc, policyEventName, payload, options);
  const hooks =
    bypass?.explicit && eventName === "UserPromptSubmit"
      ? matchedHooks.filter(isPromptFrontDoorCaptureHook)
      : bypass?.explicit
        ? []
        : matchedHooks;

  if (bypass?.explicit && hooks.length === 0) {
    return {
      response: pluginBypassResponse(eventName, bypass),
      matchedHooks: [],
      runs: [],
    };
  }

  const syncHooks = hooks.filter((hook) => !hook.async);
  const asyncHooks = hooks.filter((hook) => hook.async);

  for (const hook of asyncHooks) {
    runCommandHook(hook, payload, options).catch(() => {});
  }

  const runs: HookRun[] = [];
  for (const hook of syncHooks) {
    try {
      runs.push(await runCommandHook(hook, payload, options));
    } catch (err) {
      const msg = (err as Error).message ?? String(err);
      runs.push({
        hook,
        stdout: "",
        stderr: `palantir-mini Codex adapter hook runner failed: ${msg}`,
        exitCode: 1,
        timedOut: false,
      });
    }
  }

  return {
    response:
      bypass?.explicit && eventName === "UserPromptSubmit" && runs.length === 0
        ? pluginBypassResponse(eventName, bypass)
        : responseFor(eventName, runs, doc, options),
    matchedHooks: hooks,
    runs,
  };
}

async function readPayload(stdinText?: string): Promise<PayloadReadResult> {
  const text = stdinText ?? (await Bun.stdin.text());
  if (text.trim().length === 0) return { payload: {} };
  try {
    return { payload: asObject(JSON.parse(text)) };
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    return {
      payload: {},
      invalidJson: `Codex hook adapter failed closed because stdin is not valid JSON: ${msg}`,
    };
  }
}

function invalidPayloadResponse(eventName: string, reason: string): JsonObject | undefined {
  if (eventName === "PreToolUse") {
    return {
      systemMessage: reason,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    };
  }
  if (eventName === "PermissionRequest") {
    return {
      systemMessage: reason,
      hookSpecificOutput: {
        hookEventName: "PermissionRequest",
        decision: {
          behavior: "deny",
          message: reason,
        },
      },
    };
  }
  if (eventName === "PostToolUse" || eventName === "UserPromptSubmit" || eventName === "Stop") {
    return { decision: "block", reason };
  }
  return undefined;
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
    const { payload } = await readPayload(stdinText);
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

  const { payload, invalidJson } = await readPayload(stdinText);
  if (invalidJson) {
    const response = invalidPayloadResponse(eventName ?? "", invalidJson);
    if (response) return JSON.stringify(response);
  }
  const result = await runCodexHookAdapter(eventName ?? "", payload, options);
  return JSON.stringify(result.response);
}

if (import.meta.main) {
  process.stdout.write(await runCodexHookAdapterCli());
}
