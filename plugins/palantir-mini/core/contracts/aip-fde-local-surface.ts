import {
  AIP_ARCHITECTURE_SURFACES,
  DETERMINISTIC_ENFORCEMENT_STATUSES,
  RUNTIME_SUPPORT_DECLARATIONS,
  WORKFLOW_FAMILIES,
  type AipArchitectureSurface,
  type ContractRequirementSet,
  type DeterministicEnforcementStatus,
  type RuntimeSupportDeclaration,
  type WorkflowFamily,
} from "./workflow-family-enforcement";

export const AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION =
  "palantir-mini/aip-fde-local-surface/v1" as const;

export const AIP_FDE_LOCAL_SURFACE_KINDS = [
  "mcp-tool",
  "agent",
  "skill",
  "hook",
  "eval-suite",
  "runtime-adapter",
] as const;

export type AipFdeLocalSurfaceKind = (typeof AIP_FDE_LOCAL_SURFACE_KINDS)[number];

export const MUTATION_CAPABILITIES = [
  "none",
  "proposal-only",
  "mutation-capable",
] as const;

export type MutationCapability = (typeof MUTATION_CAPABILITIES)[number];

export const PALANTIR_SOURCE_CLASSES = [
  "palantir-aip",
  "palantir-ontology",
  "palantir-foundry",
  "palantir-ai-fde",
  "palantir-aip-evals",
  "palantir-chatbot-studio",
] as const;

export type PalantirSourceClass = (typeof PALANTIR_SOURCE_CLASSES)[number];

export interface PalantirSourceAuthorityRef {
  readonly localResearchPath: string;
  readonly externalUrl: string;
  readonly lastVerified: string;
  readonly sourceClass: PalantirSourceClass;
}

export interface RuntimeSurfaceProjection {
  readonly support: RuntimeSupportDeclaration;
  readonly evidenceRefs: readonly string[];
  readonly fallbackObligations: readonly string[];
  readonly unsupportedSurfaceRefs: readonly string[];
  readonly smokeEvidenceRefs: readonly string[];
}

export interface AipFdeLocalSurfaceContract {
  readonly schemaVersion: typeof AIP_FDE_LOCAL_SURFACE_CONTRACT_SCHEMA_VERSION;
  readonly surfaceKind: AipFdeLocalSurfaceKind;
  readonly surfaceId: string;
  readonly workflowFamily: WorkflowFamily;
  readonly phaseRefs: readonly string[];
  readonly aipSurfaceRefs: readonly AipArchitectureSurface[];
  readonly palantirSourceAuthorityRefs: readonly PalantirSourceAuthorityRef[];
  readonly requiredContracts: ContractRequirementSet;
  readonly mutationCapability: MutationCapability;
  readonly deterministicStatus: DeterministicEnforcementStatus;
  readonly runtimeProjection: {
    readonly claude: RuntimeSurfaceProjection;
    readonly codex: RuntimeSurfaceProjection;
  };
  readonly outputStateRefs: readonly string[];
  readonly validationRefs: readonly string[];
  readonly unsupportedParityClaimsForbidden: true;
}

export const HOOK_SURFACE_CONTRACT_SCHEMA_VERSION =
  "palantir-mini/hook-surface/v1" as const;

export interface HookSurfaceContract {
  readonly schemaVersion: typeof HOOK_SURFACE_CONTRACT_SCHEMA_VERSION;
  readonly hookId: string;
  readonly event: string;
  readonly workflowFamily: WorkflowFamily;
  readonly phaseRefs: readonly string[];
  readonly policyRef: string;
  readonly determinism: DeterministicEnforcementStatus;
  readonly claudeSupport: RuntimeSupportDeclaration;
  readonly codexSupport: RuntimeSupportDeclaration;
  readonly codexFallbackObligations: readonly string[];
  readonly blocksOnFailure: boolean;
  readonly sourceAuthorityRefs: readonly string[];
}

export interface RuntimeDecision {
  readonly runtime: "neutral" | "claude" | "codex";
  readonly workflowFamily: WorkflowFamily;
  readonly phaseId: string;
  readonly requiredContracts: ContractRequirementSet;
  readonly allowedTools: readonly string[];
  readonly forbiddenTools: readonly string[];
  readonly blockingGates: readonly string[];
  readonly advisoryGates: readonly string[];
  readonly decision: "allow" | "advisory" | "deny" | "contract_required";
  readonly unsupportedSurfaceRefs: readonly string[];
  readonly evalRequirementRefs?: readonly string[];
  readonly replayRequirementRefs?: readonly string[];
  readonly lineageRequirementRefs?: readonly string[];
  readonly outputContractRefs?: readonly string[];
}

export interface RuntimeDecisionParityDifference {
  readonly field: string;
  readonly neutral: unknown;
  readonly claude: unknown;
  readonly codex: unknown;
}

export interface RuntimeDecisionParityResult {
  readonly status: "pass" | "fail";
  readonly comparedFields: readonly string[];
  readonly allowedRuntimeSpecificFields: readonly string[];
  readonly differences: readonly RuntimeDecisionParityDifference[];
}

export function isWorkflowFamily(value: unknown): value is WorkflowFamily {
  return typeof value === "string" && WORKFLOW_FAMILIES.includes(value as WorkflowFamily);
}

export function isAipArchitectureSurface(value: unknown): value is AipArchitectureSurface {
  return typeof value === "string" &&
    AIP_ARCHITECTURE_SURFACES.includes(value as AipArchitectureSurface);
}

export function isDeterministicEnforcementStatus(
  value: unknown,
): value is DeterministicEnforcementStatus {
  return typeof value === "string" &&
    DETERMINISTIC_ENFORCEMENT_STATUSES.includes(value as DeterministicEnforcementStatus);
}

export function isRuntimeSupportDeclaration(value: unknown): value is RuntimeSupportDeclaration {
  return typeof value === "string" &&
    RUNTIME_SUPPORT_DECLARATIONS.includes(value as RuntimeSupportDeclaration);
}

export function isAipFdeLocalSurfaceKind(value: unknown): value is AipFdeLocalSurfaceKind {
  return typeof value === "string" &&
    AIP_FDE_LOCAL_SURFACE_KINDS.includes(value as AipFdeLocalSurfaceKind);
}

export function isMutationCapability(value: unknown): value is MutationCapability {
  return typeof value === "string" && MUTATION_CAPABILITIES.includes(value as MutationCapability);
}

export function isPalantirSourceClass(value: unknown): value is PalantirSourceClass {
  return typeof value === "string" &&
    PALANTIR_SOURCE_CLASSES.includes(value as PalantirSourceClass);
}
