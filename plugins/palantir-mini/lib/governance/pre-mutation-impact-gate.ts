import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import type { ProjectScopeDefinition } from "../project-scope/types";
import {
  classifyHookTool,
  type HookToolClassification,
} from "../hooks/tool-classifier";
import type { McpToolCapability } from "../capability-registry/mcp-tool-capability";
import {
  actionTypeRefMatchesAction,
  extractActionTypeRid,
  extractDtcMutationSurfacePolicy,
  mcpToolRefMatchesTool,
  projectSurfaceRefMatchesTarget,
  surfaceRefMatchesTarget,
} from "./dtc-surface-policy";

export type PreMutationImpactGateMode = "advisory" | "blocking";

export interface PreMutationImpactGateInput {
  readonly projectRoot: string;
  readonly promptId?: string;
  readonly promptHash?: string;
  readonly toolName: string;
  readonly toolInput: Record<string, unknown>;
  readonly resolvedTargetFiles: readonly string[];
  readonly capability?: McpToolCapability;
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly workContractRef?: string;
  readonly semanticIntentContract?: SemanticIntentContract;
  readonly digitalTwinChangeContract?: DigitalTwinChangeContract;
  readonly projectScope?: ProjectScopeDefinition;
  readonly mode?: PreMutationImpactGateMode;
}

export interface PreMutationImpactGateResult {
  readonly decision: "allow" | "advisory" | "deny";
  readonly reason: string;
  readonly matchedSurfaces: readonly string[];
  readonly missingApprovals: readonly string[];
  readonly requiredNextActions: readonly string[];
  readonly evidenceRefs: readonly string[];
}

function gateMode(inputMode: PreMutationImpactGateMode | undefined): PreMutationImpactGateMode {
  if (inputMode === "advisory" || inputMode === "blocking") return inputMode;
  return process.env.PALANTIR_MINI_PRE_MUTATION_GATE === "blocking"
    ? "blocking"
    : "advisory";
}

export function evaluatePreMutationImpactGate(
  input: PreMutationImpactGateInput,
): PreMutationImpactGateResult {
  const mode = gateMode(input.mode);
  const classification = classifyHookTool({
    tool_name: input.toolName,
    tool_input: input.toolInput,
  });
  const capability = input.capability ?? classification.mcpToolCapability;
  const policy = input.digitalTwinChangeContract
    ? extractDtcMutationSurfacePolicy(input.digitalTwinChangeContract)
    : undefined;
  const matchedSurfaces: string[] = [];
  const missingApprovals: string[] = [];
  const requiredNextActions: string[] = [];
  const evidenceRefs = collectEvidenceRefs(input, capability);
  const forbiddenMatches: string[] = [];
  const mismatchDiagnostics: string[] = [];

  matchFileSurfaces(input, policy, matchedSurfaces, forbiddenMatches, mismatchDiagnostics);
  matchMcpSurfaces(input, classification, policy, matchedSurfaces, forbiddenMatches, mismatchDiagnostics);
  matchActionTypeSurfaces(input, classification, policy, matchedSurfaces, forbiddenMatches, mismatchDiagnostics);
  matchProjectSurfaces(input, policy, matchedSurfaces, forbiddenMatches, mismatchDiagnostics);
  matchCapabilitySurfaces(input, capability, policy, matchedSurfaces, forbiddenMatches, missingApprovals);

  if (classification.isProtectedMutation && !input.digitalTwinChangeContractRef && !input.digitalTwinChangeContract) {
    missingApprovals.push("DigitalTwinChangeContract");
  }
  if (capability?.requiresDtcApproval && !input.digitalTwinChangeContractRef && !input.digitalTwinChangeContract) {
    missingApprovals.push(`${capability.toolName}:DigitalTwinChangeContract`);
  }
  if (capability?.requiresSprintContract && !input.workContractRef) {
    missingApprovals.push(`${capability.toolName}:WorkContract`);
  }

  for (const forbidden of unique(forbiddenMatches)) {
    requiredNextActions.push(`Remove forbidden surface from mutation: ${forbidden}`);
  }
  for (const diagnostic of unique(mismatchDiagnostics)) {
    requiredNextActions.push(diagnostic);
  }
  for (const approval of unique(missingApprovals)) {
    requiredNextActions.push(`Provide explicit approval for ${approval}`);
  }

  const hasPolicyFinding =
    forbiddenMatches.length > 0 ||
    mismatchDiagnostics.length > 0 ||
    missingApprovals.length > 0;
  const decision: PreMutationImpactGateResult["decision"] =
    hasPolicyFinding ? (mode === "blocking" ? "deny" : "advisory") : "allow";
  const reason = hasPolicyFinding
    ? [
        `pre-mutation impact gate ${decision}`,
        forbiddenMatches.length > 0 ? `forbidden=${unique(forbiddenMatches).join(", ")}` : "",
        missingApprovals.length > 0 ? `missingApprovals=${unique(missingApprovals).join(", ")}` : "",
        mismatchDiagnostics.length > 0 ? `mismatches=${unique(mismatchDiagnostics).join(" | ")}` : "",
      ].filter((part) => part.length > 0).join("; ")
    : "pre-mutation impact gate allow";

  return {
    decision,
    reason,
    matchedSurfaces: unique(matchedSurfaces),
    missingApprovals: unique(missingApprovals),
    requiredNextActions: unique(requiredNextActions),
    evidenceRefs: unique(evidenceRefs),
  };
}

