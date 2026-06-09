import {
  getMcpToolCapability,
  type McpToolCapability,
} from "../capability-registry/mcp-tool-capability";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveToolProfile, type ToolCapabilityProfile } from "../runtime/tool-profile";

export type PalantirMiniToolOperation =
  | "apply_edit_function"
  | "commit_edits"
  | "emit_event"
  | "get_ontology"
  | "impact_query"
  | "ontology_context_query"
  | "ontology_schema_get"
  | "pm_health_audit"
  | "pm_intent_router"
  | "pm_pre_mutation_governance"
  | "pm_rule"
  | "pm_semantic_intent_gate"
  | "pm_substrate_query"
  | "pre_edit_impact"
  | "unknown";

export interface HookToolClassification {
  readonly originalName: string;
  readonly normalizedName: string;
  readonly operation: PalantirMiniToolOperation;
  readonly classificationSource: "mcp-tool-capability" | "legacy-fallback";
  readonly mcpToolCapability?: McpToolCapability;
  readonly isPalantirMiniMcpTool: boolean;
  readonly isReadOnly: boolean;
  readonly isProtectedMutation: boolean;
  readonly isDtcMutatingMcpTool: boolean;
  readonly isOntologyAffectingForSelectiveBlocking: boolean;
}

export interface HookToolPayloadLike {
  readonly tool_name?: string;
  readonly tool_input?: Record<string, unknown> | undefined;
}

const READ_ONLY_OPERATIONS = new Set<PalantirMiniToolOperation>([
  "get_ontology",
  "impact_query",
  "ontology_schema_get",
  "pm_health_audit",
  "pm_rule",
  "pm_pre_mutation_governance",
  "pm_semantic_intent_gate",
  "pm_substrate_query",
  "pre_edit_impact",
]);

const PROTECTED_MUTATION_OPERATIONS = new Set<PalantirMiniToolOperation>([
  "apply_edit_function",
  "commit_edits",
]);

const PALANTIR_MINI_MCP_PREFIXES = [
  "mcp__plugin_palantir-mini_palantir-mini__",
  "mcp__palantir_mini__.",
  "mcp__palantir_mini__",
  "mcp__palantir-mini__",
  "mcp_palantir-mini_",
  "mcp_palantir_mini_",
] as const;

const PALANTIR_MINI_MCP_ALIAS_PREFIXES = [
  "mcp__plugin_palantir-mini_palantir-mini__",
  "mcp__palantir_mini__",
  "mcp__palantir_mini__.",
  "mcp__palantir-mini__",
  "mcp_palantir-mini_",
  "mcp_palantir_mini_",
] as const;

export const PALANTIR_MINI_MANAGED_SETTINGS_MCP_PREFIX = "mcp__palantir-mini__";

export const MCP_FIRST_EVIDENCE_OPERATIONS = new Set<PalantirMiniToolOperation>([
  "get_ontology",
  "impact_query",
  "pre_edit_impact",
]);

const PALANTIR_MINI_OPERATION_BY_CANONICAL_TOOL_NAME = new Map<
  string,
  PalantirMiniToolOperation
>([
  ["apply_edit_function", "apply_edit_function"],
  ["commit_edits", "commit_edits"],
  ["emit_event", "emit_event"],
  ["get_ontology", "get_ontology"],
  ["impact_query", "impact_query"],
  ["ontology_context_query", "ontology_context_query"],
  ["ontology_schema_get", "ontology_schema_get"],
  ["pm_health_audit", "pm_health_audit"],
  ["pm_intent_router", "pm_intent_router"],
  ["pm_pre_mutation_governance", "pm_pre_mutation_governance"],
  ["pm_rule", "pm_rule"],
  ["pm_rule_audit", "pm_rule"],
  ["pm_rule_query", "pm_rule"],
  ["pm_semantic_intent_gate", "pm_semantic_intent_gate"],
  ["pm_substrate_query", "pm_substrate_query"],
  ["pre_edit_impact", "pre_edit_impact"],
]);

function normalizeToolName(toolName: string): string {
  return toolName.trim().toLowerCase();
}

function extractPalantirMiniPrefixedToolName(toolName: string): string | undefined {
  const normalizedName = normalizeToolName(toolName);
  for (const prefix of PALANTIR_MINI_MCP_PREFIXES) {
    if (normalizedName.startsWith(prefix)) {
      return normalizedName.slice(prefix.length);
    }
  }
  return undefined;
}

