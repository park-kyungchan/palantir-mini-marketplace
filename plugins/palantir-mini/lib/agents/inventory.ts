// palantir-mini PR-G / Phase 8 — canonical plugin agent inventory parser.
// Source authority: plugins/palantir-mini/agents/*.md

import * as fs from "fs";
import * as path from "path";

export const DEFAULT_PLUGIN_ROOT = path.resolve(import.meta.dir, "..", "..");
export const AGENTS_DIRNAME = "agents";

export const OUTPUT_PAYLOAD_REQUIRED_FIELDS = [
  "mutationSummary",
  "filesTouched",
  "verification",
  "eventRefs",
  "handoffStatus",
] as const;

export const OUTPUT_CONTRACT_MINIMUM_FIELDS = [
  "statePath",
  "markdownReportPath",
  "requiredFields",
  "envelopeKind",
  "mutationSummary",
  "filesTouched",
  "verification",
  "eventRefs",
  "handoffStatus",
] as const;

export type OutputPayloadRequiredField = typeof OUTPUT_PAYLOAD_REQUIRED_FIELDS[number];
export type OutputContractMinimumField = typeof OUTPUT_CONTRACT_MINIMUM_FIELDS[number];

export type OutputContractStatusKind =
  | "complete"
  | "missing"
  | "incomplete"
  | "exempt"
  | "not-required";

export interface OutputContractExemption {
  reason: string;
  raw: unknown;
}

export interface AgentDeprecationMetadata {
  deprecated: boolean;
  deprecationWindowEndsSprint?: number;
}

export interface AgentFrontmatter {
  raw: Record<string, unknown>;
  name: string;
  id: string;
  description?: string;
  tools: string[];
  disallowedTools: string[];
  deprecation: AgentDeprecationMetadata;
  outputContractExempt?: OutputContractExemption;
}

export interface MutationCapabilityClassification {
  capable: boolean;
  reasons: string[];
  mutationTools: string[];
  mutationInstructionEvidence: string[];
}

export interface ParsedOutputContract {
  statePath: string;
  markdownReportPath?: string;
  requiredFields: string[];
  envelopeKind?: string;
  mutationSummary?: string;
  filesTouched?: string;
  verification?: string;
  eventRefs?: string;
  handoffStatus?: string;
  rawFields: Partial<Record<OutputContractMinimumField, string>> & Record<string, string>;
  missingMinimumFields: OutputContractMinimumField[];
  missingRequiredFields: OutputPayloadRequiredField[];
  complete: boolean;
  sectionHeading: string;
}

export interface AgentInventoryEntry {
  id: string;
  name: string;
  filePath: string;
  frontmatter: AgentFrontmatter;
  tools: string[];
  disallowedTools: string[];
  mutationCapability: MutationCapabilityClassification;
  outputContract: ParsedOutputContract | null;
  outputContractStatus: {
    kind: OutputContractStatusKind;
    missingMinimumFields: OutputContractMinimumField[];
    missingRequiredFields: OutputPayloadRequiredField[];
    exemptionReason?: string;
  };
  deprecation: AgentDeprecationMetadata;
}

const LOCAL_MUTATION_TOOLS = new Set([
  "write",
  "edit",
  "multiedit",
  "notebookedit",
]);

const ORCHESTRATION_MUTATION_TOOLS = new Set([
  "agent",
  "taskcreate",
  "taskupdate",
  "sendmessage",
]);

const MUTATION_MCP_PATTERNS = [
  /apply_edit_function/i,
  /commit_edits/i,
  /create_task/i,
  /update_task/i,
  /auto_spawn_replacement/i,
];

const MUTATION_INSTRUCTION_PATTERNS = [
  /\bwrite(?:s|\b)/i,
  /\bedit(?:s|ing|\b)/i,
  /\bmodify(?:ing|\b)/i,
  /\bmutat(?:e|es|ing|ion)\b/i,
  /\bpersist(?:s|ing|\b)/i,
  /\bcommit_edits\b/i,
  /\bapply_edit_function\b/i,
];

