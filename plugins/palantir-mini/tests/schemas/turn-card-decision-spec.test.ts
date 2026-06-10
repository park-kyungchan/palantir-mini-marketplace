// Tests: SIC/DTC consolidation (v1.83.0) — canonical SemanticClarificationQuestion
// gains OPTIONAL additive fields (decisionSpec + defaultIfUserAcceptsRecommendation)
// plus the promoted TurnCardDecisionSpec primitive. Proves:
//   1. a clarification literal WITHOUT the new optional fields still satisfies the
//      type (back-compat for pre-consolidation contracts), and
//   2. a clarification WITH a decisionSpec compiles against the promoted primitive.
// Importing via #schemas/* also makes the new primitive reachable for `tsc --noEmit`
// (the snapshot dir is only typechecked transitively through tests/**).

import { test, expect } from "bun:test";
import type { SemanticClarificationQuestion } from "#schemas/ontology/primitives/semantic-intent-contract";
import type {
  TurnCardDecisionSpec,
  TurnCardDecisionChoice,
} from "#schemas/ontology/primitives/turn-card-decision-spec";

test("clarification without the new optional fields still satisfies the type (back-compat)", () => {
  const legacy: SemanticClarificationQuestion = {
    questionId: "semantic-intent.confirm-operational-meaning",
    materiality: "blocking",
    prompt: "Confirm the approved operational meaning before routing.",
    recommendedAnswer: "Yes — treat the approved meaning as authority.",
    whyItMatters: "The router must not dispatch from privately inferred meaning.",
    requiresUserApproval: true,
    status: "open",
  };

  // prompt + recommendedAnswer remain REQUIRED; the new fields are absent.
  expect(legacy.decisionSpec).toBeUndefined();
  expect(legacy.defaultIfUserAcceptsRecommendation).toBeUndefined();
  expect(legacy.recommendedAnswer.length).toBeGreaterThan(0);
});

test("clarification WITH a decisionSpec compiles against the promoted primitive", () => {
  const recommended: TurnCardDecisionChoice = {
    choiceId: "q1.recommended",
    label: "추천 경계 확인",
    consequence: "Treat the approved user meaning as the authority.",
    recommended: true,
  };
  const decisionSpec: TurnCardDecisionSpec = {
    decisionId: "q1",
    phase: "semantic-intent",
    plainKoreanTitle: "작업 의미 승인",
    plainKoreanSummary: "구현 전에 승인된 의미 계약 변경으로 다룰지 확정합니다.",
    whyItMatters: "Router must not dispatch ontology-affecting execution from inference.",
    recommendedChoiceId: "q1.recommended",
    choices: [recommended],
    evidenceRefs: ["contract:SemanticIntentContract"],
    blocking: true,
    freeTextAllowed: true,
  };

  const enriched: SemanticClarificationQuestion = {
    questionId: "q1",
    materiality: "blocking",
    prompt: "Confirm the approved operational meaning before routing.",
    recommendedAnswer: "Yes — treat the approved meaning as authority.",
    decisionSpec,
    defaultIfUserAcceptsRecommendation:
      "Create an approved SemanticIntentContract before routing implementation.",
    whyItMatters: "The router must not dispatch from privately inferred meaning.",
    requiresUserApproval: true,
    status: "open",
  };

  expect(enriched.decisionSpec?.recommendedChoiceId).toBe("q1.recommended");
  expect(enriched.decisionSpec?.choices[0]?.recommended).toBe(true);
  expect(enriched.defaultIfUserAcceptsRecommendation).toContain("SemanticIntentContract");
});