export function isPalantirMiniMcpToolName(toolName: string): boolean {
  return extractPalantirMiniPrefixedToolName(toolName) !== undefined;
}

export function normalizePalantirMiniMcpToolName(toolName: string): string {
  return extractPalantirMiniPrefixedToolName(toolName) ?? normalizeToolName(toolName);
}

export function palantirMiniMcpToolAliasesFor(toolName: string): string[] {
  if (!isPalantirMiniMcpToolName(toolName)) return [];
  const canonicalName = normalizePalantirMiniMcpToolName(toolName);
  return palantirMiniMcpToolAliasesForOperation(canonicalName);
}

export function palantirMiniMcpToolAliasesForOperation(operationName: string): string[] {
  const canonicalName = normalizeToolName(operationName);
  return [...new Set(PALANTIR_MINI_MCP_ALIAS_PREFIXES.map((prefix) => `${prefix}${canonicalName}`))];
}

export function managedSettingsPalantirMiniMcpPattern(toolName: string): string {
  return `${PALANTIR_MINI_MANAGED_SETTINGS_MCP_PREFIX}${normalizePalantirMiniMcpToolName(toolName)}`;
}

export function operationFromToolName(normalizedName: string): PalantirMiniToolOperation {
  const canonicalName = normalizePalantirMiniMcpToolName(normalizedName);
  return PALANTIR_MINI_OPERATION_BY_CANONICAL_TOOL_NAME.get(canonicalName) ?? "unknown";
}

export function isMcpFirstEvidenceToolName(toolName: string): boolean {
  const canonicalName = normalizePalantirMiniMcpToolName(toolName);
  return MCP_FIRST_EVIDENCE_OPERATIONS.has(operationFromToolName(canonicalName));
}

export function isAssignedReviewArtifactPath(filePath: string): boolean {
  const normalized = path.resolve(filePath).replace(/\\/g, "/").replace(/\/+/g, "/");
  if (normalized.includes("\0")) return false;
  if (normalized.includes("/.codex/plugins/cache/")) return false;
  const parts = normalized.split("/").filter((part) => part.length > 0);
  if (parts.includes("..")) return false;
  const workspaceIndex = parts.findIndex((part) => part === "_workspace");
  if (workspaceIndex < 0) return false;

  const reviewArtifactOutputSegments = new Set([
    "agent-outputs",
    "outputs",
    "worker-outputs",
  ]);
  for (let index = workspaceIndex + 2; index < parts.length - 1; index += 1) {
    const segment = parts[index];
    if (segment === undefined || !reviewArtifactOutputSegments.has(segment)) continue;
    if (index !== parts.length - 2) return false;
    const filename = parts[index + 1] ?? "";
    if (!filename.toLowerCase().endsWith(".md") || filename.length <= ".md".length) return false;
    return isDeclaredReviewArtifactOutput(normalized, parts, workspaceIndex, index);
  }
  return false;
}

function isDeclaredReviewArtifactOutput(
  normalizedAbsPath: string,
  parts: string[],
  workspaceIndex: number,
  outputLaneIndex: number,
): boolean {
  const runRoot = `/${parts.slice(0, outputLaneIndex).join("/")}`;
  const workspaceRelative = parts.slice(workspaceIndex).join("/");
  const runRelative = parts.slice(outputLaneIndex).join("/");
  const candidates = [normalizedAbsPath, workspaceRelative, runRelative];
  const promptDir = path.join(runRoot, "spawn-prompts");
  let promptEntries: string[];
  try {
    promptEntries = fs.readdirSync(promptDir);
  } catch {
    return false;
  }
  for (const entry of promptEntries) {
    if (!entry.endsWith(".md")) continue;
    const promptPath = path.join(promptDir, entry);
    let content: string;
    try {
      content = fs.readFileSync(promptPath, "utf8").replace(/\\/g, "/").replace(/\/+/g, "/");
    } catch {
      continue;
    }
    if (candidates.some((candidate) => content.includes(candidate))) return true;
  }
  return false;
}

function extractMcpToolName(normalizedName: string): string | undefined {
  const prefixedName = extractPalantirMiniPrefixedToolName(normalizedName);
  if (prefixedName !== undefined) return prefixedName;
  if (getMcpToolCapability(normalizedName) !== undefined) {
    return normalizedName;
  }
  return undefined;
}

