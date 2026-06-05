import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isPalantirMiniMcpToolName, isReadOnlyBashCommand } from "../hooks/tool-classifier";
import {
  detectPalantirMiniPluginOptOut,
  type PalantirMiniPluginOptOut,
} from "../ontology-engineering-response-template";

export type CodexPalantirMiniActivationMode =
  | "active"
  | "passive-advisory"
  | "silent-bypass"
  | "unsupported";

export type CodexPalantirMiniActivationReason =
  | "explicit-plugin-opt-out"
  | "repo-local-plugin-opt-out"
  | "meta-harness-plugin-independent"
  | "simple-non-palantir-turn"
  | "explicit-palantir-mini-opt-in"
  | "prompt-front-door-continuation"
  | "palantir-mini-source-work"
  | "palantir-mini-mcp-tool"
  | "tracked-project-protected-tool"
  | "unsupported-event"
  | "runtime-smoke-only";

export interface CodexPalantirMiniActivationInput {
  readonly eventName: string;
  readonly policyEventName: string;
  readonly cwd?: string;
  readonly pluginRoot?: string;
  readonly hooksJsonPath?: string;
  readonly toolName?: string;
  readonly toolInput?: Record<string, unknown>;
  readonly prompt?: string;
  readonly sessionId?: string;
  readonly candidateProjectRoots?: readonly string[];
  readonly env?: Record<string, string | undefined>;
}

export interface CodexPalantirMiniActivationDecision {
  readonly mode: CodexPalantirMiniActivationMode;
  readonly reasonCode: CodexPalantirMiniActivationReason;
  readonly matchedMarker?: string;
  readonly optOut?: PalantirMiniPluginOptOut;
  readonly shouldRunSharedHooks: boolean;
  readonly shouldWritePromptFrontDoor: boolean;
  readonly shouldInjectAdditionalContext: boolean;
  readonly shouldEmitPalantirMiniEvent: boolean;
}

const META_HARNESS_ROOT = "/home/palantirkc/meta-harness";
const PALANTIR_MINI_MARKETPLACE_ROOT = "/home/palantirkc/palantir-mini-marketplace";
const REPO_LOCAL_PLUGIN_OPT_OUT_MARKERS = [
  "do not use the palantir-mini plugin",
  "unless the user explicitly asks for palantir-mini",
  "meta harness has no external control-plane plugin dependency",
] as const;

const EXPLICIT_OPT_IN_MARKERS = [
  "$palantir-mini",
  "use palantir-mini",
  "invoke palantir-mini",
  "run palantir-mini",
  "palantir-mini로",
  "palantir-mini 사용해",
  "palantir-mini 실행",
  "pm_semantic_intent_gate",
  "pm_intent_router",
  "mcp__palantir_mini__",
] as const;

function active(reasonCode: CodexPalantirMiniActivationReason): CodexPalantirMiniActivationDecision {
  return {
    mode: "active",
    reasonCode,
    shouldRunSharedHooks: true,
    shouldWritePromptFrontDoor: true,
    shouldInjectAdditionalContext: true,
    shouldEmitPalantirMiniEvent: true,
  };
}

function silent(
  reasonCode: CodexPalantirMiniActivationReason,
  optOut?: PalantirMiniPluginOptOut,
): CodexPalantirMiniActivationDecision {
  return {
    mode: "silent-bypass",
    reasonCode,
    ...(optOut ? { matchedMarker: optOut.matchedMarker, optOut } : {}),
    shouldRunSharedHooks: false,
    shouldWritePromptFrontDoor: false,
    shouldInjectAdditionalContext: false,
    shouldEmitPalantirMiniEvent: false,
  };
}

function normalizeMaybePath(value: string | undefined): string | undefined {
  if (!value || value.trim().length === 0) return undefined;
  return path.resolve(value);
}

