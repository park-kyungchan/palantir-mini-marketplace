import {
  evaluatePreMutationGovernanceV2,
  type GovernanceDecisionV2,
  type PreMutationGovernanceV2Input,
} from "../../lib/governance/pre-mutation-governance-v2";

export interface PmPreMutationGovernanceArgs extends PreMutationGovernanceV2Input {}

function recordFrom(rawArgs: unknown): Record<string, unknown> {
  return rawArgs !== null && typeof rawArgs === "object" && !Array.isArray(rawArgs)
    ? rawArgs as Record<string, unknown>
    : {};
}

function hasString(record: Record<string, unknown>, key: string): boolean {
  return typeof record[key] === "string" && String(record[key]).trim().length > 0;
}

function hasStringArray(record: Record<string, unknown>, key: string): boolean {
  return Array.isArray(record[key]) &&
    (record[key] as unknown[]).every((item) => typeof item === "string");
}

function validateArgs(rawArgs: unknown): PmPreMutationGovernanceArgs {
  const record = recordFrom(rawArgs);
  if (!hasString(record, "project") && !hasString(record, "projectRoot")) {
    throw new Error("pm_pre_mutation_governance: `project` or `projectRoot` is required");
  }
  if (!hasString(record, "toolName")) {
    throw new Error("pm_pre_mutation_governance: `toolName` is required");
  }
  if (
    record["targetFiles"] !== undefined &&
    !hasStringArray(record, "targetFiles")
  ) {
    throw new Error("pm_pre_mutation_governance: `targetFiles` must be a string array");
  }
  if (
    record["resolvedTargetFiles"] !== undefined &&
    !hasStringArray(record, "resolvedTargetFiles")
  ) {
    throw new Error("pm_pre_mutation_governance: `resolvedTargetFiles` must be a string array");
  }
  if (
    record["toolInput"] !== undefined &&
    (
      record["toolInput"] === null ||
      typeof record["toolInput"] !== "object" ||
      Array.isArray(record["toolInput"])
    )
  ) {
    throw new Error("pm_pre_mutation_governance: `toolInput` must be an object when provided");
  }

  return {
    ...record,
    toolName: String(record["toolName"]),
    project: hasString(record, "project") ? String(record["project"]) : undefined,
    projectRoot: hasString(record, "projectRoot") ? String(record["projectRoot"]) : undefined,
    toolInput: record["toolInput"] as Record<string, unknown> | undefined,
    targetFiles: record["targetFiles"] as string[] | undefined,
    resolvedTargetFiles: record["resolvedTargetFiles"] as string[] | undefined,
  } as PmPreMutationGovernanceArgs;
}

export async function pmPreMutationGovernance(
  rawArgs: unknown,
): Promise<GovernanceDecisionV2> {
  return evaluatePreMutationGovernanceV2(validateArgs(rawArgs));
}

export default async function pmPreMutationGovernanceHandler(
  rawArgs: unknown,
): Promise<GovernanceDecisionV2> {
  return pmPreMutationGovernance(rawArgs);
}
