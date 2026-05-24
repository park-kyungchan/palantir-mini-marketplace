import type {
  DigitalTwinChangeContract,
  DigitalTwinDecisionDomain,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import {
  compilePreMutationPolicy,
  type CompilePreMutationPolicyInput,
  type CompilePreMutationPolicyResult,
  type PolicyRuleId,
} from "./policy-compiler";
import { extractDtcMutationSurfacePolicy } from "./dtc-surface-policy";
import { classifyHookTool } from "../hooks/tool-classifier";

export type FDEGovernancePolicyRuleId =
  | PolicyRuleId
  | "digital-twin-contract-not-approved"
  | "human-approval-required"
  | "required-decision-open"
  | "required-review-domain-open"
  | "digital-twin-risk-open";

export interface FDEGovernancePolicyInput extends CompilePreMutationPolicyInput {
  readonly dtc?: DigitalTwinChangeContract;
  readonly sic?: SemanticIntentContract;
  readonly humanApprovalRequired?: boolean;
}

export interface FDEGovernancePolicyResult {
  readonly allowed: boolean;
  readonly reason: FDEGovernancePolicyRuleId;
  readonly humanReason: string;
  readonly refs: CompilePreMutationPolicyResult["refs"];
  readonly preMutationPolicy: CompilePreMutationPolicyResult;
}

export function evaluateFDEGovernancePolicy(
  input: FDEGovernancePolicyInput,
): FDEGovernancePolicyResult {
  const preMutationPolicy = compilePreMutationPolicy(input);
  if (!preMutationPolicy.allowed) {
    return {
      allowed: false,
      reason: preMutationPolicy.reason,
      humanReason: preMutationPolicy.humanReason,
      refs: preMutationPolicy.refs,
      preMutationPolicy,
    };
  }

  if (preMutationPolicy.reason === "read-only-allow") {
    return allow(preMutationPolicy, "read-only-allow", preMutationPolicy.humanReason);
  }

  const toolClassification = classifyHookTool({ tool_name: input.toolName });
  const isProtectedMutation =
    input.isProtectedMutation ?? toolClassification.isProtectedMutation;

  if (!isProtectedMutation) {
    return allow(preMutationPolicy, "default-allow", preMutationPolicy.humanReason);
  }

  const dtc = input.dtc;
  if (!dtc || dtc.status !== "approved") {
    return deny(preMutationPolicy, "digital-twin-contract-not-approved", "Protected FDE mutation requires an approved DigitalTwinChangeContract.");
  }

  if ((input.humanApprovalRequired ?? true) && dtc.approvalRef === undefined) {
    return deny(preMutationPolicy, "human-approval-required", "Protected FDE mutation requires a human approvalRef on the DigitalTwinChangeContract.");
  }

  const openDecision = dtc.requiredUserDecisions?.find(
    (decision) => decision.blocking && decision.status === "open",
  );
  if (openDecision) {
    return deny(
      preMutationPolicy,
      "required-decision-open",
      `Blocking DTC user decision remains open: ${openDecision.decisionId}`,
    );
  }

  const missingReviewDomains = requiredReviewDomainsForMutation(input).filter(
    (domain) => !extractDtcMutationSurfacePolicy(dtc).reviewDomainsClosed.includes(domain),
  );
  if (missingReviewDomains.length > 0) {
    return deny(
      preMutationPolicy,
      "required-review-domain-open",
      `Protected FDE mutation requires closed DTC review domain(s): ${missingReviewDomains.join(", ")}`,
    );
  }

  const openRisk = dtc.risks.find((risk) => risk.status === "open");
  if (openRisk) {
    return deny(
      preMutationPolicy,
      "digital-twin-risk-open",
      `DTC risk remains open: ${openRisk.riskId}`,
    );
  }

  return allow(preMutationPolicy, preMutationPolicy.reason, preMutationPolicy.humanReason);
}

function requiredReviewDomainsForMutation(
  input: FDEGovernancePolicyInput,
): DigitalTwinDecisionDomain[] {
  const domains = new Set<DigitalTwinDecisionDomain>();
  const signals = [input.toolName, ...input.targetFiles].map((value) => value.toLowerCase());

  for (const signal of signals) {
    const segments = signal.split(/[^a-z0-9-]+/).filter((segment) => segment.length > 0);
    if (segments.includes("data")) domains.add("DATA");
    if (segments.includes("logic")) domains.add("LOGIC");
    if (segments.includes("action") || segments.includes("actions")) domains.add("ACTION");
    if (
      segments.includes("runtime") ||
      segments.includes("backend") ||
      segments.includes("lib") ||
      segments.includes("hooks") ||
      segments.includes("tests") ||
      segments.includes("eval-suites")
    ) {
      domains.add("TECHNOLOGY");
    }
    if (
      segments.includes("commit") ||
      segments.includes("commit-edits") ||
      segments.includes("publish") ||
      segments.includes("governance")
    ) {
      domains.add("GOVERNANCE");
    }
  }

  return [...domains];
}

function allow(
  preMutationPolicy: CompilePreMutationPolicyResult,
  reason: FDEGovernancePolicyRuleId,
  humanReason: string,
): FDEGovernancePolicyResult {
  return {
    allowed: true,
    reason,
    humanReason,
    refs: preMutationPolicy.refs,
    preMutationPolicy,
  };
}

function deny(
  preMutationPolicy: CompilePreMutationPolicyResult,
  reason: FDEGovernancePolicyRuleId,
  humanReason: string,
): FDEGovernancePolicyResult {
  return {
    allowed: false,
    reason,
    humanReason,
    refs: preMutationPolicy.refs,
    preMutationPolicy,
  };
}