function collectEvidenceRefs(
  input: PreMutationImpactGateInput,
  capability: McpToolCapability | undefined,
): string[] {
  return [
    input.promptId ? `prompt:${input.promptId}` : undefined,
    input.promptHash ? `promptHash:${input.promptHash}` : undefined,
    input.semanticIntentContractRef,
    input.digitalTwinChangeContractRef,
    input.workContractRef,
    capability?.rid,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

function matchFileSurfaces(
  input: PreMutationImpactGateInput,
  policy: ReturnType<typeof extractDtcMutationSurfacePolicy> | undefined,
  matchedSurfaces: string[],
  forbiddenMatches: string[],
  mismatchDiagnostics: string[],
): void {
  if (!policy) return;
  for (const target of input.resolvedTargetFiles) {
    for (const ref of policy.forbiddenFileSurfaceRefs) {
      if (surfaceRefMatchesTarget(ref, target)) forbiddenMatches.push(`FileSurface:${ref}`);
    }
    const matched = policy.allowedFileSurfaceRefs.filter((ref) => surfaceRefMatchesTarget(ref, target));
    matchedSurfaces.push(...matched.map((ref) => `FileSurface:${ref}`));
    if (policy.allowedFileSurfaceRefs.length > 0 && matched.length === 0) {
      mismatchDiagnostics.push(
        `FileSurface target=${target} outside allowed refs [${policy.allowedFileSurfaceRefs.join(", ")}]`,
      );
    }
  }
}

function matchMcpSurfaces(
  input: PreMutationImpactGateInput,
  classification: HookToolClassification,
  policy: ReturnType<typeof extractDtcMutationSurfacePolicy> | undefined,
  matchedSurfaces: string[],
  forbiddenMatches: string[],
  mismatchDiagnostics: string[],
): void {
  if (!policy) return;
  for (const ref of policy.forbiddenMcpToolRefs) {
    if (mcpToolRefMatchesTool(ref, input.toolName)) forbiddenMatches.push(`MCPTool:${ref}`);
  }
  const matched = policy.allowedMcpToolRefs.filter((ref) => mcpToolRefMatchesTool(ref, input.toolName));
  matchedSurfaces.push(...matched.map((ref) => `MCPTool:${ref}`));
  if (
    policy.allowedMcpToolRefs.length > 0 &&
    (classification.isPalantirMiniMcpTool || classification.mcpToolCapability !== undefined) &&
    matched.length === 0
  ) {
    mismatchDiagnostics.push(
      `MCPTool tool=${input.toolName} outside allowed refs [${policy.allowedMcpToolRefs.join(", ")}]`,
    );
  }
}

function matchActionTypeSurfaces(
  input: PreMutationImpactGateInput,
  classification: HookToolClassification,
  policy: ReturnType<typeof extractDtcMutationSurfacePolicy> | undefined,
  matchedSurfaces: string[],
  forbiddenMatches: string[],
  mismatchDiagnostics: string[],
): void {
  if (!policy) return;
  const actionTypeRid = extractActionTypeRid(input.toolInput);
  for (const ref of policy.forbiddenActionTypeRefs) {
    if (actionTypeRefMatchesAction(ref, actionTypeRid)) forbiddenMatches.push(`ActionType:${ref}`);
  }
  const matched = policy.allowedActionTypeRefs.filter((ref) =>
    actionTypeRefMatchesAction(ref, actionTypeRid),
  );
  matchedSurfaces.push(...matched.map((ref) => `ActionType:${ref}`));
  if (classification.operation === "commit_edits" && policy.allowedActionTypeRefs.length > 0) {
    if (!actionTypeRid) {
      mismatchDiagnostics.push(
        `ActionType commit_edits missing actionTypeRid; expected [${policy.allowedActionTypeRefs.join(", ")}]`,
      );
    } else if (matched.length === 0) {
      mismatchDiagnostics.push(
        `ActionType actionTypeRid=${actionTypeRid} outside allowed refs [${policy.allowedActionTypeRefs.join(", ")}]`,
      );
    }
  }
}

function matchProjectSurfaces(
  input: PreMutationImpactGateInput,
  policy: ReturnType<typeof extractDtcMutationSurfacePolicy> | undefined,
  matchedSurfaces: string[],
  forbiddenMatches: string[],
  mismatchDiagnostics: string[],
): void {
  if (!policy) return;
  for (const target of input.resolvedTargetFiles) {
    for (const ref of policy.forbiddenProjectSurfaceRefs) {
      if (projectSurfaceRefMatchesTarget(ref, target, input.projectScope)) {
        forbiddenMatches.push(`ProjectSurface:${ref}`);
      }
    }
    const matched = policy.allowedProjectSurfaceRefs.filter((ref) =>
      projectSurfaceRefMatchesTarget(ref, target, input.projectScope),
    );
    matchedSurfaces.push(...matched.map((ref) => `ProjectSurface:${ref}`));
    if (policy.allowedProjectSurfaceRefs.length > 0 && matched.length === 0) {
      mismatchDiagnostics.push(
        `ProjectSurface target=${target} outside allowed refs [${policy.allowedProjectSurfaceRefs.join(", ")}]`,
      );
    }
  }
}

function matchCapabilitySurfaces(
  input: PreMutationImpactGateInput,
  capability: McpToolCapability | undefined,
  policy: ReturnType<typeof extractDtcMutationSurfacePolicy> | undefined,
  matchedSurfaces: string[],
  forbiddenMatches: string[],
  missingApprovals: string[],
): void {
  if (!capability) return;

  if (capability.dataAction !== "none") {
    matchedSurfaces.push(`DataAction:${capability.dataAction}`);
    if (policy?.forbiddenDataActions.includes(capability.dataAction)) {
      forbiddenMatches.push(`DataAction:${capability.dataAction}`);
    }
    if (policy && policy.allowedDataActions.length > 0 && !policy.allowedDataActions.includes(capability.dataAction)) {
      missingApprovals.push(`DataAction:${capability.dataAction}`);
    }
  }

  if (capability.releaseDeploy || /(^|[_:-])(deploy|release|publish)([_:-]|$)/i.test(input.toolName)) {
    matchedSurfaces.push(`ReleaseDeploy:${capability.toolName}`);
    if (!hasExplicitDtcApproval(input) || !hasExplicitMcpApproval(input, policy)) {
      missingApprovals.push(`ReleaseDeploy:${capability.toolName}`);
    }
  }

  if (capability.externalEgress) {
    matchedSurfaces.push(`Egress:${capability.toolName}`);
    if (!hasExplicitDtcApproval(input) || !hasExplicitMcpApproval(input, policy)) {
      missingApprovals.push(`ExternalEgress:${capability.toolName}`);
    }
  }
}

function hasExplicitDtcApproval(input: PreMutationImpactGateInput): boolean {
  const dtc = input.digitalTwinChangeContract;
  return Boolean(
    input.digitalTwinChangeContractRef ||
    (dtc && dtc.status === "approved" && dtc.approvalRef),
  );
}

function hasExplicitMcpApproval(
  input: PreMutationImpactGateInput,
  policy: ReturnType<typeof extractDtcMutationSurfacePolicy> | undefined,
): boolean {
  return Boolean(
    policy?.allowedMcpToolRefs.some((ref) => mcpToolRefMatchesTool(ref, input.toolName)),
  );
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
