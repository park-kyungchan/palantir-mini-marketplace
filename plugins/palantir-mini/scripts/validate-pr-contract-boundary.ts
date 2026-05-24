// palantir-mini — PR contract boundary validator.
//
// This script binds DigitalTwinChangeContract branch/proposal and permission
// fields to reviewable PR evidence without changing Prompt-DTC gate defaults.

import { readFileSync } from "fs";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lib/lead-intent/contracts";
import type {
  MutationSurfaceRef,
  OntologyEngineeringRef,
} from "#schemas/ontology/primitives/ontology-engineering-ref";

export type PrContractBoundarySeverity = "block" | "advisory";

export interface PrContractBoundaryIssue {
  field: string;
  message: string;
  severity: PrContractBoundarySeverity;
}

export interface PrContractBoundaryInput {
  branchName: string;
  prBody: string;
  changedFiles: string[];
  semanticIntentContract?: SemanticIntentContract;
  digitalTwinChangeContract?: DigitalTwinChangeContract;
  allowedGeneratedFiles?: string[];
}

export interface RequiredPrSectionResult {
  present: boolean;
  label: string;
}

export interface BranchPolicyValidationResult {
  valid: boolean;
  contractSlugRequired: boolean;
  waveTokenRequired: boolean;
  scopeKindRequired: boolean;
  detectedScopeKind?: string;
}

export interface PermissionBoundaryValidationResult {
  valid: boolean;
  authorizedFiles: string[];
  unauthorizedFiles: string[];
  generatedFilesRequiringEvidence: string[];
  authorizedTokens: string[];
}

export interface PrContractBoundaryResult {
  valid: boolean;
  issues: PrContractBoundaryIssue[];
  requiredSections: Record<string, RequiredPrSectionResult>;
  branchPolicy: BranchPolicyValidationResult;
  permissionBoundary: PermissionBoundaryValidationResult;
}

interface RequiredPrSection {
  key: string;
  label: string;
  pattern: RegExp;
}

const REQUIRED_PR_SECTIONS: readonly RequiredPrSection[] = [
  {
    key: "semanticIntentContract",
    label: "SemanticIntentContract",
    pattern: /\bSemanticIntentContract\b/i,
  },
  {
    key: "digitalTwinChangeContract",
    label: "DigitalTwinChangeContract",
    pattern: /\bDigitalTwinChangeContract\b/i,
  },
  {
    key: "affectedTypedRefs",
    label: "Affected Typed Refs",
    pattern: /\bAffected\s+Typed\s+Refs\b|\baffected\s+typed\s+refs\b/i,
  },
  {
    key: "branchProposalPolicy",
    label: "branchProposalPolicy",
    pattern: /\bbranchProposalPolicy\b/i,
  },
  {
    key: "permissionBoundary",
    label: "permissionBoundary",
    pattern: /\bpermissionBoundary\b/i,
  },
  {
    key: "evaluationPlan",
    label: "evaluationPlan",
    pattern: /\bevaluationPlan\b/i,
  },
  {
    key: "recovery",
    label: "Recovery",
    pattern: /(^|\n)\s*#{1,6}\s*Recovery\b|\bRecovery\b/i,
  },
  {
    key: "excludedScope",
    label: "Excluded Scope",
    pattern: /(^|\n)\s*#{1,6}\s*Excluded\s+Scope\b|\bExcluded\s+Scope\b/i,
  },
];

const BRANCH_SCOPE_KINDS = [
  "schema",
  "contract",
  "gate",
  "router",
  "project-scope",
  "eval",
  "codex",
  "release",
  "permission",
  "branch",
  "pr",
] as const;

export function slugifyContractToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function addIssue(
  issues: PrContractBoundaryIssue[],
  field: string,
  message: string,
  severity: PrContractBoundarySeverity = "block",
): void {
  issues.push({ field, message, severity });
}

function validateRequiredPrSections(
  prBody: string,
  issues: PrContractBoundaryIssue[],
): Record<string, RequiredPrSectionResult> {
  const result: Record<string, RequiredPrSectionResult> = {};
  for (const section of REQUIRED_PR_SECTIONS) {
    const present = section.pattern.test(prBody);
    result[section.key] = {
      label: section.label,
      present,
    };
    if (!present) {
      addIssue(
        issues,
        `prBody.${section.key}`,
        `PR body must include ${section.label}`,
      );
    }
  }
  return result;
}

