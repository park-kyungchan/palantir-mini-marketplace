import { createHash } from "node:crypto";
import { classifyHookTool } from "../hooks/tool-classifier";
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import type { ProjectScopeDefinition } from "../project-scope/types";
import type { SemanticConsistencyResolverOutput } from "../semantic-consistency/types";
import {
  evaluatePreMutationImpactGate,
  type PreMutationImpactGateMode,
} from "./pre-mutation-impact-gate";

export const PRE_MUTATION_GOVERNANCE_V2_SCHEMA_VERSION =
  "palantir-mini/pre-mutation-governance/v2" as const;

export const GOVERNANCE_DECISION_V2_SCHEMA_VERSION =
  "palantir-mini/governance-decision/v2" as const;

export type GovernanceDecisionV2Kind = "allow" | "advisory" | "deny";

export type PreMutationGovernanceV2ReasonCode =
  | "read_only_allow"
  | "protected_mutation_allowed"
  | "protected_mutation_generated_file"
  | "protected_mutation_missing_dtc"
  | "protected_mutation_dtc_fill_incomplete"
  | "protected_mutation_semantic_consistency_blocking"
  | "protected_mutation_surface_mismatch"
  | "protected_mutation_policy_advisory"
  | "protected_mutation_policy_denied";

export interface PreMutationGovernanceV2Input {
  readonly schemaVersion?: typeof PRE_MUTATION_GOVERNANCE_V2_SCHEMA_VERSION;
  readonly project?: string;
  readonly projectRoot?: string;
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly toolName: string;
  readonly toolInput?: Record<string, unknown>;
  readonly targetFiles?: readonly string[];
  readonly resolvedTargetFiles?: readonly string[];
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly workContractRef?: string;
  readonly semanticIntentContract?: SemanticIntentContract;
  readonly digitalTwinChangeContract?: DigitalTwinChangeContract;
  readonly semanticConsistencyResultRef?: string;
  readonly semanticConsistencyResult?: SemanticConsistencyResolverOutput;
  readonly projectScope?: ProjectScopeDefinition;
  readonly mode?: PreMutationImpactGateMode;
  readonly dtcFill?: {
    readonly complete?: boolean;
    readonly status?: string;
    readonly currentTurn?: number;
    readonly requiredTurns?: number;
    readonly evidenceRefs?: readonly string[];
  };
  /**
   * Caller assertions are intentionally ignored for authorization. They are
   * accepted only so the decision can prove free-text or booleans did not
   * become mutation authority.
   */
  readonly callerAllowed?: boolean;
  readonly runtimeAllowed?: boolean;
  readonly freeTextAuthorization?: string;
  readonly explanation?: string;
}

export interface GovernanceDecisionV2Refs {
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly workContractRef?: string;
  readonly semanticConsistencyResultRef?: string;
}

