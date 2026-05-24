// palantir-mini — non-programmer clarification guard rails for AIP #3.

import type { SemanticClarificationQuestion } from "../lead-intent/contracts";
import type { Layer0IntentBridge } from "./intent-bridge";

export type ClarificationGuardId =
  | "R1_PLAIN_LANGUAGE"
  | "R2_RECOMMENDATION"
  | "R3_CONSEQUENCE"
  | "R4_ROUND_SIZE"
  | "R5_OPTIONS"
  | "R6_REVERSIBILITY";

export interface ClarificationGuardViolation {
  guardId: ClarificationGuardId;
  questionId?: string;
  message: string;
}

export interface ClarificationGuardResult {
  ok: boolean;
  violations: ClarificationGuardViolation[];
}

export interface Layer0ReadinessGrade {
  verdict: "pass" | "fail";
  blockingReasons: string[];
  warnings: string[];
}

const PALANTIR_TERMS = /\b(ObjectType|ActionType|LinkType|Function|Ontology Proposal|Application State|Retrieval Context)\b/;

export function validateClarificationGuardRails(
  questions: readonly SemanticClarificationQuestion[],
): ClarificationGuardResult {
  const violations: ClarificationGuardViolation[] = [];

  if (questions.length < 1 || questions.length > 3) {
    violations.push({
      guardId: "R4_ROUND_SIZE",
      message: "Workflow decision rounds must contain 1-3 material decisions.",
    });
  }

  for (const question of questions) {
    const spec = question.decisionSpec;
    if (
      PALANTIR_TERMS.test(spec.plainKoreanSummary) &&
      question.plainLanguageExplanation.trim().length < 40
    ) {
      violations.push({
        guardId: "R1_PLAIN_LANGUAGE",
        questionId: question.questionId,
        message: "Palantir terms require a plain-language explanation of at least 40 characters.",
      });
    }
    if (!spec.choices.some((choice) => choice.choiceId === spec.recommendedChoiceId)) {
      violations.push({
        guardId: "R2_RECOMMENDATION",
        questionId: question.questionId,
        message: "Every workflow decision must include a recommended choice.",
      });
    }
    if (question.whatWillNotHappen.length === 0) {
      violations.push({
        guardId: "R3_CONSEQUENCE",
        questionId: question.questionId,
        message: "Every clarification question must explain at least one thing that will not happen.",
      });
    }
    if (spec.choices.length > 4) {
      violations.push({
        guardId: "R5_OPTIONS",
        questionId: question.questionId,
        message: "Workflow decision choices must not exceed four options.",
      });
    }
  }

  return { ok: violations.length === 0, violations };
}

export function gradeLayer0Readiness(args: {
  bridge: Layer0IntentBridge;
  semanticIntentApproved: boolean;
  digitalTwinReady: boolean;
}): Layer0ReadinessGrade {
  const blockingReasons: string[] = [];
  const warnings: string[] = [];

  if (args.bridge.requiredAxes[0] !== "aip-3-context-engineering") {
    blockingReasons.push("AIP #3 Context Engineering axis is not declared as the first required Layer 0 axis.");
  }
  if (!args.bridge.requiredAxes.includes("aip-4-ontology")) {
    blockingReasons.push("AIP #4 Ontology axis is missing from the required Layer 0 axes.");
  }
  if (!args.semanticIntentApproved) {
    blockingReasons.push("SemanticIntentContract is not approved; user-Lead intent bridge is still open.");
  }
  if (!args.digitalTwinReady) {
    blockingReasons.push("DigitalTwinChangeContract is not ready; approved meaning has not been translated for ontology execution.");
  }
  if (!args.bridge.directionalAxes.includes("aip-5-vector-compute-tool-services")) {
    warnings.push("AIP #5 tool/context boundary is not represented as a directional axis.");
  }
  if (!args.bridge.directionalAxes.includes("aip-7-agent-lifecycle")) {
    warnings.push("AIP #7 eval/lifecycle direction is not represented as a directional axis.");
  }

  return {
    verdict: blockingReasons.length === 0 ? "pass" : "fail",
    blockingReasons,
    warnings,
  };
}
