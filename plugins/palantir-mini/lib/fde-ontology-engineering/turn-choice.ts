import type { LatentIntentStatus } from "./types";

export type FDEOntologyTurnChoiceKind = "accept" | "reject" | "defer" | "answer";

export interface FDEOntologyTurnChoiceApplication {
  readonly choiceId?: string;
  readonly kind: FDEOntologyTurnChoiceKind;
  readonly targetHypothesisId?: string;
  readonly freeTextAnswer?: string;
  readonly appliesToRequirementIds?: readonly string[];
  readonly sourceRef?: string;
}

export interface FDEOntologyTurnChoiceResolution {
  readonly acceptedHypothesisIds: readonly string[];
  readonly rejectedHypothesisIds: readonly string[];
  readonly deferredHypothesisIds: readonly string[];
  readonly sanitizedAnswers: readonly string[];
  readonly sourceRefs: readonly string[];
}

function unique(values: readonly (string | undefined)[]): readonly string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.trim().length > 0
  )));
}

export function statusFromChoiceKind(kind: FDEOntologyTurnChoiceKind): LatentIntentStatus | undefined {
  switch (kind) {
    case "accept":
      return "accepted";
    case "reject":
      return "rejected";
    case "defer":
      return "deferred";
    case "answer":
      return undefined;
  }
}

export function resolveFDEOntologyTurnChoiceApplications(
  choices: readonly FDEOntologyTurnChoiceApplication[] | undefined,
): FDEOntologyTurnChoiceResolution {
  const accepted: string[] = [];
  const rejected: string[] = [];
  const deferred: string[] = [];
  const answers: string[] = [];
  const refs: string[] = [];

  for (const choice of choices ?? []) {
    if (choice.sourceRef) refs.push(choice.sourceRef);
    const target = choice.targetHypothesisId;
    if (choice.freeTextAnswer?.trim()) answers.push(choice.freeTextAnswer.trim());
    if (!target) continue;
    switch (choice.kind) {
      case "accept":
        accepted.push(target);
        break;
      case "reject":
        rejected.push(target);
        break;
      case "defer":
        deferred.push(target);
        break;
      case "answer":
        break;
    }
  }

  return {
    acceptedHypothesisIds: unique(accepted),
    rejectedHypothesisIds: unique(rejected),
    deferredHypothesisIds: unique(deferred),
    sanitizedAnswers: unique(answers),
    sourceRefs: unique(refs),
  };
}
