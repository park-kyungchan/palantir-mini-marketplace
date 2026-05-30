import {
  AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
  type AipFdeLocalSurfaceContract,
  type RuntimeSurfaceProjection,
  isAipArchitectureSurface,
  isAipFdeLocalSurfaceKind,
  isDeterministicEnforcementStatus,
  isMutationCapability,
  isRuntimeSupportDeclaration,
  isWorkflowFamily,
  type PalantirSourceAuthorityRef,
} from "../../core/contracts/aip-fde-local-surface";
import type { ContractRequirementSet } from "../../core/contracts/workflow-family-enforcement";

export type SurfaceContractIssueSeverity = "fail" | "warn";

export interface SurfaceContractIssue {
  readonly issueId: string;
  readonly field: string;
  readonly severity: SurfaceContractIssueSeverity;
  readonly message: string;
}

export interface ParsedSurfaceContract {
  readonly source: "frontmatter" | "surface-contract-section" | "source-comment" | "json" | "missing";
  readonly contract?: AipFdeLocalSurfaceContract;
  readonly issues: readonly SurfaceContractIssue[];
}

type PrimitiveRecord = Record<string, unknown>;

const CONTRACT_FIELDS = [
  "schemaVersion",
  "surfaceKind",
  "surfaceId",
  "workflowFamily",
  "phaseRefs",
  "aipSurfaceRefs",
  "requiredContracts",
  "mutationCapability",
  "deterministicStatus",
  "runtimeProjection",
  "outputStateRefs",
  "validationRefs",
  "unsupportedParityClaimsForbidden",
] as const;

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseInlineList(value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return [stripQuotes(trimmed)];
  return trimmed
    .slice(1, -1)
    .split(",")
    .map((item) => stripQuotes(item))
    .filter(Boolean);
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function extractFrontmatter(content: string): string | undefined {
  if (!content.startsWith("---")) return undefined;
  const end = content.indexOf("\n---", 3);
  if (end === -1) return undefined;
  return content.slice(3, end).trim();
}

function extractSurfaceSection(content: string): string | undefined {
  const match = content.match(/^## Surface Contract\s*$/m);
  if (!match || match.index === undefined) return undefined;
  const start = match.index + match[0].length;
  const rest = content.slice(start);
  const nextHeading = rest.search(/^##\s+/m);
  return (nextHeading === -1 ? rest : rest.slice(0, nextHeading)).trim();
}

function normalizeCommentLine(line: string): string {
  return line
    .replace(/^\s*\/\*\*?/, "")
    .replace(/\*\/\s*$/, "")
    .replace(/^\s*\*\s?/, "")
    .replace(/^\s*\/\/\s?/, "");
}

function extractSourceCommentSurfaceBlock(content: string): string | undefined {
  const blockPattern = /\/\*\*?[\s\S]*?@palantirSurface[\s\S]*?\*\//m;
  const blockMatch = content.match(blockPattern);
  const rawBlock = blockMatch?.[0] ?? content
    .split(/\r?\n/)
    .filter((line) => line.includes("@palantirSurface") || line.trim().startsWith("//"))
    .join("\n");
  if (!rawBlock.includes("@palantirSurface")) return undefined;

  const lines = rawBlock.split(/\r?\n/).map(normalizeCommentLine);
  const markerIndex = lines.findIndex((line) => line.trim() === "@palantirSurface");
  if (markerIndex === -1) return undefined;
  return lines
    .slice(markerIndex + 1)
    .filter((line) => line.trim().length > 0)
    .join("\n")
    .trim();
}

function blockLinesFromJsonObject(value: PrimitiveRecord, indent = 0): string[] {
  const prefix = " ".repeat(indent);
  const out: string[] = [];
  for (const [key, nestedValue] of Object.entries(value)) {
    if (Array.isArray(nestedValue)) {
      out.push(`${prefix}${key}:`);
      for (const item of nestedValue) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          const [first, ...rest] = Object.entries(item as PrimitiveRecord);
          if (first) {
            out.push(`${prefix}  - ${first[0]}: ${String(first[1])}`);
            for (const [nestedKey, nestedItem] of rest) {
              out.push(`${prefix}    ${nestedKey}: ${String(nestedItem)}`);
            }
          }
        } else {
          out.push(`${prefix}  - ${String(item)}`);
        }
      }
      continue;
    }
    if (nestedValue && typeof nestedValue === "object") {
      out.push(`${prefix}${key}:`);
      out.push(...blockLinesFromJsonObject(nestedValue as PrimitiveRecord, indent + 2));
      continue;
    }
    out.push(`${prefix}${key}: ${String(nestedValue)}`);
  }
  return out;
}

function extractJsonSurfaceBlock(content: string): string | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return undefined;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
  const surface = (parsed as PrimitiveRecord).palantirSurface;
  if (!surface || typeof surface !== "object" || Array.isArray(surface)) return undefined;
  return blockLinesFromJsonObject(surface as PrimitiveRecord).join("\n");
}