export interface GovernanceDecisionV2 {
  readonly schemaVersion: typeof GOVERNANCE_DECISION_V2_SCHEMA_VERSION;
  readonly decisionId: string;
  readonly decision: GovernanceDecisionV2Kind;
  readonly allowed: boolean;
  readonly reasonCode: PreMutationGovernanceV2ReasonCode;
  readonly ruleApplied: string;
  readonly humanReason: string;
  readonly toolName: string;
  readonly targetFiles: readonly string[];
  readonly refs: GovernanceDecisionV2Refs;
  readonly matchedSurfaces: readonly string[];
  readonly missingApprovals: readonly string[];
  readonly requiredNextActions: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly computeOnly: true;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(record[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function stableDecisionId(seed: Record<string, unknown>): string {
  const hash = createHash("sha256").update(stableJson(seed)).digest("hex").slice(0, 24);
  return `pre-mutation-governance-v2:${hash}`;
}

function projectRootFor(input: PreMutationGovernanceV2Input): string {
  return input.projectRoot ?? input.project ?? "";
}

function targetsFor(input: PreMutationGovernanceV2Input): string[] {
  return unique([...(input.resolvedTargetFiles ?? input.targetFiles ?? [])]).sort();
}

function isGeneratedTarget(target: string): boolean {
  const normalized = target.replace(/\\/g, "/").toLowerCase();
  return (
    normalized.includes("/src/generated/") ||
    normalized.startsWith("src/generated/") ||
    normalized.includes("/generated/") ||
    normalized.startsWith("generated/")
  );
}

function hasApprovedDtc(input: PreMutationGovernanceV2Input): boolean {
  return Boolean(
    input.digitalTwinChangeContractRef ||
    (
      input.digitalTwinChangeContract?.status === "approved" &&
      input.digitalTwinChangeContract.approvalRef
    ),
  );
}

function isDtcFillIncomplete(input: PreMutationGovernanceV2Input): boolean {
  if (input.dtcFill?.complete === false) return true;
  if (input.dtcFill?.status && !["complete", "approved", "ready"].includes(input.dtcFill.status)) {
    return true;
  }

  const fillPolicy = input.digitalTwinChangeContract?.fillPolicy;
  if (fillPolicy !== "dtc-turn-fill" && fillPolicy !== "ontology-dtc-build") return false;

  const readiness = input.digitalTwinChangeContract?.ontologyDtcBuildReadiness;
  if (readiness === undefined) return false;
  return readiness["readinessVerdict"] !== "ready-for-dtc";
}

function semanticConsistencyBlocking(input: PreMutationGovernanceV2Input): boolean {
  return (input.semanticConsistencyResult?.unresolvedBlockingConflictRefs.length ?? 0) > 0;
}

function refsFor(input: PreMutationGovernanceV2Input): GovernanceDecisionV2Refs {
  return {
    promptId: input.promptId,
    promptHash: input.promptHash,
    semanticIntentContractRef: input.semanticIntentContractRef ?? input.semanticIntentContract?.contractId,
    digitalTwinChangeContractRef: input.digitalTwinChangeContractRef ?? input.digitalTwinChangeContract?.contractId,
    workContractRef: input.workContractRef,
    semanticConsistencyResultRef:
      input.semanticConsistencyResultRef ?? input.semanticConsistencyResult?.resolverRunId,
  };
}

function buildDecision(
  input: PreMutationGovernanceV2Input,
  args: {
    readonly decision: GovernanceDecisionV2Kind;
    readonly reasonCode: PreMutationGovernanceV2ReasonCode;
    readonly ruleApplied: string;
    readonly humanReason: string;
    readonly targetFiles: readonly string[];
    readonly matchedSurfaces?: readonly string[];
    readonly missingApprovals?: readonly string[];
    readonly requiredNextActions?: readonly string[];
    readonly evidenceRefs?: readonly string[];
  },
): GovernanceDecisionV2 {
  const refs = refsFor(input);
  const evidenceRefs = unique([
    ...(args.evidenceRefs ?? []),
    ...Object.values(refs).filter((value): value is string => typeof value === "string"),
    ...(input.dtcFill?.evidenceRefs ?? []),
  ]);
  const seed = {
    schemaVersion: GOVERNANCE_DECISION_V2_SCHEMA_VERSION,
    decision: args.decision,
    reasonCode: args.reasonCode,
    ruleApplied: args.ruleApplied,
    toolName: input.toolName,
    targetFiles: args.targetFiles,
    refs,
    matchedSurfaces: [...(args.matchedSurfaces ?? [])].sort(),
    missingApprovals: [...(args.missingApprovals ?? [])].sort(),
    requiredNextActions: [...(args.requiredNextActions ?? [])].sort(),
    evidenceRefs: [...evidenceRefs].sort(),
  };

  return {
    schemaVersion: GOVERNANCE_DECISION_V2_SCHEMA_VERSION,
    decisionId: stableDecisionId(seed),
    decision: args.decision,
    allowed: args.decision === "allow",
    reasonCode: args.reasonCode,
    ruleApplied: args.ruleApplied,
    humanReason: args.humanReason,
    toolName: input.toolName,
    targetFiles: args.targetFiles,
    refs,
    matchedSurfaces: unique([...(args.matchedSurfaces ?? [])]),
    missingApprovals: unique([...(args.missingApprovals ?? [])]),
    requiredNextActions: unique([...(args.requiredNextActions ?? [])]),
    evidenceRefs,
    computeOnly: true,
  };
}

export function evaluatePreMutationGovernanceV2(
  input: PreMutationGovernanceV2Input,
): GovernanceDecisionV2 {
  const toolInput = input.toolInput ?? {};
  const targetFiles = targetsFor(input);
  const classification = classifyHookTool({
    tool_name: input.toolName,
    tool_input: toolInput,
  });
  const protectedMutation = classification.isProtectedMutation;

  if (!protectedMutation) {
    return buildDecision(input, {
      decision: "allow",
      reasonCode: "read_only_allow",
      ruleApplied: "classification.read-only-or-compute-only",
      humanReason: "Tool is read-only or compute-only; protected mutation authorization is not required.",
      targetFiles,
      matchedSurfaces: classification.mcpToolCapability
        ? [`MCPTool:${classification.mcpToolCapability.toolName}`]
        : [],
    });
  }

  const generatedTargets = targetFiles.filter(isGeneratedTarget);
  if (generatedTargets.length > 0) {
    return buildDecision(input, {
      decision: "deny",
      reasonCode: "protected_mutation_generated_file",
      ruleApplied: "generated-files.fail-closed",
      humanReason: "Protected mutation targets generated files; regenerate from the source authority instead.",
      targetFiles,
      matchedSurfaces: generatedTargets.map((target) => `FileSurface:${target}`),
      requiredNextActions: generatedTargets.map((target) => `Remove generated file target: ${target}`),
    });
  }

  if (!hasApprovedDtc(input)) {
    return buildDecision(input, {
      decision: "deny",
      reasonCode: "protected_mutation_missing_dtc",
      ruleApplied: "digital-twin-change-contract.required",
      humanReason:
        "Protected mutation requires an approved DigitalTwinChangeContract. Caller booleans or explanation text are not authorization.",
      targetFiles,
      missingApprovals: ["DigitalTwinChangeContract"],
      requiredNextActions: ["Provide an approved DigitalTwinChangeContract before protected mutation."],
    });
  }

  if (isDtcFillIncomplete(input)) {
    return buildDecision(input, {
      decision: "deny",
      reasonCode: "protected_mutation_dtc_fill_incomplete",
      ruleApplied: "dtc-fill-sequence.required",
      humanReason: "Protected mutation requires complete DTC fill readiness before authorization.",
      targetFiles,
      missingApprovals: ["DigitalTwinChangeContract.fillSequence"],
      requiredNextActions: ["Complete DTC fill readiness before protected mutation."],
    });
  }

  const gate = evaluatePreMutationImpactGate({
    projectRoot: projectRootFor(input),
    promptId: input.promptId,
    promptHash: input.promptHash,
    toolName: input.toolName,
    toolInput,
    resolvedTargetFiles: targetFiles,
    semanticIntentContractRef: input.semanticIntentContractRef,
    digitalTwinChangeContractRef: input.digitalTwinChangeContractRef,
    workContractRef: input.workContractRef,
    semanticIntentContract: input.semanticIntentContract,
    digitalTwinChangeContract: input.digitalTwinChangeContract,
    semanticConsistencyResultRef: input.semanticConsistencyResultRef,
    semanticConsistencyResult: input.semanticConsistencyResult,
    projectScope: input.projectScope,
    mode: input.mode ?? "blocking",
  });

  if (semanticConsistencyBlocking(input) && gate.decision === "deny") {
    return buildDecision(input, {
      decision: "deny",
      reasonCode: "protected_mutation_semantic_consistency_blocking",
      ruleApplied: "semantic-consistency.blocking-conflict",
      humanReason: "Protected mutation has unresolved blocking semantic consistency conflicts.",
      targetFiles,
      matchedSurfaces: gate.matchedSurfaces,
      missingApprovals: gate.missingApprovals,
      requiredNextActions: gate.requiredNextActions,
      evidenceRefs: gate.evidenceRefs,
    });
  }

  if (gate.decision === "deny") {
    const reasonCode = gate.requiredNextActions.some((action) => action.includes("outside allowed refs"))
      ? "protected_mutation_surface_mismatch"
      : "protected_mutation_policy_denied";
    return buildDecision(input, {
      decision: "deny",
      reasonCode,
      ruleApplied: "pre-mutation-impact-gate.blocking",
      humanReason: gate.reason,
      targetFiles,
      matchedSurfaces: gate.matchedSurfaces,
      missingApprovals: gate.missingApprovals,
      requiredNextActions: gate.requiredNextActions,
      evidenceRefs: gate.evidenceRefs,
    });
  }

  if (gate.decision === "advisory") {
    return buildDecision(input, {
      decision: "advisory",
      reasonCode: "protected_mutation_policy_advisory",
      ruleApplied: "pre-mutation-impact-gate.advisory",
      humanReason: gate.reason,
      targetFiles,
      matchedSurfaces: gate.matchedSurfaces,
      missingApprovals: gate.missingApprovals,
      requiredNextActions: gate.requiredNextActions,
      evidenceRefs: gate.evidenceRefs,
    });
  }

  return buildDecision(input, {
    decision: "allow",
    reasonCode: "protected_mutation_allowed",
    ruleApplied: "pre-mutation-impact-gate.allow",
    humanReason: "Protected mutation has the required deterministic governance evidence.",
    targetFiles,
    matchedSurfaces: gate.matchedSurfaces,
    evidenceRefs: gate.evidenceRefs,
  });
}