function contractSlugIsPresent(branchName: string, contractId?: string): boolean {
  if (!contractId?.trim()) return false;
  const branchSlug = slugifyContractToken(branchName);
  const contractSlug = slugifyContractToken(contractId);
  if (!contractSlug) return false;
  if (branchSlug.includes(contractSlug)) return true;
  return contractSlug
    .split("-")
    .filter((part) => part.length >= 4)
    .some((part) => branchSlug.includes(part));
}

function validateBranchPolicy(
  input: PrContractBoundaryInput,
  issues: PrContractBoundaryIssue[],
): BranchPolicyValidationResult {
  const branchSlug = slugifyContractToken(input.branchName);
  const hasContractSlug = contractSlugIsPresent(
    input.branchName,
    input.digitalTwinChangeContract?.contractId,
  );
  const hasWaveToken = /\b(wave-\d+|w\d+)\b/.test(branchSlug);
  const detectedScopeKind = BRANCH_SCOPE_KINDS.find((kind) => branchSlug.includes(kind));
  const hasScopeKind = detectedScopeKind !== undefined;

  if (!input.digitalTwinChangeContract?.contractId) {
    addIssue(
      issues,
      "digitalTwinChangeContract.contractId",
      "DigitalTwinChangeContract contractId is required for branch policy validation",
    );
  } else if (!hasContractSlug) {
    addIssue(
      issues,
      "branchName.contractId",
      "branch name must include the DigitalTwinChangeContract id or a stable contract slug",
    );
  }

  if (!hasWaveToken) {
    addIssue(
      issues,
      "branchName.wave",
      "branch name must include a wave token such as wave-9 or w9",
    );
  }

  if (!hasScopeKind) {
    addIssue(
      issues,
      "branchName.scopeKind",
      `branch name must include one scope kind: ${BRANCH_SCOPE_KINDS.join(", ")}`,
    );
  }

  return {
    valid: hasContractSlug && hasWaveToken && hasScopeKind,
    contractSlugRequired: !hasContractSlug,
    waveTokenRequired: !hasWaveToken,
    scopeKindRequired: !hasScopeKind,
    ...(detectedScopeKind ? { detectedScopeKind } : {}),
  };
}

