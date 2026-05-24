import type {
  ActionTypeCandidate,
  ChatbotContextCandidate,
  EvidenceModel,
  FunctionCandidate,
  LatentIntentHypothesis,
  LeadClarificationQuestion,
  LinkTypeCandidate,
  MissionDecisionModel,
  ObjectTypeCandidate,
} from "./types";
import { deriveLatentHypothesisRuleMatches } from "./latent-hypothesis-rules";

export interface FDEImplicitIntentSignal {
  readonly sanitizedTurnSummary: string;
  readonly mission?: Partial<MissionDecisionModel>;
  readonly evidence?: Partial<EvidenceModel>;
  readonly objectNames?: readonly string[];
  readonly linkNames?: readonly string[];
  readonly actionNames?: readonly string[];
  readonly functionNames?: readonly string[];
  readonly chatbotContextNames?: readonly string[];
  readonly sourceRefs?: readonly string[];
}

export interface FDEImplicitIntentPatch {
  readonly latentHypotheses: readonly LatentIntentHypothesis[];
  readonly missionModel?: MissionDecisionModel;
  readonly evidenceModel?: EvidenceModel;
  readonly objectCandidates: readonly ObjectTypeCandidate[];
  readonly linkCandidates: readonly LinkTypeCandidate[];
  readonly actionCandidates: readonly ActionTypeCandidate[];
  readonly functionCandidates: readonly FunctionCandidate[];
  readonly chatbotContextCandidates: readonly ChatbotContextCandidate[];
  readonly unresolvedQuestions: readonly LeadClarificationQuestion[];
  readonly sourceRefs: readonly string[];
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function slug(value: string): string {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "candidate";
}

function uniqueStrings(values: readonly string[] | undefined): readonly string[] {
  return Array.from(new Set((values ?? []).map(cleanText).filter((value) => value.length > 0)));
}

function maybeHypothesis(input: FDEImplicitIntentSignal): readonly LatentIntentHypothesis[] {
  const summary = cleanText(input.sanitizedTurnSummary);
  if (summary.length === 0) return [];

  const possibleObjects = uniqueStrings(input.objectNames);
  const possibleLinks = uniqueStrings(input.linkNames);
  const possibleActions = uniqueStrings(input.actionNames);
  const possibleFunctions = uniqueStrings(input.functionNames);

  return [{
    hypothesisId: `latent:${slug(summary)}`,
    status: "inferred",
    ruleId: "fallback.structured-signal",
    family: possibleActions.length > 0
      ? "action-writeback-design"
      : input.chatbotContextNames && input.chatbotContextNames.length > 0
        ? "chatbot-studio-design"
        : "framework-discovery",
    confidence: 0.65,
    readinessRequirementIds: ["mission", "latent-intent-decision"],
    decisionAxis: possibleActions.length > 0
      ? "action"
      : input.chatbotContextNames && input.chatbotContextNames.length > 0
        ? "application-state"
        : "data",
    plainLanguage: summary,
    whyLeadInferredThis: "Derived from the sanitized turn summary and structured candidate signals.",
    whatUserMayNotHaveNoticed: "This may imply ontology objects, links, actions, functions, or chatbot context that need explicit acceptance.",
    recommendedDefault: "Keep as deferred until the user or lead accepts it into the session state.",
    riskIfWrong: "A semantic contract could name the wrong operational entities or writeback behavior.",
    whatWillNotHappenIfAccepted: [
      "Raw prompt text will not be persisted in the session state.",
      "The hypothesis alone will not authorize ontology mutation.",
    ],
    ontologyImplication: {
      possibleObjects,
      possibleLinks,
      possibleActions,
      possibleFunctions,
    },
    evidenceNeeded: uniqueStrings([
      ...(input.evidence?.observableSignals ?? []),
      ...(input.evidence?.sourceArtifactRefs ?? []),
    ]),
    sourceRefs: uniqueStrings(input.sourceRefs),
  }];
}

function missionModel(input: FDEImplicitIntentSignal): MissionDecisionModel | undefined {
  if (input.mission === undefined) return undefined;
  return {
    useCaseName: input.mission.useCaseName,
    operationalDecision: input.mission.operationalDecision,
    decisionOwnerRole: input.mission.decisionOwnerRole,
    successSignals: uniqueStrings(input.mission.successSignals),
  };
}

function evidenceModel(input: FDEImplicitIntentSignal): EvidenceModel | undefined {
  if (input.evidence === undefined) return undefined;
  return {
    evidenceDefinition: input.evidence.evidenceDefinition,
    observableSignals: uniqueStrings(input.evidence.observableSignals),
    sourceArtifactRefs: uniqueStrings(input.evidence.sourceArtifactRefs),
    missingEvidenceQuestions: uniqueStrings(input.evidence.missingEvidenceQuestions),
  };
}

function objectCandidates(input: FDEImplicitIntentSignal): readonly ObjectTypeCandidate[] {
  return uniqueStrings(input.objectNames).map((plainName) => ({
    candidateId: `object:${slug(plainName)}`,
    plainName,
    whyItMayMatter: "Candidate object type surfaced during FDE ontology engineering.",
    evidenceRefs: uniqueStrings(input.sourceRefs),
  }));
}

function linkCandidates(input: FDEImplicitIntentSignal): readonly LinkTypeCandidate[] {
  return uniqueStrings(input.linkNames).map((plainName) => ({
    candidateId: `link:${slug(plainName)}`,
    plainName,
    businessMeaning: "Candidate traversable relationship surfaced during FDE ontology engineering.",
    evidenceRefs: uniqueStrings(input.sourceRefs),
  }));
}

function actionCandidates(input: FDEImplicitIntentSignal): readonly ActionTypeCandidate[] {
  return uniqueStrings(input.actionNames).map((plainName) => ({
    candidateId: `action:${slug(plainName)}`,
    plainName,
    operationalIntent: "Candidate writeback or decision-recording action surfaced during FDE ontology engineering.",
    writebackRisk: "medium",
    submissionCriteria: uniqueStrings(input.sourceRefs),
    evidenceRefs: uniqueStrings(input.sourceRefs),
  }));
}

function functionCandidates(input: FDEImplicitIntentSignal): readonly FunctionCandidate[] {
  return uniqueStrings(input.functionNames).map((plainName) => ({
    candidateId: `function:${slug(plainName)}`,
    plainName,
    logicIntent: "Candidate reusable business logic surfaced during FDE ontology engineering.",
    deterministic: true,
    evidenceRefs: uniqueStrings(input.sourceRefs),
  }));
}

function chatbotContextCandidates(input: FDEImplicitIntentSignal): readonly ChatbotContextCandidate[] {
  return uniqueStrings(input.chatbotContextNames).map((plainName) => ({
    candidateId: `chatbot-context:${slug(plainName)}`,
    plainName,
    applicationStateNeed: "Candidate Chatbot Studio application state surfaced during FDE ontology engineering.",
    evidenceRefs: uniqueStrings(input.sourceRefs),
  }));
}

export function deriveImplicitIntentPatch(input: FDEImplicitIntentSignal): FDEImplicitIntentPatch {
  const ruleHypotheses = deriveLatentHypothesisRuleMatches(input);
  const unresolvedQuestions: LeadClarificationQuestion[] = [];
  if (input.mission === undefined) {
    unresolvedQuestions.push({
      questionId: "fde.mission-decision.required",
      phase: "mission-decision",
      plainQuestion: "What operational decision should this ontology engineering session improve?",
      whyItMatters: "The SIC must name the mission before objects, actions, or functions are promoted.",
      recommendedDefault: "Defer ontology promotion until the operational decision is explicit.",
      blocking: true,
    });
  }

  return {
    latentHypotheses: ruleHypotheses.length > 0 ? ruleHypotheses : maybeHypothesis(input),
    missionModel: missionModel(input),
    evidenceModel: evidenceModel(input),
    objectCandidates: objectCandidates(input),
    linkCandidates: linkCandidates(input),
    actionCandidates: actionCandidates(input),
    functionCandidates: functionCandidates(input),
    chatbotContextCandidates: chatbotContextCandidates(input),
    unresolvedQuestions,
    sourceRefs: uniqueStrings(input.sourceRefs),
  };
}