function isWithin(candidate: string | undefined, root: string): boolean {
  if (!candidate) return false;
  const rel = path.relative(path.resolve(root), path.resolve(candidate));
  return rel === "" || (!!rel && !rel.startsWith("..") && !path.isAbsolute(rel));
}

function findAncestorWith(start: string | undefined, dirname: string): string | undefined {
  const initial = normalizeMaybePath(start);
  if (!initial) return undefined;
  let cur = initial;
  const root = path.parse(cur).root;
  while (cur !== root) {
    if (existsSync(path.join(cur, dirname))) return cur;
    cur = path.dirname(cur);
  }
  return undefined;
}

function safeSegment(value: string): string {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown";
}

function uniqueAbsPaths(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeMaybePath(value);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function findAncestorFile(start: string | undefined, filename: string): string | undefined {
  const initial = normalizeMaybePath(start);
  if (!initial) return undefined;
  let cur = initial;
  const root = path.parse(cur).root;
  while (cur !== root) {
    const candidate = path.join(cur, filename);
    if (existsSync(candidate)) return candidate;
    cur = path.dirname(cur);
  }
  return undefined;
}

function hasRepoLocalPluginOptOut(cwd: string | undefined): boolean {
  const agentsPath = findAncestorFile(cwd, "AGENTS.md");
  if (!agentsPath) return false;
  try {
    const content = readFileSync(agentsPath, "utf8").toLowerCase();
    return (
      content.includes(REPO_LOCAL_PLUGIN_OPT_OUT_MARKERS[0]) &&
      (content.includes(REPO_LOCAL_PLUGIN_OPT_OUT_MARKERS[1]) ||
        content.includes(REPO_LOCAL_PLUGIN_OPT_OUT_MARKERS[2]))
    );
  } catch {
    return false;
  }
}

function isRealPalantirMiniPluginRoot(pluginRoot: string | undefined): boolean {
  const root = normalizeMaybePath(pluginRoot);
  if (!root) return false;
  return (
    existsSync(path.join(root, ".codex-plugin", "plugin.json")) &&
    existsSync(path.join(root, "hooks", "codex-hooks.json"))
  );
}

function isPalantirMiniSourceWork(cwd: string | undefined, pluginRoot: string | undefined): boolean {
  const normalizedCwd = normalizeMaybePath(cwd);
  const normalizedPluginRoot = normalizeMaybePath(pluginRoot);
  if (normalizedCwd && normalizedPluginRoot && isWithin(normalizedCwd, normalizedPluginRoot)) {
    return true;
  }
  return (
    isWithin(normalizedCwd, "/home/palantirkc/palantir-mini-marketplace/plugins/palantir-mini") ||
    isWithin(normalizedCwd, PALANTIR_MINI_MARKETPLACE_ROOT)
  );
}

function hasExplicitOptIn(prompt: string | undefined): boolean {
  if (!prompt) return false;
  const lower = prompt.toLowerCase();
  return EXPLICIT_OPT_IN_MARKERS.some((marker) => lower.includes(marker.toLowerCase()));
}

function readJsonObject(filePath: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function promptFrontDoorProjectRoots(input: CodexPalantirMiniActivationInput): string[] {
  return uniqueAbsPaths([
    ...(input.candidateProjectRoots ?? []),
    input.env?.PALANTIR_MINI_PROJECT,
    process.env.PALANTIR_MINI_PROJECT,
    findAncestorWith(input.cwd, ".palantir-mini"),
    input.cwd,
    PALANTIR_MINI_MARKETPLACE_ROOT,
  ]);
}

function hasPromptFrontDoorContinuation(input: CodexPalantirMiniActivationInput): boolean {
  if (input.eventName !== "UserPromptSubmit") return false;
  if (!input.sessionId || !input.prompt || input.prompt.trim().length === 0) return false;

  for (const projectRoot of promptFrontDoorProjectRoots(input)) {
    const pointerPath = path.join(
      projectRoot,
      ".palantir-mini",
      "session",
      "prompt-front-door",
      "current",
      `codex-${safeSegment(input.sessionId)}.json`,
    );
    const pointer = readJsonObject(pointerPath);
    const pointerPromptId = typeof pointer?.promptId === "string" ? pointer.promptId : undefined;
    const pointerSessionId = typeof pointer?.sessionId === "string" ? pointer.sessionId : undefined;
    if (!pointerPromptId || !pointerSessionId) continue;

    const envelopePath = path.join(
      projectRoot,
      ".palantir-mini",
      "session",
      "prompt-front-door",
      "sessions",
      safeSegment(pointerSessionId),
      `${safeSegment(pointerPromptId)}.json`,
    );
    const envelope = readJsonObject(envelopePath);
    const optOut = envelope?.palantirMiniPluginOptOut;
    if (optOut && typeof optOut === "object" && (optOut as { explicit?: unknown }).explicit === true) {
      continue;
    }
    const promptExcerpt = typeof envelope?.promptExcerpt === "string" ? envelope.promptExcerpt : undefined;
    const envelopeProjectRoot =
      typeof envelope?.projectRoot === "string" ? envelope.projectRoot : projectRoot;
    if (hasExplicitOptIn(promptExcerpt) || isPalantirMiniSourceWork(envelopeProjectRoot, input.pluginRoot)) {
      return true;
    }
  }

  return false;
}

function commandText(input: Record<string, unknown> | undefined): string {
  if (!input) return "";
  for (const key of ["command", "cmd"]) {
    const value = input[key];
    if (typeof value === "string") return value;
  }
  return "";
}

function isProtectedNativeTool(toolName: string | undefined, toolInput: Record<string, unknown> | undefined): boolean {
  const normalized = (toolName ?? "").trim().toLowerCase();
  if (!normalized) return false;
  if (
    normalized === "apply_patch" ||
    normalized === "functions.apply_patch" ||
    normalized === "edit" ||
    normalized === "write" ||
    normalized === "multiedit" ||
    normalized === "notebookedit"
  ) {
    return true;
  }
  if (normalized === "bash" || normalized === "functions.exec_command") {
    const command = commandText(toolInput);
    return command.length > 0 && !isReadOnlyBashCommand(command);
  }
  return false;
}

export function decideCodexPalantirMiniActivation(
  input: CodexPalantirMiniActivationInput,
): CodexPalantirMiniActivationDecision {
  const optOut =
    typeof input.prompt === "string"
      ? detectPalantirMiniPluginOptOut(input.prompt)
      : undefined;
  if (optOut) return silent("explicit-plugin-opt-out", optOut);

  if (input.toolName && isPalantirMiniMcpToolName(input.toolName)) {
    return active("palantir-mini-mcp-tool");
  }

  if (hasExplicitOptIn(input.prompt)) {
    return active("explicit-palantir-mini-opt-in");
  }

  const realPluginRoot = isRealPalantirMiniPluginRoot(input.pluginRoot);
  if (!realPluginRoot) {
    return active("runtime-smoke-only");
  }

  if (isWithin(input.cwd, META_HARNESS_ROOT)) {
    return silent("meta-harness-plugin-independent");
  }

  if (hasRepoLocalPluginOptOut(input.cwd)) {
    return silent("repo-local-plugin-opt-out");
  }

  if (isPalantirMiniSourceWork(input.cwd, input.pluginRoot)) {
    return active("palantir-mini-source-work");
  }

  if (hasPromptFrontDoorContinuation(input)) {
    return active("prompt-front-door-continuation");
  }

  const trackedProjectRoot = findAncestorWith(input.cwd, ".palantir-mini");
  if (
    trackedProjectRoot &&
    isProtectedNativeTool(input.toolName, input.toolInput)
  ) {
    return active("tracked-project-protected-tool");
  }

  return silent("simple-non-palantir-turn");
}