const READONLY_NEGATION_PATTERNS = [
  /\bnever\s+(?:edit|write|modify|mutate|create)\b/i,
  /\bread[- ]only\b/i,
  /\bzero modifications\b/i,
  /\bdoes not synthesize, summarize, or extract findings\b/i,
];

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalarOrList(value: string): unknown {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((part) => stripQuotes(part.trim()))
      .filter((part) => part.length > 0);
  }
  return stripQuotes(trimmed);
}

function parseBlockScalar(lines: string[], start: number): { value: unknown; next: number } {
  const items: string[] = [];
  const objectValue: Record<string, string> = {};
  let sawList = false;
  let sawObject = false;
  let i = start;
  for (; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (/^[A-Za-z0-9_-]+\s*:/.test(line)) break;
    const listMatch = line.match(/^\s*-\s*(.+)$/);
    if (listMatch) {
      sawList = true;
      items.push(stripQuotes(listMatch[1] ?? ""));
      continue;
    }
    const objectMatch = line.match(/^\s+([A-Za-z0-9_-]+)\s*:\s*(.+)$/);
    if (objectMatch) {
      sawObject = true;
      objectValue[objectMatch[1]!] = stripQuotes(objectMatch[2] ?? "");
    }
  }
  if (sawList) return { value: items, next: i };
  if (sawObject) return { value: objectValue, next: i };
  return { value: "", next: i };
}

export function splitFrontmatter(mdContent: string): { frontmatter: string; body: string } {
  const match = mdContent.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { frontmatter: "", body: mdContent };
  return {
    frontmatter: match[1] ?? "",
    body: mdContent.slice(match[0].length),
  };
}

export function parseFrontmatterBlock(frontmatter: string, fallbackId = "unknown-agent"): AgentFrontmatter {
  const raw: Record<string, unknown> = {};
  const lines = frontmatter.split("\n");
  for (let i = 0; i < lines.length;) {
    const line = lines[i] ?? "";
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) {
      i += 1;
      continue;
    }
    const key = match[1]!;
    const value = match[2] ?? "";
    if (value.trim().length === 0 || value.trim() === ">" || value.trim() === "|") {
      const parsed = parseBlockScalar(lines, i + 1);
      raw[key] = parsed.value;
      i = parsed.next;
      continue;
    }
    raw[key] = parseScalarOrList(value);
    i += 1;
  }

  const name = typeof raw.name === "string" && raw.name.length > 0 ? raw.name : fallbackId;
  const tools = normalizeList(raw.tools);
  const disallowedTools = normalizeList(raw.disallowedTools);
  const deprecated = raw.deprecated === true || raw.deprecated === "true";
  const deprecationWindowEndsSprint = typeof raw.deprecationWindowEndsSprint === "number"
    ? raw.deprecationWindowEndsSprint
    : typeof raw.deprecationWindowEndsSprint === "string" && /^\d+$/.test(raw.deprecationWindowEndsSprint)
      ? Number(raw.deprecationWindowEndsSprint)
      : undefined;

  const exemption = parseOutputContractExemption(raw.outputContractExempt);

  return {
    raw,
    name,
    id: name,
    description: typeof raw.description === "string" ? raw.description : undefined,
    tools,
    disallowedTools,
    deprecation: { deprecated, deprecationWindowEndsSprint },
    ...(exemption ? { outputContractExempt: exemption } : {}),
  };
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => stripQuotes(String(item))).filter((item) => item.length > 0);
  }
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (trimmed.length === 0) return [];
  return trimmed
    .split(",")
    .map((part) => stripQuotes(part.trim()))
    .filter((part) => part.length > 0);
}

function parseOutputContractExemption(value: unknown): OutputContractExemption | undefined {
  if (value === undefined || value === null || value === false || value === "false") return undefined;
  if (value === true || value === "true") return { reason: "frontmatter outputContractExempt=true", raw: value };
  if (typeof value === "string") return { reason: value, raw: value };
  if (typeof value === "object") {
    const objectValue = value as Record<string, unknown>;
    const reason = typeof objectValue.reason === "string" && objectValue.reason.length > 0
      ? objectValue.reason
      : "frontmatter outputContractExempt object present";
    return { reason, raw: value };
  }
  return undefined;
}

function normalizeToolName(tool: string): string {
  const bare = stripQuotes(tool).trim();
  const withoutArgs = bare.replace(/\(.+\)$/g, "");
  return withoutArgs.toLowerCase();
}

