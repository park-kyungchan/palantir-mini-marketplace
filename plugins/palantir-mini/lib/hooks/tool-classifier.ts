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

  // --- DENYLIST-WINS: any match below => writes => NOT read-only ---
  // Decide on the RESOLVED write structure (redirect/verb/tee), never on the
  // first-token vocabulary. The denylist is the authoritative "does-this-write"
  // signal; everything else default-allows (read-only).

  // Output redirection to a file/fd target: >, >>, 2>, &>, >| (clobber).
  // `(^|[^<])` excludes the `<` of a `<(...)`/`<<` read; `(\||[^>])` still catches
  // a `>| file` clobber and a single trailing `>file`.
  if (/(^|[^<])>{1,2}(\||[^>])/.test(trimmed)) return false;
  // Bare trailing redirect with no following char on the line (e.g. `cmd >`).
  if (/(^|[^<])>{1,2}\s*$/.test(trimmed)) return false;

  // tee anywhere (pipeline write tail): `... | tee f`, `tee -a f`, `tee$VAR`.
  if (/\btee\b/.test(trimmed)) return false;

  // In-place edit flags on stream editors.
  if (/\b(sed|perl)\b[^\n]*\s-[A-Za-z]*i\b/.test(trimmed)) return false;
  if (/\b(sed|perl)\s+-i\b/.test(trimmed)) return false;

  // Filesystem-mutating verbs anywhere in the command (covers piped/`;`/`&&` tails).
  if (/\b(rm|mv|cp|mkdir|rmdir|touch|chmod|chown|ln|install|dd|truncate|mkfifo|mknod|shred)\b/.test(trimmed)) {
    return false;
  }

  // Package managers — install/add/remove/update write to disk/lockfiles.
  // Includes the short forms `i` (npm install), `un` (npm uninstall), `rm` (pnpm remove).
  if (/\b(bun|npm|pnpm|yarn)\s+(install|add|remove|uninstall|update|upgrade|ci|link|i|un|rm)\b/.test(trimmed)) {
    return false;
  }
  if (/\b(pip|pip3|pipx)\s+(install|uninstall)\b/.test(trimmed)) return false;

  // git WRITE subcommands (read subcommands status/diff/show/log/... fall through to allow).
  if (/\bgit\s+(add|commit|push|stash|merge|rebase|checkout|switch|reset|clean|pull|restore|tag|am|apply|cherry-pick|revert|mv|rm|fetch|init|clone|worktree|config|update-ref)\b/.test(trimmed)) {
    return false;
  }

  // gh / deploy write surfaces.
  if (/\bgh\s+pr\s+(create|merge|close|reopen|edit|ready|review)\b/.test(trimmed)) return false;
  // gh api with a mutating HTTP method, and gh release/repo write subcommands.
  if (/\bgh\s+api\b[^\n]*\s-X\s*(POST|PUT|PATCH|DELETE)\b/i.test(trimmed)) return false;
  if (/\bgh\s+release\s+(create|delete|upload)\b/.test(trimmed)) return false;
  if (/\bgh\s+repo\s+(create|delete|clone)\b/.test(trimmed)) return false;
  if (/\b(vercel|wrangler)\s+(deploy|env|project|link|publish)\b/.test(trimmed)) return false;

  // sponge (moreutils): consumes stdin then writes it back to a file.
  if (/\bsponge\b/.test(trimmed)) return false;

  // Network downloaders that write to disk.
  // curl only when an output flag (-o/-O, long forms) is present; bare curl reads.
  if (/\bcurl\b[^\n]*\s(-o|-O|--output|--remote-name)\b/.test(trimmed)) return false;
  if (/\bwget\b/.test(trimmed)) return false;

  // Archive extraction / creation verbs.
  if (/\btar\b[^\n]*\bx/.test(trimmed)) return false; // tar x... (extract)
  if (/\bunzip\b/.test(trimmed)) return false;

  // Cluster / container mutation surfaces.
  if (/\bkubectl\s+(apply|create|delete|patch|replace|edit)\b/.test(trimmed)) return false;
  if (/\bdocker\s+(run|rm|rmi|build|push|create)\b/.test(trimmed)) return false;

  // --- DEFAULT-ALLOW: nothing above matched => treat as read-only. ---
  // NOTE: deliberately NO blanket `python -c` / `node -e` denylist — those
  // run read-only one-liners far more often than writes, and a blanket block
  // re-introduces the over-block pathology (bd-003). Resolved redirects/verbs
  // inside such one-liners are already caught by the structural checks above.
  return true;
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