function normalizePathToken(value: string): string {
  return value.trim().replace(/^["'`]+|["'`]+$/g, "").replace(/\\/g, "/");
}

function tokensFromContract(input: PrContractBoundaryInput): string[] {
  const tokens: string[] = [];
  const digitalTwin = input.digitalTwinChangeContract;
  const semantic = input.semanticIntentContract;

  if (semantic) {
    tokens.push(...semantic.affectedSurfaces, ...semantic.downstreamAllowed);
  }
  if (digitalTwin) {
    tokens.push(
      ...digitalTwin.affectedSurfaces,
      digitalTwin.permissionBoundary,
      digitalTwin.changeBoundary,
      ...refsToTokens(digitalTwin.touchedOntologyRefs),
      ...mutationSurfaceTokens(digitalTwin.permittedMutationSurfaces),
    );
  }

  return Array.from(
    new Set(
      tokens
        .flatMap((token) => token.split(/[,;\n]/))
        .map(normalizePathToken)
        .filter((token) => token.length > 0),
    ),
  );
}

function refsToTokens(refs?: readonly OntologyEngineeringRef[]): string[] {
  return (refs ?? []).flatMap((ref) => [
    ref.rid,
    ref.displayName ?? "",
    ref.project ?? "",
    ref.sourcePath ?? "",
  ]);
}

function mutationSurfaceTokens(refs?: readonly MutationSurfaceRef[]): string[] {
  return (refs ?? []).flatMap((ref) => {
    const surface = ref.surfaceRef;
    return [
      surface.rid,
      surface.displayName ?? "",
      surface.project ?? "",
      surface.sourcePath ?? "",
      "pathGlob" in surface ? surface.pathGlob ?? "" : "",
      "toolName" in surface ? surface.toolName ?? "" : "",
    ];
  });
}

function tokenLooksLikePath(token: string): boolean {
  return (
    token.includes("/") ||
    token.includes("*") ||
    token.startsWith(".") ||
    token.endsWith(".ts") ||
    token.endsWith(".tsx") ||
    token.endsWith(".json") ||
    token.endsWith(".md")
  );
}

function pathMatchesToken(filePath: string, token: string): boolean {
  const file = normalizePathToken(filePath);
  const normalized = normalizePathToken(token);
  if (!normalized) return false;

  if (normalized.includes("**")) {
    const [prefix = "", suffix = ""] = normalized.split("**", 2);
    return file.startsWith(prefix) && file.endsWith(suffix.replace(/^\//, ""));
  }

  if (normalized.endsWith("/*")) {
    return file.startsWith(normalized.slice(0, -1));
  }

  if (normalized.endsWith("/")) {
    return file.startsWith(normalized);
  }

  if (file === normalized || file.startsWith(`${normalized}/`)) {
    return true;
  }

  if (tokenLooksLikePath(normalized)) {
    return file.includes(normalized);
  }

  return false;
}

function bodyIncludesGeneratedEvidence(prBody: string): boolean {
  return /verify_codegen_headers|pm-codegen|regenerated|generated files were regenerated/i.test(
    prBody,
  );
}

function validatePermissionBoundary(
  input: PrContractBoundaryInput,
  issues: PrContractBoundaryIssue[],
): PermissionBoundaryValidationResult {
  const authorizedTokens = tokensFromContract(input);
  const pathTokens = authorizedTokens.filter(tokenLooksLikePath);
  const generatedEvidencePresent = bodyIncludesGeneratedEvidence(input.prBody);
  const allowedGeneratedFiles = new Set(input.allowedGeneratedFiles ?? []);
  const authorizedFiles: string[] = [];
  const unauthorizedFiles: string[] = [];
  const generatedFilesRequiringEvidence: string[] = [];

  if (!input.digitalTwinChangeContract?.permissionBoundary?.trim()) {
    addIssue(
      issues,
      "digitalTwinChangeContract.permissionBoundary",
      "permissionBoundary is required before PR boundary validation",
    );
  }

  for (const file of input.changedFiles.map(normalizePathToken)) {
    const authorized = pathTokens.length === 0
      ? false
      : pathTokens.some((token) => pathMatchesToken(file, token));

    if (authorized) {
      authorizedFiles.push(file);
    } else {
      unauthorizedFiles.push(file);
    }

    if (
      /(^|\/)src\/generated\//.test(file) &&
      !generatedEvidencePresent &&
      !allowedGeneratedFiles.has(file)
    ) {
      generatedFilesRequiringEvidence.push(file);
    }
  }

  if (pathTokens.length === 0 && input.changedFiles.length > 0) {
    addIssue(
      issues,
      "permissionBoundary.authorizedSurfaces",
      "permissionBoundary must map to at least one file surface or typed ref sourcePath",
    );
  }

  for (const file of unauthorizedFiles) {
    addIssue(
      issues,
      "permissionBoundary.changedFiles",
      `changed file is outside authorized contract surfaces: ${file}`,
    );
  }

  for (const file of generatedFilesRequiringEvidence) {
    addIssue(
      issues,
      "permissionBoundary.generatedFiles",
      `generated file requires regeneration evidence: ${file}`,
    );
  }

  return {
    valid:
      unauthorizedFiles.length === 0 &&
      generatedFilesRequiringEvidence.length === 0 &&
      pathTokens.length > 0,
    authorizedFiles,
    unauthorizedFiles,
    generatedFilesRequiringEvidence,
    authorizedTokens: pathTokens,
  };
}

export function validatePrContractBoundary(
  input: PrContractBoundaryInput,
): PrContractBoundaryResult {
  const issues: PrContractBoundaryIssue[] = [];
  const requiredSections = validateRequiredPrSections(input.prBody, issues);
  const branchPolicy = validateBranchPolicy(input, issues);
  const permissionBoundary = validatePermissionBoundary(input, issues);
  return {
    valid: issues.every((issue) => issue.severity !== "block"),
    issues,
    requiredSections,
    branchPolicy,
    permissionBoundary,
  };
}

function parseCliArgs(argv: readonly string[]): { inputPath?: string; help: boolean } {
  const inputIndex = argv.findIndex((arg) => arg === "--input");
  return {
    ...(inputIndex >= 0 && argv[inputIndex + 1] ? { inputPath: argv[inputIndex + 1] } : {}),
    help: argv.includes("--help") || argv.includes("-h"),
  };
}

function printHelp(): void {
  console.log(
    [
      "Usage: bun run scripts/validate-pr-contract-boundary.ts --input boundary.json",
      "",
      "boundary.json must match PrContractBoundaryInput.",
    ].join("\n"),
  );
}

if (import.meta.main) {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help || !args.inputPath) {
    printHelp();
    process.exit(args.help ? 0 : 2);
  }

  const input = JSON.parse(readFileSync(args.inputPath, "utf8")) as PrContractBoundaryInput;
  const result = validatePrContractBoundary(input);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 1);
}