function collectNestedBlock(lines: readonly string[], key: string): string[] {
  const keyPattern = new RegExp(`^(\\s*)${key}:\\s*$`);
  const start = lines.findIndex((line) => keyPattern.test(line));
  if (start === -1) return [];
  const baseIndent = lines[start]?.match(/^\s*/)?.[0].length ?? 0;
  const block: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.trim()) continue;
    const indent = line.match(/^\s*/)?.[0].length ?? 0;
    if (indent <= baseIndent) break;
    block.push(line.slice(baseIndent + 2));
  }
  return block;
}

function scalarFromBlock(lines: readonly string[], key: string): string | undefined {
  const pattern = new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`);
  for (const line of lines) {
    const match = line.match(pattern);
    if (match?.[1]) return stripQuotes(match[1]);
  }
  return undefined;
}

function arrayFromBlock(lines: readonly string[], key: string): string[] {
  const inline = scalarFromBlock(lines, key);
  if (inline) return parseInlineList(inline);

  const block = collectNestedBlock(lines, key);
  return block
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => stripQuotes(line.slice(2)))
    .filter(Boolean);
}

function objectFromBlock(lines: readonly string[], key: string): PrimitiveRecord {
  const block = collectNestedBlock(lines, key);
  const out: PrimitiveRecord = {};
  for (const line of block) {
    const match = line.match(/^\s*([A-Za-z0-9_-]+):\s*(.+?)\s*$/);
    if (match?.[1] && match[2] !== undefined) out[match[1]] = stripQuotes(match[2]);
  }
  return out;
}

function authorityRefsFromBlock(lines: readonly string[]): PalantirSourceAuthorityRef[] {
  const block = collectNestedBlock(lines, "palantirSourceAuthorityRefs");
  const refs: PrimitiveRecord[] = [];
  let current: PrimitiveRecord | undefined;

  for (const rawLine of block) {
    const line = rawLine.trim();
    if (line.startsWith("- ")) {
      current = {};
      refs.push(current);
      const inline = line.slice(2);
      const match = inline.match(/^([A-Za-z0-9_-]+):\s*(.+?)\s*$/);
      if (match?.[1] && match[2] !== undefined) current[match[1]] = stripQuotes(match[2]);
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.+?)\s*$/);
    if (current && match?.[1] && match[2] !== undefined) {
      current[match[1]] = stripQuotes(match[2]);
    }
  }

  return refs.flatMap((ref) => {
    const localResearchPath = typeof ref.localResearchPath === "string" ? ref.localResearchPath : "";
    const externalUrl = typeof ref.externalUrl === "string" ? ref.externalUrl : "";
    const lastVerified = typeof ref.lastVerified === "string" ? ref.lastVerified : "";
    const sourceClass = typeof ref.sourceClass === "string" ? ref.sourceClass : "";
    if (!localResearchPath && !externalUrl && !lastVerified && !sourceClass) return [];
    return [{ localResearchPath, externalUrl, lastVerified, sourceClass }] as PalantirSourceAuthorityRef[];
  });
}

function runtimeProjectionFromBlock(lines: readonly string[]): AipFdeLocalSurfaceContract["runtimeProjection"] {
  const block = collectNestedBlock(lines, "runtimeProjection");
  return {
    claude: runtimeProjectionFor("claude", block),
    codex: runtimeProjectionFor("codex", block),
  };
}

function runtimeProjectionFor(runtime: "claude" | "codex", lines: readonly string[]): RuntimeSurfaceProjection {
  const block = collectNestedBlock(lines, runtime);
  const support = scalarFromBlock(block, "support");
  return {
    support: (support ?? "unsupported") as RuntimeSurfaceProjection["support"],
    evidenceRefs: arrayFromBlock(block, "evidenceRefs"),
    fallbackObligations: arrayFromBlock(block, "fallbackObligations"),
    unsupportedSurfaceRefs: arrayFromBlock(block, "unsupportedSurfaceRefs"),
    smokeEvidenceRefs: arrayFromBlock(block, "smokeEvidenceRefs"),
  };
}

function requiredContractsFromBlock(lines: readonly string[]): ContractRequirementSet {
  const block = objectFromBlock(lines, "requiredContracts");
  return {
    semanticIntent: contractRequirement(block.semanticIntent),
    digitalTwinChange: contractRequirement(block.digitalTwinChange),
    workContract: contractRequirement(block.workContract),
    userDecisionRecord: contractRequirement(block.userDecisionRecord),
  };
}

function contractRequirement(value: unknown): ContractRequirementSet[keyof ContractRequirementSet] {
  if (value === "required" || value === "optional" || value === "not-applicable") return value;
  return "not-applicable";
}

function frontmatterSurfaceBlock(frontmatter: string): string[] {
  const lines = frontmatter.split(/\r?\n/);
  const block = collectNestedBlock(lines, "palantirSurface");
  return block.length > 0 ? block : lines;
}

function surfaceSectionBlock(section: string): string[] {
  return section
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*-\s*/, ""))
    .filter((line) => line.trim());
}

function issue(
  issueId: string,
  field: string,
  message: string,
  severity: SurfaceContractIssueSeverity = "fail",
): SurfaceContractIssue {
  return { issueId, field, message, severity };
}

function normalizeSurfaceContract(
  block: readonly string[],
): { contract?: AipFdeLocalSurfaceContract; issues: SurfaceContractIssue[] } {
  const fields: PrimitiveRecord = {};
  for (const field of CONTRACT_FIELDS) {
    const scalar = scalarFromBlock(block, field);
    if (scalar !== undefined) fields[field] = scalar;
  }

  const phaseRefs = arrayFromBlock(block, "phaseRefs");
  const aipSurfaceRefs = arrayFromBlock(block, "aipSurfaceRefs");
  const outputStateRefs = arrayFromBlock(block, "outputStateRefs");
  const validationRefs = arrayFromBlock(block, "validationRefs");
  const palantirSourceAuthorityRefs = authorityRefsFromBlock(block);
  const requiredContracts = requiredContractsFromBlock(block);
  const runtimeProjection = runtimeProjectionFromBlock(block);
  const issues: SurfaceContractIssue[] = [];

  if (fields.schemaVersion !== AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION) {
    issues.push(issue(
      "surface.invalid-schema-version",
      "schemaVersion",
      `Expected ${AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION}.`,
    ));
  }
  if (!isAipFdeLocalSurfaceKind(fields.surfaceKind)) {
    issues.push(issue("surface.invalid-kind", "surfaceKind", "Unknown surface kind."));
  }
  if (typeof fields.surfaceId !== "string" || fields.surfaceId.length === 0) {
    issues.push(issue("surface.missing-id", "surfaceId", "surfaceId is required."));
  }
  if (!isWorkflowFamily(fields.workflowFamily)) {
    issues.push(issue("surface.invalid-workflow-family", "workflowFamily", "Unknown workflowFamily."));
  }
  if (phaseRefs.length === 0) {
    issues.push(issue("surface.missing-phase-refs", "phaseRefs", "At least one phaseRef is required."));
  }
  const invalidAipRefs = aipSurfaceRefs.filter((ref) => !isAipArchitectureSurface(ref));
  if (aipSurfaceRefs.length === 0 || invalidAipRefs.length > 0) {
    issues.push(issue(
      "surface.invalid-aip-surface-refs",
      "aipSurfaceRefs",
      invalidAipRefs.length > 0
        ? `Unknown AIP surface refs: ${invalidAipRefs.join(", ")}.`
        : "At least one AIP surface ref is required.",
    ));
  }
  if (!isMutationCapability(fields.mutationCapability)) {
    issues.push(issue("surface.invalid-mutation-capability", "mutationCapability", "Unknown mutation capability."));
  }
  if (!isDeterministicEnforcementStatus(fields.deterministicStatus)) {
    issues.push(issue("surface.invalid-deterministic-status", "deterministicStatus", "Unknown status."));
  }
  for (const runtime of ["claude", "codex"] as const) {
    if (!isRuntimeSupportDeclaration(runtimeProjection[runtime].support)) {
      issues.push(issue(
        "surface.invalid-runtime-support",
        `runtimeProjection.${runtime}.support`,
        `Missing or invalid ${runtime} runtime support declaration.`,
      ));
    }
  }
  if (parseBoolean(fields.unsupportedParityClaimsForbidden) !== true) {
    issues.push(issue(
      "surface.parity-claim-policy-missing",
      "unsupportedParityClaimsForbidden",
      "Must be true for cross-runtime surface contracts.",
    ));
  }

  if (issues.some((entry) => entry.severity === "fail")) return { issues };

  return {
    contract: {
      schemaVersion: AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION,
      surfaceKind: fields.surfaceKind as AipFdeLocalSurfaceContract["surfaceKind"],
      surfaceId: fields.surfaceId as string,
      workflowFamily: fields.workflowFamily as AipFdeLocalSurfaceContract["workflowFamily"],
      phaseRefs,
      aipSurfaceRefs: aipSurfaceRefs as AipFdeLocalSurfaceContract["aipSurfaceRefs"],
      palantirSourceAuthorityRefs,
      requiredContracts,
      mutationCapability: fields.mutationCapability as AipFdeLocalSurfaceContract["mutationCapability"],
      deterministicStatus: fields.deterministicStatus as AipFdeLocalSurfaceContract["deterministicStatus"],
      runtimeProjection,
      outputStateRefs,
      validationRefs,
      unsupportedParityClaimsForbidden: true,
    },
    issues,
  };
}

export function parseSurfaceContractFromMarkdown(content: string): ParsedSurfaceContract {
  const frontmatter = extractFrontmatter(content);
  if (frontmatter?.includes("palantirSurface:")) {
    const normalized = normalizeSurfaceContract(frontmatterSurfaceBlock(frontmatter));
    return { source: "frontmatter", ...normalized };
  }

  const section = extractSurfaceSection(content);
  if (section) {
    const normalized = normalizeSurfaceContract(surfaceSectionBlock(section));
    return { source: "surface-contract-section", ...normalized };
  }

  const sourceComment = extractSourceCommentSurfaceBlock(content);
  if (sourceComment) {
    const normalized = normalizeSurfaceContract(sourceComment.split(/\r?\n/));
    return { source: "source-comment", ...normalized };
  }

  const jsonSurface = extractJsonSurfaceBlock(content);
  if (jsonSurface) {
    const normalized = normalizeSurfaceContract(jsonSurface.split(/\r?\n/));
    return { source: "json", ...normalized };
  }

  return {
    source: "missing",
    issues: [
      issue(
        "surface.contract-missing",
        "palantirSurface",
        "No palantirSurface frontmatter or ## Surface Contract section found.",
      ),
    ],
  };
}