export function classifyMutationCapability(frontmatter: AgentFrontmatter, mdContent: string): MutationCapabilityClassification {
  const disallowed = new Set(frontmatter.disallowedTools.map(normalizeToolName));
  const mutationTools: string[] = [];
  const reasons: string[] = [];

  for (const tool of frontmatter.tools) {
    const normalized = normalizeToolName(tool);
    const isMutationTool = LOCAL_MUTATION_TOOLS.has(normalized) ||
      ORCHESTRATION_MUTATION_TOOLS.has(normalized) ||
      MUTATION_MCP_PATTERNS.some((pattern) => pattern.test(tool));
    if (!isMutationTool) continue;
    if (disallowed.has(normalized)) continue;
    mutationTools.push(tool);
  }

  if (mutationTools.length > 0) {
    reasons.push(`declared mutation-capable tools: ${mutationTools.join(", ")}`);
  }

  const lowerContent = mdContent.toLowerCase();
  const readonlyNegated = READONLY_NEGATION_PATTERNS.some((pattern) => pattern.test(lowerContent));
  const mutationInstructionEvidence = readonlyNegated
    ? []
    : MUTATION_INSTRUCTION_PATTERNS
      .filter((pattern) => pattern.test(mdContent))
      .map((pattern) => pattern.source);

  if (mutationInstructionEvidence.length > 0) {
    reasons.push("body includes write/mutation instructions");
  }

  return {
    capable: mutationTools.length > 0 || mutationInstructionEvidence.length > 0,
    reasons,
    mutationTools,
    mutationInstructionEvidence,
  };
}

function outputContractSections(mdContent: string): Array<{ heading: string; body: string }> {
  const headings: Array<{ index: number; heading: string }> = [];
  const headingRe = /^##\s+.*Output Contract.*$/gmi;
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(mdContent)) !== null) {
    headings.push({ index: match.index, heading: match[0] ?? "## Output Contract" });
  }
  return headings.map((heading, idx) => {
    const lineEnd = mdContent.indexOf("\n", heading.index);
    const start = lineEnd === -1 ? mdContent.length : lineEnd + 1;
    const nextHeading = headings[idx + 1]?.index;
    const nextAnyHeading = mdContent.slice(start).search(/^##\s+/m);
    const endByAnyHeading = nextAnyHeading === -1 ? mdContent.length : start + nextAnyHeading;
    const end = nextHeading === undefined ? endByAnyHeading : Math.min(nextHeading, endByAnyHeading);
    return { heading: heading.heading, body: mdContent.slice(start, end) };
  });
}

function parseFieldMap(sectionBody: string): Record<string, string> {
  const fields: Record<string, string> = {};
  const fieldRe = /^\s*(?:[-*]\s*)?([A-Za-z][A-Za-z0-9]*)\s*:\s*(.+?)\s*$/gm;
  let match: RegExpExecArray | null;
  while ((match = fieldRe.exec(sectionBody)) !== null) {
    const key = match[1]!;
    const value = stripQuotes(match[2] ?? "");
    if (fields[key] === undefined) fields[key] = value;
  }
  return fields;
}

function parseRequiredFields(raw: string | undefined): string[] {
  if (!raw) return [];
  const trimmed = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
  const pieces = trimmed.includes(",")
    ? trimmed.split(",")
    : trimmed.split(/\s+/);
  return pieces.map((part) => stripQuotes(part.trim())).filter((part) => part.length > 0);
}

export function parseOutputContractSections(mdContent: string): ParsedOutputContract[] {
  return outputContractSections(mdContent).map(({ heading, body }) => {
    const fields = parseFieldMap(body);
    const requiredFields = parseRequiredFields(fields.requiredFields);
    const rawFields = fields as ParsedOutputContract["rawFields"];
    const missingMinimumFields = OUTPUT_CONTRACT_MINIMUM_FIELDS.filter((field) => {
      if (field === "requiredFields") return requiredFields.length === 0;
      return !fields[field] || fields[field]!.trim().length === 0;
    });
    const missingRequiredFields = OUTPUT_PAYLOAD_REQUIRED_FIELDS.filter((field) => !requiredFields.includes(field));
    return {
      statePath: fields.statePath ?? "",
      markdownReportPath: fields.markdownReportPath,
      requiredFields,
      envelopeKind: fields.envelopeKind,
      mutationSummary: fields.mutationSummary,
      filesTouched: fields.filesTouched,
      verification: fields.verification,
      eventRefs: fields.eventRefs,
      handoffStatus: fields.handoffStatus,
      rawFields,
      missingMinimumFields,
      missingRequiredFields,
      complete: missingMinimumFields.length === 0 && missingRequiredFields.length === 0,
      sectionHeading: heading,
    };
  });
}

