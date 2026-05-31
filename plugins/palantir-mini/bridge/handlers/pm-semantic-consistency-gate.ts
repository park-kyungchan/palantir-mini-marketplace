import {
  assessSemanticConsistencyPromotionGate,
  type SemanticConsistencyPromotionGateInput,
  type SemanticConsistencyPromotionGateResult,
} from "../../lib/semantic-consistency/promotion-gate";
import { resolveSemanticConsistency } from "../../lib/semantic-consistency/resolver";
import type {
  SemanticConsistencyResolverInput,
  SemanticConsistencyResolverOutput,
} from "../../lib/semantic-consistency/types";

export interface SemanticConsistencyGateHandlerInput {
  readonly subject: SemanticConsistencyPromotionGateInput["subject"];
  readonly ontologyAffecting: boolean;
  readonly semanticConsistencyResolverInput?: SemanticConsistencyResolverInput;
  readonly semanticConsistencyResult?: SemanticConsistencyResolverOutput;
  readonly attachedResolverRunRefs?: readonly string[];
}

export interface SemanticConsistencyGateHandlerResult
  extends SemanticConsistencyPromotionGateResult {
  readonly semanticConsistencyResult?: SemanticConsistencyResolverOutput;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertInput(value: unknown): asserts value is SemanticConsistencyGateHandlerInput {
  if (!isRecord(value)) {
    throw new Error("pm_semantic_consistency_gate requires an object input.");
  }
  if (typeof value.subject !== "string") {
    throw new Error("pm_semantic_consistency_gate subject must be a string.");
  }
  if (typeof value.ontologyAffecting !== "boolean") {
    throw new Error("pm_semantic_consistency_gate ontologyAffecting must be a boolean.");
  }
  if (
    value.attachedResolverRunRefs !== undefined &&
    (!Array.isArray(value.attachedResolverRunRefs) ||
      !value.attachedResolverRunRefs.every((ref) => typeof ref === "string"))
  ) {
    throw new Error("pm_semantic_consistency_gate attachedResolverRunRefs must be a string array.");
  }
}

export function pmSemanticConsistencyGate(
  input: SemanticConsistencyGateHandlerInput,
): SemanticConsistencyGateHandlerResult {
  const semanticConsistencyResult =
    input.semanticConsistencyResult ??
    (input.semanticConsistencyResolverInput
      ? resolveSemanticConsistency(input.semanticConsistencyResolverInput)
      : undefined);
  const gate = assessSemanticConsistencyPromotionGate({
    subject: input.subject,
    ontologyAffecting: input.ontologyAffecting,
    semanticConsistencyResult,
    attachedResolverRunRefs: input.attachedResolverRunRefs,
  });
  return {
    ...gate,
    ...(semanticConsistencyResult ? { semanticConsistencyResult } : {}),
  };
}

export default async function handler(
  rawArgs: unknown,
): Promise<SemanticConsistencyGateHandlerResult> {
  assertInput(rawArgs);
  return pmSemanticConsistencyGate(rawArgs);
}
