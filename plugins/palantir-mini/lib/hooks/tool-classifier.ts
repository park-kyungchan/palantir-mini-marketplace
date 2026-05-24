import {
  getMcpToolCapability,
  type McpToolCapability,
} from "../capability-registry/mcp-tool-capability";

export type PalantirMiniToolOperation =
  | "apply_edit_function"
  | "commit_edits"
  | "compute_edits_dry_run"
  | "emit_event"
  | "grade_outcome_with_rubric"
  | "impact_query"
  | "negotiate_sprint_contract"
  | "ontology_context_query"
  | "ontology_schema_get"
  | "pm_health_audit"
  | "pm_intent_router"
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

const READ_ONLY_TOOLS = new Set([
  "read",
  "grep",
  "glob",
  "ls",
  "notebookread",
]);

const READ_ONLY_OPERATIONS = new Set<PalantirMiniToolOperation>([
  "compute_edits_dry_run",
  "grade_outcome_with_rubric",
  "impact_query",
  "ontology_schema_get",
  "pm_health_audit",
  "pm_rule",
  "pm_semantic_intent_gate",
  "pm_substrate_query",
  "pre_edit_impact",
]);

const PROTECTED_MUTATION_TOOLS = new Set([
  "edit",
  "write",
  "multiedit",
  "notebookedit",
  "agent",
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
  return [...new Set(PALANTIR_MINI_MCP_ALIAS_PREFIXES.map((prefix) => `${prefix}${canonicalName}`))];
}

export function managedSettingsPalantirMiniMcpPattern(toolName: string): string {
  return `${PALANTIR_MINI_MANAGED_SETTINGS_MCP_PREFIX}${normalizePalantirMiniMcpToolName(toolName)}`;
}

function operationFromToolName(normalizedName: string): PalantirMiniToolOperation {
  if (normalizedName.includes("apply_edit_function")) return "apply_edit_function";
  if (normalizedName.includes("commit_edits")) return "commit_edits";
  if (normalizedName.includes("compute_edits_dry_run")) return "compute_edits_dry_run";
  if (normalizedName.includes("emit_event")) return "emit_event";
  if (normalizedName.includes("grade_outcome_with_rubric")) return "grade_outcome_with_rubric";
  if (normalizedName.includes("impact_query")) return "impact_query";
  if (normalizedName.includes("negotiate_sprint_contract")) return "negotiate_sprint_contract";
  if (normalizedName.includes("ontology_context_query")) return "ontology_context_query";
  if (normalizedName.includes("ontology_schema_get")) return "ontology_schema_get";
  if (normalizedName.includes("pm_health_audit")) return "pm_health_audit";
  if (normalizedName.includes("pm_intent_router")) return "pm_intent_router";
  if (normalizedName.includes("pm_rule")) return "pm_rule";
  if (normalizedName.includes("pm_semantic_intent_gate")) return "pm_semantic_intent_gate";
  if (normalizedName.includes("pm_substrate_query")) return "pm_substrate_query";
  if (normalizedName.includes("pre_edit_impact")) return "pre_edit_impact";
  return "unknown";
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

export function classifyHookTool(payload: HookToolPayloadLike): HookToolClassification {
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
    READ_ONLY_TOOLS.has(normalizedName) ||
    READ_ONLY_OPERATIONS.has(operation) ||
    bashReadOnly;

  const ontologyContextMutation =
    operation === "ontology_context_query" && isOntologyContextQueryMutation(payload.tool_input);
  const negotiateMutation =
    operation === "negotiate_sprint_contract" &&
    isNegotiateSprintContractApproveOrCounter(payload.tool_input);
  const bashMutation = isBash && !bashReadOnly;
  const publishOrRenderMutation =
    normalizedName.includes("publish") ||
    normalizedName.includes("render") ||
    normalizedName.includes("deploy");
  const isProtectedMutation =
    !isReadOnly &&
    (PROTECTED_MUTATION_TOOLS.has(normalizedName) ||
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
