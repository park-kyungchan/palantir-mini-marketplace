import type {
  LatentIntentFamily,
  LatentIntentHypothesis,
  LatentIntentStatus,
} from "./types";

export interface LatentIntentHypothesisV2Input {
  readonly hypothesisId: string;
  readonly ruleId?: string;
  readonly templateId?: string;
  readonly family: LatentIntentFamily;
  readonly plainLanguage: string;
  readonly status?: LatentIntentStatus;
  readonly confidence?: number;
  readonly decisionAxis?: LatentIntentHypothesis["decisionAxis"];
  readonly whyLeadInferredThis?: string;
  readonly whatUserMayNotHaveNoticed?: string;
  readonly recommendedDefault?: string;
  readonly riskIfWrong?: string;
  readonly whatWillNotHappenIfAccepted?: readonly string[];
  readonly possibleObjects?: readonly string[];
  readonly possibleLinks?: readonly string[];
  readonly possibleActions?: readonly string[];
  readonly possibleFunctions?: readonly string[];
  readonly evidenceNeeded?: readonly string[];
  readonly sourceRefs?: readonly string[];
  readonly readinessRequirementIds?: readonly string[];
}

function unique(values: readonly string[] | undefined): readonly string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

export function buildLatentIntentHypothesisV2(
  input: LatentIntentHypothesisV2Input,
): LatentIntentHypothesis {
  return {
    hypothesisId: input.hypothesisId,
    status: input.status ?? "inferred",
    ...(input.ruleId ? { ruleId: input.ruleId } : {}),
    ...(input.templateId ? { templateId: input.templateId } : {}),
    family: input.family,
    confidence: input.confidence,
    decisionAxis: input.decisionAxis,
    readinessRequirementIds: unique(input.readinessRequirementIds),
    plainLanguage: input.plainLanguage,
    whyLeadInferredThis:
      input.whyLeadInferredThis ?? "Derived from structured FDE ontology engineering signals.",
    whatUserMayNotHaveNoticed:
      input.whatUserMayNotHaveNoticed ??
      "This hypothesis may imply new ontology, application-state, writeback, or evaluation surfaces.",
    recommendedDefault:
      input.recommendedDefault ?? "Keep as deferred until explicitly accepted into the FDE session.",
    riskIfWrong:
      input.riskIfWrong ??
      "A later SemanticIntentContract could encode the wrong object, action, function, or runtime boundary.",
    whatWillNotHappenIfAccepted: unique(input.whatWillNotHappenIfAccepted ?? [
      "The hypothesis alone will not authorize mutation.",
      "Raw prompt text will not be persisted.",
    ]),
    ontologyImplication: {
      possibleObjects: unique(input.possibleObjects),
      possibleLinks: unique(input.possibleLinks),
      possibleActions: unique(input.possibleActions),
      possibleFunctions: unique(input.possibleFunctions),
    },
    evidenceNeeded: unique(input.evidenceNeeded),
    sourceRefs: unique(input.sourceRefs),
  };
}