export function isReadOnlyBashCommand(command: string): boolean {
  const trimmed = command.trim();
  if (trimmed.length === 0) return true;
  if (/[;&]\s*(rm|mv|cp|mkdir|touch|chmod|chown)\b/.test(trimmed)) return false;
  if (/(^|[^<])>{1,2}[^>]/.test(trimmed)) return false;
  if (/\btee\s+/.test(trimmed)) return false;
  if (/\bgit\s+(add|commit|push|stash|merge|rebase|checkout|switch|reset|clean|pull)\b/.test(trimmed)) {
    return false;
  }
  if (/\b(rm|mv|cp|mkdir|touch|chmod|chown)\b/.test(trimmed)) return false;
  if (/\b(bun|npm|pnpm|yarn)\s+install\b/.test(trimmed)) return false;
  if (/\bgh\s+pr\s+(create|merge|close|reopen|edit|ready|review)\b/.test(trimmed)) return false;
  if (/\b(vercel|wrangler)\s+(deploy|env|project|link)\b/.test(trimmed)) return false;

  return /^(pwd|ls\b|find\b|rg\b|grep\b|sed\b|cat\b|head\b|tail\b|nl\b|wc\b|git\s+(status|diff|show|log|rev-parse|branch|remote)\b|bun\s+test\b|bunx\s+tsc\b|gh\s+(pr\s+(view|list)|run\s+view|api\b))/.test(trimmed);
}

export function isOntologyContextQueryMutation(input: Record<string, unknown> | undefined): boolean {
  const action = typeof input?.action === "string" ? input.action : undefined;
  if (!action) return false;
  return /^(write|update|create|delete|mutate|edit|apply)/i.test(action);
}

export function isNegotiateSprintContractApproveOrCounter(input: Record<string, unknown> | undefined): boolean {
  const action = typeof input?.action === "string" ? input.action.toLowerCase() : undefined;
  return action === "approve" || action === "counter";
}

export function classifyHookTool(
  payload: HookToolPayloadLike,
  profile: ToolCapabilityProfile = resolveToolProfile(),
): HookToolClassification {
  const originalName = payload.tool_name ?? "unknown";
  const normalizedName = normalizeToolName(originalName);
  const canonicalPalantirMiniName = normalizePalantirMiniMcpToolName(normalizedName);
  const operation = operationFromToolName(canonicalPalantirMiniName);
  const mcpToolCapability = getMcpToolCapability(
    extractMcpToolName(normalizedName),
  );
  const classificationSource: HookToolClassification["classificationSource"] =
    mcpToolCapability === undefined
      ? "legacy-fallback"
      : "mcp-tool-capability";
  const isPalantirMiniMcpTool = isPalantirMiniMcpToolName(normalizedName);

  const isBash = normalizedName === "bash";
  const bashReadOnly = isBash
    ? isReadOnlyBashCommand(String(payload.tool_input?.command ?? ""))
    : false;
  const isReadOnly =
    profile.readOnlyTools.has(normalizedName) ||
    READ_ONLY_OPERATIONS.has(operation) ||
    bashReadOnly;

  const ontologyContextMutation =
    operation === "ontology_context_query" && isOntologyContextQueryMutation(payload.tool_input);
  const negotiateMutation = false;
  const bashMutation = isBash && !bashReadOnly;
  const publishOrRenderMutation =
    normalizedName.includes("publish") ||
    normalizedName.includes("render") ||
    normalizedName.includes("deploy");
  const isProtectedMutation =
    !isReadOnly &&
    (profile.protectedMutationTools.has(normalizedName) ||
      PROTECTED_MUTATION_OPERATIONS.has(operation) ||
      ontologyContextMutation ||
      negotiateMutation ||
      bashMutation ||
      publishOrRenderMutation);

  const isDtcMutatingMcpTool =
    operation === "apply_edit_function" ||
    operation === "commit_edits" ||
    ontologyContextMutation;

  const isOntologyAffectingForSelectiveBlocking =
    operation === "apply_edit_function" ||
    operation === "commit_edits" ||
    ontologyContextMutation ||
    negotiateMutation;

  const classification = {
    originalName,
    normalizedName,
    operation,
    classificationSource,
    isPalantirMiniMcpTool,
    isReadOnly,
    isProtectedMutation,
    isDtcMutatingMcpTool,
    isOntologyAffectingForSelectiveBlocking,
  };

  return mcpToolCapability === undefined
    ? classification
    : { ...classification, mcpToolCapability };
}