export function parseOutputContract(mdContent: string): ParsedOutputContract | null {
  const sections = parseOutputContractSections(mdContent);
  if (sections.length === 0) return null;
  const complete = sections.find((section) => section.complete);
  if (complete) return complete;
  return sections.find((section) => section.statePath.length > 0 && section.requiredFields.length > 0) ?? null;
}

export function analyzeAgentMarkdown(mdContent: string, filePath: string): AgentInventoryEntry {
  const fallbackId = path.basename(filePath, ".md");
  const { frontmatter: frontmatterText } = splitFrontmatter(mdContent);
  const frontmatter = parseFrontmatterBlock(frontmatterText, fallbackId);
  const mutationCapability = classifyMutationCapability(frontmatter, mdContent);
  const outputContract = parseOutputContract(mdContent);

  let kind: OutputContractStatusKind;
  if (frontmatter.outputContractExempt) {
    kind = "exempt";
  } else if (!mutationCapability.capable) {
    kind = "not-required";
  } else if (!outputContract) {
    kind = "missing";
  } else if (outputContract.complete) {
    kind = "complete";
  } else {
    kind = "incomplete";
  }

  return {
    id: frontmatter.id,
    name: frontmatter.name,
    filePath,
    frontmatter,
    tools: frontmatter.tools,
    disallowedTools: frontmatter.disallowedTools,
    mutationCapability,
    outputContract,
    outputContractStatus: {
      kind,
      missingMinimumFields: outputContract?.missingMinimumFields ?? [...OUTPUT_CONTRACT_MINIMUM_FIELDS],
      missingRequiredFields: outputContract?.missingRequiredFields ?? [...OUTPUT_PAYLOAD_REQUIRED_FIELDS],
      exemptionReason: frontmatter.outputContractExempt?.reason,
    },
    deprecation: frontmatter.deprecation,
  };
}

export function loadPluginAgentInventory(pluginRoot = DEFAULT_PLUGIN_ROOT): AgentInventoryEntry[] {
  const agentsDir = path.join(pluginRoot, AGENTS_DIRNAME);
  const files = fs.readdirSync(agentsDir)
    .filter((entry) => entry.endsWith(".md"))
    .sort((a, b) => a.localeCompare(b));
  return files.map((file) => {
    const filePath = path.join(agentsDir, file);
    return analyzeAgentMarkdown(fs.readFileSync(filePath, "utf8"), filePath);
  });
}

export function findAgentInventoryEntry(agentName: string, pluginRoot = DEFAULT_PLUGIN_ROOT): AgentInventoryEntry | null {
  try {
    return loadPluginAgentInventory(pluginRoot).find((entry) => entry.name === agentName || entry.id === agentName) ?? null;
  } catch {
    return null;
  }
}

export function statusRequiresBlocking(entry: AgentInventoryEntry): boolean {
  return entry.mutationCapability.capable &&
    !entry.frontmatter.outputContractExempt &&
    entry.outputContractStatus.kind !== "complete";
}

export function formatOutputContractStatus(entry: AgentInventoryEntry): string {
  const status = entry.outputContractStatus;
  if (status.kind === "complete") return `complete (${entry.outputContract?.statePath ?? "unknown statePath"})`;
  if (status.kind === "exempt") return `exempt (${status.exemptionReason ?? "no reason"})`;
  if (status.kind === "not-required") return "not-required (not mutation-capable)";
  const missing = [...status.missingMinimumFields, ...status.missingRequiredFields]
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(", ");
  return `${status.kind}${missing.length > 0 ? ` (missing: ${missing})` : ""}`;
}
