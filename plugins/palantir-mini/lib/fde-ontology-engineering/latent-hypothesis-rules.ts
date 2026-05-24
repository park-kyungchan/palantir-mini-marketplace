import { buildLatentIntentHypothesisV2 } from "./hypothesis-v2";
import {
  instantiateLatentHypothesisTemplate,
  LATENT_HYPOTHESIS_TEMPLATES,
  type LatentHypothesisTemplate,
} from "./latent-hypothesis-templates";
import type {
  LatentIntentFamily,
  LatentIntentHypothesis,
} from "./types";
import type { FDEImplicitIntentSignal } from "./implicit-intent";

export interface LatentHypothesisRule {
  readonly ruleId: string;
  readonly family: LatentIntentFamily;
  readonly readinessRequirementIds: readonly string[];
  readonly matches: (input: FDEImplicitIntentSignal) => boolean;
  readonly build: (input: FDEImplicitIntentSignal) => LatentIntentHypothesis;
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function slug(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "latent";
}

function summary(input: FDEImplicitIntentSignal): string {
  return cleanText(input.sanitizedTurnSummary);
}

function textCorpus(input: FDEImplicitIntentSignal): string {
  return [
    input.sanitizedTurnSummary,
    input.mission?.useCaseName,
    input.mission?.operationalDecision,
    input.mission?.decisionOwnerRole,
    input.evidence?.evidenceDefinition,
    ...(input.objectNames ?? []),
    ...(input.linkNames ?? []),
    ...(input.actionNames ?? []),
    ...(input.functionNames ?? []),
    ...(input.chatbotContextNames ?? []),
  ].filter((value): value is string => typeof value === "string").join(" ");
}

function includesAny(input: FDEImplicitIntentSignal, patterns: readonly RegExp[]): boolean {
  const corpus = textCorpus(input);
  return patterns.some((pattern) => pattern.test(corpus));
}

function sourceRefs(input: FDEImplicitIntentSignal): readonly string[] {
  return input.sourceRefs ?? [];
}

function evidenceNeeded(input: FDEImplicitIntentSignal, fallback: readonly string[]): readonly string[] {
  const explicit = [
    ...(input.evidence?.observableSignals ?? []),
    ...(input.evidence?.sourceArtifactRefs ?? []),
  ].filter((value) => value.trim().length > 0);
  return explicit.length > 0 ? explicit : fallback;
}

function hypothesis(input: {
  readonly ruleId: string;
  readonly template: LatentHypothesisTemplate;
  readonly summary: string;
  readonly possibleObjects?: readonly string[];
  readonly possibleLinks?: readonly string[];
  readonly possibleActions?: readonly string[];
  readonly possibleFunctions?: readonly string[];
  readonly evidenceNeeded?: readonly string[];
  readonly sourceRefs?: readonly string[];
}): LatentIntentHypothesis {
  const instantiated = instantiateLatentHypothesisTemplate({
    template: input.template,
    summary: input.summary,
    evidenceNeeded: input.evidenceNeeded,
    sourceRefs: input.sourceRefs,
    possibleObjects: input.possibleObjects,
    possibleLinks: input.possibleLinks,
    possibleActions: input.possibleActions,
    possibleFunctions: input.possibleFunctions,
  });
  return {
    ...buildLatentIntentHypothesisV2({
      hypothesisId: `latent-rule:${input.ruleId}:${slug(instantiated.plainLanguage)}`,
      ruleId: input.ruleId,
      templateId: instantiated.templateId,
      family: input.template.family,
      plainLanguage: instantiated.plainLanguage,
      confidence: 0.74,
      decisionAxis: instantiated.decisionAxis,
      whyLeadInferredThis: instantiated.whyLeadInferredThis,
      whatUserMayNotHaveNoticed: instantiated.whatUserMayNotHaveNoticed,
      recommendedDefault: instantiated.recommendedDefault,
      riskIfWrong: instantiated.riskIfWrong,
      whatWillNotHappenIfAccepted: instantiated.whatWillNotHappenIfAccepted,
      possibleObjects: instantiated.ontologyImplication.possibleObjects,
      possibleLinks: instantiated.ontologyImplication.possibleLinks,
      possibleActions: instantiated.ontologyImplication.possibleActions,
      possibleFunctions: instantiated.ontologyImplication.possibleFunctions,
      evidenceNeeded: instantiated.evidenceNeeded,
      sourceRefs: instantiated.sourceRefs,
      readinessRequirementIds: instantiated.readinessRequirementIds,
    }),
    ruleId: input.ruleId,
  };
}

function fromTemplate(
  input: FDEImplicitIntentSignal,
  ruleId: string,
  template: LatentHypothesisTemplate,
  overrides: Omit<Parameters<typeof hypothesis>[0], "ruleId" | "template" | "summary"> = {},
): LatentIntentHypothesis {
  return hypothesis({
    ruleId,
    template,
    summary: summary(input),
    ...overrides,
  });
}

export const LATENT_HYPOTHESIS_RULES: readonly LatentHypothesisRule[] = [
  {
    ruleId: "thinking-step-evidence-before-mastery",
    family: "math-thinking-evidence",
    readinessRequirementIds: ["evidence", "latent-intent-decision", "evidence-classification"],
    matches: (input) => includesAny(input, [
      /학생.*(?:막히|풀이|생각|추론|reasoning|stuck|thinking step)/i,
      /(?:어디서|where).*(?:막히|stuck)/i,
      /(?:풀이 과정|사고 과정|problem[- ]solving|reasoning evidence)/i,
    ]),
    build: (input) => fromTemplate(input, "thinking-step-evidence-before-mastery",
      LATENT_HYPOTHESIS_TEMPLATES.thinkingStepEvidenceBeforeMastery, {
      evidenceNeeded: evidenceNeeded(input, [
        "observable student solving step",
        "reasoning evidence before mastery judgment",
      ]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "explanation-label-before-generation",
    family: "instructional-explanation-quality",
    readinessRequirementIds: ["evidence", "latent-intent-decision", "non-goals"],
    matches: (input) => includesAny(input, [
      /AI.*(?:설명|explanation|generate|generation|lesson|lecture)/i,
      /(?:좋은|better|quality).*(?:설명|explanation)/i,
      /(?:판서|boardwork|lecture structure|explanation flow)/i,
    ]),
    build: (input) => fromTemplate(input, "explanation-label-before-generation",
      LATENT_HYPOTHESIS_TEMPLATES.explanationLabelBeforeGeneration, {
      evidenceNeeded: evidenceNeeded(input, [
        "sample explanation",
        "boardwork sequence",
        "teacher intended learning point",
      ]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "MYP-objective-alignment-is-reference-not-SSoT",
    family: "curriculum-reference-boundary",
    readinessRequirementIds: ["evidence-classification", "non-goals", "latent-intent-decision"],
    matches: (input) => includesAny(input, [
      /\bMYP\b.*(?:objective|criterion|criteria|A-D|alignment|rubric|guide)/i,
      /(?:IB|curriculum).*(?:objective|criterion|criteria|rubric|guide)/i,
      /(?:criteria A|criteria B|criteria C|criteria D)/i,
    ]),
    build: (input) => fromTemplate(input, "MYP-objective-alignment-is-reference-not-SSoT",
      LATENT_HYPOTHESIS_TEMPLATES.mypObjectiveAlignmentReferenceNotSsot, {
      evidenceNeeded: evidenceNeeded(input, [
        "reference_only/not_promoted curriculum classification",
        "approved promotion decision if used as authority",
      ]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "real-life-context-before-3D-runtime",
    family: "technology-surface",
    readinessRequirementIds: ["mission", "evidence", "latent-intent-decision", "application-state"],
    matches: (input) => includesAny(input, [
      /(?:3D|three\.?js|webgl|canvas|scene|renderer).*(?:real[- ]life|context|activity|활동|맥락)/i,
      /(?:real[- ]life|실생활|맥락).*(?:3D|scene|activity|renderer|runtime)/i,
    ]),
    build: (input) => fromTemplate(input, "real-life-context-before-3D-runtime",
      LATENT_HYPOTHESIS_TEMPLATES.realLifeContextBefore3dRuntime, {
      evidenceNeeded: evidenceNeeded(input, [
        "real-life context definition",
        "evidence capture surface",
        "3D runtime validation",
      ]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "communication-criterion-before-video-output",
    family: "instructional-explanation-quality",
    readinessRequirementIds: ["evidence", "evaluation", "latent-intent-decision"],
    matches: (input) => includesAny(input, [
      /(?:video|영상|lecture output|media).*(?:communication|communicate|criterion|clarity|설명)/i,
      /(?:communication|communicate|criterion|clarity|전달).*(?:video|영상|output|media)/i,
    ]),
    build: (input) => fromTemplate(input, "communication-criterion-before-video-output",
      LATENT_HYPOTHESIS_TEMPLATES.communicationCriterionBeforeVideoOutput, {
      evidenceNeeded: evidenceNeeded(input, [
        "communication criterion",
        "sample explanation",
        "validation rubric",
      ]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "action-writeback-requires-submission-criteria",
    family: "action-writeback-design",
    readinessRequirementIds: ["action", "submission-criteria", "governance"],
    matches: (input) => includesAny(input, [
      /(?:action|writeback|update|submit|commit|publish|approve).*(?:criteria|criterion|submission|승인|기준)/i,
      /(?:학생|student).*(?:제출|submit|writeback|update|publish)/i,
    ]),
    build: (input) => fromTemplate(input, "action-writeback-requires-submission-criteria",
      LATENT_HYPOTHESIS_TEMPLATES.actionWritebackRequiresSubmissionCriteria, {
      evidenceNeeded: evidenceNeeded(input, [
        "submission criteria",
        "approval boundary",
        "writeback risk classification",
      ]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "student-facing-output-requires-approval-and-eval",
    family: "governance-eval-design",
    readinessRequirementIds: ["evaluation", "governance", "submission-criteria"],
    matches: (input) => includesAny(input, [
      /(?:student-facing|학생.*(?:제공|배포)|learner-facing|handout|feedback).*(?:output|material|자료|answer|publish|eval|approval)/i,
      /(?:publish|배포|제공).*(?:student|학생|learner|학습자)/i,
    ]),
    build: (input) => fromTemplate(input, "student-facing-output-requires-approval-and-eval",
      LATENT_HYPOTHESIS_TEMPLATES.studentFacingOutputRequiresApprovalAndEval, {
      evidenceNeeded: evidenceNeeded(input, [
        "human approval",
        "validation pack",
        "student-facing risk checklist",
      ]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "chatbot-studio.application-state-first",
    family: "chatbot-studio-design",
    readinessRequirementIds: ["application-state", "evidence", "latent-intent-decision"],
    matches: (input) => includesAny(input, [
      /(?:Chatbot Studio|chatbot|assistant).*(?:application state|retrieval context|personal|student state|상태|안내)/i,
      /(?:application state|retrieval context|학생 상태).*(?:chatbot|assistant|Chatbot Studio|안내)/i,
    ]),
    build: (input) => fromTemplate(input, "chatbot-studio.application-state-first",
      LATENT_HYPOTHESIS_TEMPLATES.chatbotApplicationStateBeforePersonalization, {
      evidenceNeeded: evidenceNeeded(input, [
        "application state variable",
        "retrieval context source",
        "user decision boundary",
      ]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "korean-education.instruction-quality",
    family: "instructional-explanation-quality",
    readinessRequirementIds: ["mission", "evidence", "latent-intent-decision"],
    matches: (input) => includesAny(input, [/한국|수업|학습|학생|교사|설명|평가|문제|교육/]),
    build: (input) => fromTemplate(input, "korean-education.instruction-quality",
      LATENT_HYPOTHESIS_TEMPLATES.koreanEducationInstructionQuality, {
      evidenceNeeded: evidenceNeeded(input, ["student-visible reasoning evidence"]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "myp.curriculum-reference-boundary",
    family: "curriculum-reference-boundary",
    readinessRequirementIds: ["evidence-classification", "non-goals", "latent-intent-decision"],
    matches: (input) => includesAny(input, [/\bMYP\b/i, /\bIB\b/i, /curriculum|criterion|criteria|rubric|unit/i]),
    build: (input) => fromTemplate(input, "myp.curriculum-reference-boundary",
      LATENT_HYPOTHESIS_TEMPLATES.mypCurriculumReferenceBoundary, {
      evidenceNeeded: evidenceNeeded(input, ["reference_only/not_promoted evidence classification"]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "frontend.runtime-surface",
    family: "technology-surface",
    readinessRequirementIds: ["mission", "latent-intent-decision"],
    matches: (input) => includesAny(input, [/frontend|runtime|workbench|component|view|panel|card|UI/i]),
    build: (input) => fromTemplate(input, "frontend.runtime-surface",
      LATENT_HYPOTHESIS_TEMPLATES.frontendRuntimeSurface, {
      evidenceNeeded: evidenceNeeded(input, ["runtime surface evidence", "validation command"]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "runtime.3d-surface",
    family: "technology-surface",
    readinessRequirementIds: ["mission", "latent-intent-decision", "application-state"],
    matches: (input) => includesAny(input, [
      /\b3D\b/i,
      /three\.?js|webgl|canvas|scene|viewport|renderer|r3f|orbit/i,
    ]),
    build: (input) => fromTemplate(input, "runtime.3d-surface",
      LATENT_HYPOTHESIS_TEMPLATES.threeDimensionalRuntimeSurface, {
      evidenceNeeded: evidenceNeeded(input, ["3D runtime surface evidence", "viewport/render validation command"]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "materials.data-authority",
    family: "data-authority",
    readinessRequirementIds: ["evidence", "evidence-classification", "non-goals"],
    matches: (input) => includesAny(input, [/material|worksheet|slide|document|artifact|source|reference|자료|교재|문서/i]),
    build: (input) => fromTemplate(input, "materials.data-authority",
      LATENT_HYPOTHESIS_TEMPLATES.materialsDataAuthority, {
      evidenceNeeded: evidenceNeeded(input, ["source authority classification"]),
      sourceRefs: sourceRefs(input),
    }),
  },
  {
    ruleId: "generic.prompt-mission-decision",
    family: "mission-decision",
    readinessRequirementIds: ["mission", "latent-intent-decision"],
    matches: (input) => includesAny(input, [/prompt|intent|meaning|clarify|question|decision|mission/i]),
    build: (input) => fromTemplate(input, "generic.prompt-mission-decision",
      LATENT_HYPOTHESIS_TEMPLATES.genericPromptMissionDecision, {
      evidenceNeeded: evidenceNeeded(input, ["accepted mission decision"]),
      sourceRefs: sourceRefs(input),
    }),
  },
];

export function deriveLatentHypothesisRuleMatches(
  input: FDEImplicitIntentSignal,
): readonly LatentIntentHypothesis[] {
  const byFamilyAndRule = new Map<string, LatentIntentHypothesis>();
  for (const rule of LATENT_HYPOTHESIS_RULES) {
    if (!rule.matches(input)) continue;
    const match = rule.build(input);
    byFamilyAndRule.set(`${rule.family}:${rule.ruleId}`, match);
  }
  return Array.from(byFamilyAndRule.values());
}
