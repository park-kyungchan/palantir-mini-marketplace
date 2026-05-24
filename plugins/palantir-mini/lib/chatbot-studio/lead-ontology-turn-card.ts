import type {
  FDEOntologyEngineeringSession,
  FDESemanticIntentContext,
  LatentIntentHypothesis,
} from "../fde-ontology-engineering/types";
import type {
  FDEOntologyTurnChoiceApplication,
  FDEOntologyTurnChoiceKind,
} from "../fde-ontology-engineering/turn-choice";
import {
  gradeFDEOntologyEngineeringSession,
  type FDEOntologyEngineeringSessionGrade,
} from "../fde-ontology-engineering/grade-session";

export const LEAD_ONTOLOGY_TURN_CARD_SCHEMA_VERSION =
  "palantir-mini/lead-ontology-turn-card/v1" as const;
export const LEAD_ONTOLOGY_TURN_CARD_V2_SCHEMA_VERSION =
  "palantir-mini/lead-ontology-turn-card/v2" as const;
export const LEAD_ONTOLOGY_TURN_CARD_V3_SCHEMA_VERSION =
  "palantir-mini/lead-ontology-turn-card/v3" as const;

export interface LeadOntologyTurnCard {
  readonly schemaVersion: typeof LEAD_ONTOLOGY_TURN_CARD_SCHEMA_VERSION;
  readonly cardId: string;
  readonly sessionId: string;
  readonly phase: FDEOntologyEngineeringSession["phase"];
  readonly title: string;
  readonly plainSummary: string;
  readonly readiness: FDEOntologyEngineeringSessionGrade;
  readonly semanticIntentContextRef?: string;
  readonly choices: readonly {
    readonly label: string;
    readonly consequence: string;
  }[];
  readonly nextActions: readonly string[];
  readonly mutationAuthorizedFromCard: false;
}

export interface LeadOntologyTurnCardV2Choice {
  readonly choiceId: string;
  readonly kind: FDEOntologyTurnChoiceKind;
  readonly label: string;
  readonly consequence: string;
  readonly targetHypothesisId?: string;
  readonly appliesToRequirementIds: readonly string[];
  readonly ifAccepted: string;
  readonly ifRejected: string;
  readonly ifDeferred: string;
  readonly affectsSemanticIntent: boolean;
  readonly affectsDtc: boolean;
  readonly contextEngineeringDomain:
    | "data"
    | "logic"
    | "action"
    | "governance"
    | "application-state"
    | "evidence";
  readonly internalAction: FDEOntologyTurnChoiceApplication;
}

export interface LeadOntologyTurnCardV2 {
  readonly schemaVersion: typeof LEAD_ONTOLOGY_TURN_CARD_V2_SCHEMA_VERSION;
  readonly cardId: string;
  readonly sessionId: string;
  readonly phase: FDEOntologyEngineeringSession["phase"];
  readonly title: string;
  readonly whatIUnderstand: readonly string[];
  readonly inferredButUnconfirmed: readonly string[];
  readonly recommendedDefaults: readonly string[];
  readonly whatWillNotHappen: readonly string[];
  readonly blockingQuestions: readonly string[];
  readonly stateEffectPreview: readonly string[];
  readonly readyForSemanticIntentContract: boolean;
  readonly readyForDtc: boolean;
  readonly readiness: FDEOntologyEngineeringSessionGrade;
  readonly semanticIntentContextRef?: string;
  readonly choices: readonly LeadOntologyTurnCardV2Choice[];
  readonly nextActions: readonly string[];
  readonly mutationAuthorizedFromCard: false;
}

export type LeadContextDomainV3 =
  | "DATA"
  | "LOGIC"
  | "ACTION"
  | "GOVERNANCE"
  | "TECHNOLOGY";

export interface LeadHypothesisPreview {
  readonly hypothesisId: string;
  readonly status: LatentIntentHypothesis["status"];
  readonly family?: LatentIntentHypothesis["family"];
  readonly decisionAxis?: LatentIntentHypothesis["decisionAxis"];
  readonly plainLanguage: string;
  readonly whyLeadInferredThis: string;
  readonly whatUserMayNotHaveNoticed: string;
  readonly recommendedDefault: string;
  readonly riskIfWrong: string;
  readonly whatWillNotHappenIfAccepted: readonly string[];
  readonly ontologyImplication: LatentIntentHypothesis["ontologyImplication"];
  readonly evidenceNeeded: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly contextEngineeringDomains: readonly LeadContextDomainV3[];
}

export interface LeadTurnChoiceEffect {
  readonly ifAccepted: string;
  readonly ifRejected: string;
  readonly ifDeferred: string;
  readonly affectsSemanticIntent: boolean;
  readonly affectsDtc: boolean;
  readonly contextEngineeringDomains: readonly LeadContextDomainV3[];
}

export interface LeadOntologyTurnCardV3Choice {
  readonly choiceId: string;
  readonly kind: FDEOntologyTurnChoiceKind;
  readonly label: string;
  readonly consequence: string;
  readonly targetHypothesisId: string;
  readonly appliesToRequirementIds: readonly string[];
  readonly effect: LeadTurnChoiceEffect;
  readonly internalAction: FDEOntologyTurnChoiceApplication;
}

export interface LeadOntologyTurnCardV3 {
  readonly schemaVersion: typeof LEAD_ONTOLOGY_TURN_CARD_V3_SCHEMA_VERSION;
  readonly cardId: string;
  readonly sessionId: string;
  readonly phase: FDEOntologyEngineeringSession["phase"];
  readonly title: string;
  readonly whatIUnderstand: readonly string[];
  readonly hypothesisPreviews: readonly LeadHypothesisPreview[];
  readonly recommendedDefaults: readonly string[];
  readonly whatWillNotHappen: readonly string[];
  readonly blockingQuestions: readonly string[];
  readonly stateEffectPreview: readonly string[];
  readonly readyForSemanticIntentContract: boolean;
  readonly readyForDtc: boolean;
  readonly readiness: FDEOntologyEngineeringSessionGrade;
  readonly semanticIntentContextRef?: string;
  readonly choices: readonly LeadOntologyTurnCardV3Choice[];
  readonly nextActions: readonly string[];
  readonly mutationAuthorizedFromCard: false;
}

function summary(session: FDEOntologyEngineeringSession): string {
  return (
    session.stableSummary?.confirmedIntent ??
    session.stableSummary?.missionSummary ??
    session.confirmedUserGoal ??
    session.userFacingSummary
  );
}

function nextActions(grade: FDEOntologyEngineeringSessionGrade): readonly string[] {
  switch (grade.verdict) {
    case "ready-for-dtc":
      return ["review-dtc-boundary", "run-validation", "record-lineage"];
    case "ready-for-semantic-contract":
      return ["draft-sic-from-fde-context", "review-readiness-profile", "hold-before-mutation"];
    case "reject":
      return ["reopen-mission-decision", "revise-hypotheses", "hold-before-contract"];
    case "continue-turns":
      return ["continue-fde-turns", "capture-evidence", "defer-mutation"];
  }
}

export function buildLeadOntologyTurnCard(input: {
  readonly session: FDEOntologyEngineeringSession;
  readonly semanticIntentContext?: FDESemanticIntentContext;
}): LeadOntologyTurnCard {
  const grade = gradeFDEOntologyEngineeringSession(input.session, {
    readinessProfile: input.session.readinessProfileId,
  });
  return {
    schemaVersion: LEAD_ONTOLOGY_TURN_CARD_SCHEMA_VERSION,
    cardId: `lead-ontology-turn-card:${input.session.sessionId}`,
    sessionId: input.session.sessionId,
    phase: input.session.phase,
    title: "FDE Ontology Turn",
    plainSummary: summary(input.session),
    readiness: grade,
    ...(input.semanticIntentContext?.contextId
      ? { semanticIntentContextRef: input.semanticIntentContext.contextId }
      : {}),
    choices: [
      {
        label: "Accept turn state",
        consequence:
          "Keep the accepted FDE state for SIC/DTC drafting; this does not authorize mutation.",
      },
      {
        label: "Defer hypothesis",
        consequence: "Leave unresolved ontology implications out of the approved contract.",
      },
      {
        label: "Continue FDE turn",
        consequence: "Ask for more evidence or application state before contract drafting.",
      },
    ],
    nextActions: nextActions(grade),
    mutationAuthorizedFromCard: false,
  };
}

function choiceForHypothesis(input: {
  readonly sessionId: string;
  readonly hypothesis: LatentIntentHypothesis;
  readonly kind: FDEOntologyTurnChoiceKind;
  readonly label: string;
  readonly consequence: string;
  readonly requirementIds: readonly string[];
}): LeadOntologyTurnCardV2Choice {
  const choiceId = `lead-card-choice:${input.sessionId}:${input.kind}:${input.hypothesis.hypothesisId}`;
  const contextEngineeringDomain = contextDomainForHypothesis(input.hypothesis);
  const affectsDtc =
    contextEngineeringDomain === "action" ||
    contextEngineeringDomain === "application-state" ||
    contextEngineeringDomain === "governance" ||
    input.hypothesis.ontologyImplication.possibleActions.length > 0;
  return {
    choiceId,
    kind: input.kind,
    label: input.label,
    consequence: input.consequence,
    targetHypothesisId: input.hypothesis.hypothesisId,
    appliesToRequirementIds: input.requirementIds,
    ifAccepted:
      "The hypothesis can feed SIC drafting as an explicit accepted meaning; it still cannot authorize mutation.",
    ifRejected:
      "The hypothesis stays out of the SIC/DTC candidate set and should not drive ontology or runtime defaults.",
    ifDeferred:
      "The hypothesis remains visible as unresolved context for a later FDE turn and blocks silent promotion.",
    affectsSemanticIntent: true,
    affectsDtc,
    contextEngineeringDomain,
    internalAction: {
      choiceId,
      kind: input.kind,
      targetHypothesisId: input.hypothesis.hypothesisId,
      appliesToRequirementIds: input.requirementIds,
      sourceRef: `lead-ontology-turn-card:${input.sessionId}`,
    },
  };
}

function contextDomainForHypothesis(
  hypothesis: LatentIntentHypothesis,
): LeadOntologyTurnCardV2Choice["contextEngineeringDomain"] {
  if (hypothesis.decisionAxis === "application-state") return "application-state";
  if (hypothesis.decisionAxis === "governance") return "governance";
  if (hypothesis.decisionAxis === "action") return "action";
  if (hypothesis.decisionAxis === "logic") return "logic";
  if (hypothesis.decisionAxis === "data") return "data";
  if (
    hypothesis.family === "curriculum-reference-boundary" ||
    hypothesis.family === "governance-boundary" ||
    hypothesis.family === "evidence-policy-design"
  ) return "governance";
  if (
    hypothesis.family === "chatbot-application-state" ||
    hypothesis.family === "chatbot-studio-design" ||
    hypothesis.family === "technology-surface" ||
    hypothesis.ontologyImplication.possibleActions.length > 0
  ) return "application-state";
  if (
    hypothesis.family === "logic-authority" ||
    hypothesis.family === "function-logic-design" ||
    hypothesis.ontologyImplication.possibleFunctions.length > 0
  ) return "logic";
  if (hypothesis.family === "evidence-definition") return "evidence";
  return "data";
}

function addContextDomain(
  domains: Set<LeadContextDomainV3>,
  domain: LeadContextDomainV3,
): void {
  domains.add(domain);
}

function contextDomainsForHypothesisV3(
  hypothesis: LatentIntentHypothesis,
): readonly LeadContextDomainV3[] {
  const domains = new Set<LeadContextDomainV3>();

  switch (hypothesis.decisionAxis) {
    case "application-state":
      addContextDomain(domains, "TECHNOLOGY");
      break;
    case "governance":
      addContextDomain(domains, "GOVERNANCE");
      break;
    case "action":
      addContextDomain(domains, "ACTION");
      break;
    case "logic":
      addContextDomain(domains, "LOGIC");
      break;
    case "data":
      addContextDomain(domains, "DATA");
      break;
  }

  if (
    hypothesis.family === "technology-surface" ||
    hypothesis.family === "chatbot-application-state" ||
    hypothesis.family === "chatbot-studio-design" ||
    hypothesis.family === "runtime-hook-design"
  ) {
    addContextDomain(domains, "TECHNOLOGY");
  }

  if (
    hypothesis.family === "governance-boundary" ||
    hypothesis.family === "governance-eval-design" ||
    hypothesis.family === "evidence-policy-design" ||
    hypothesis.family === "curriculum-reference-boundary"
  ) {
    addContextDomain(domains, "GOVERNANCE");
  }

  if (hypothesis.family === "evidence-definition" || hypothesis.family === "evidence-policy-design") {
    addContextDomain(domains, "DATA");
    addContextDomain(domains, "GOVERNANCE");
  }

  if (
    hypothesis.family === "action-writeback-design" ||
    hypothesis.ontologyImplication.possibleActions.length > 0
  ) {
    addContextDomain(domains, "ACTION");
  }

  if (
    hypothesis.family === "logic-authority" ||
    hypothesis.family === "function-logic-design" ||
    hypothesis.ontologyImplication.possibleFunctions.length > 0
  ) {
    addContextDomain(domains, "LOGIC");
  }

  if (hypothesis.ontologyImplication.possibleObjects.length > 0) {
    addContextDomain(domains, "DATA");
  }

  return domains.size > 0 ? [...domains] : ["DATA"];
}

function unresolvedHypothesesForSession(
  session: FDEOntologyEngineeringSession,
): readonly LatentIntentHypothesis[] {
  const decided = new Set([
    ...session.acceptedHypothesisIds,
    ...session.rejectedHypothesisIds,
    ...(session.deferredHypothesisIds ?? []),
  ]);
  return session.latentHypotheses.filter((hypothesis) =>
    !decided.has(hypothesis.hypothesisId) && hypothesis.status === "inferred"
  );
}

export function buildLeadOntologyTurnCardV2(input: {
  readonly session: FDEOntologyEngineeringSession;
  readonly semanticIntentContext?: FDESemanticIntentContext;
}): LeadOntologyTurnCardV2 {
  const grade = gradeFDEOntologyEngineeringSession(input.session, {
    readinessProfile: input.session.readinessProfileId,
  });
  const decided = new Set([
    ...input.session.acceptedHypothesisIds,
    ...input.session.rejectedHypothesisIds,
    ...(input.session.deferredHypothesisIds ?? []),
  ]);
  const unresolvedHypotheses = input.session.latentHypotheses.filter((hypothesis) =>
    !decided.has(hypothesis.hypothesisId) && hypothesis.status === "inferred"
  );
  const choices = unresolvedHypotheses.flatMap((hypothesis) => {
    const requirementIds = hypothesis.readinessRequirementIds ?? [];
    return [
      choiceForHypothesis({
        sessionId: input.session.sessionId,
        hypothesis,
        kind: "accept",
        label: `Accept ${hypothesis.family ?? "hypothesis"}`,
        consequence: "Use this hypothesis for SIC/DTC readiness; this does not authorize mutation.",
        requirementIds,
      }),
      choiceForHypothesis({
        sessionId: input.session.sessionId,
        hypothesis,
        kind: "reject",
        label: `Reject ${hypothesis.family ?? "hypothesis"}`,
        consequence: "Keep this hypothesis out of the approved semantic contract.",
        requirementIds,
      }),
      choiceForHypothesis({
        sessionId: input.session.sessionId,
        hypothesis,
        kind: "defer",
        label: `Defer ${hypothesis.family ?? "hypothesis"}`,
        consequence: "Leave this hypothesis visible but unresolved for a later turn.",
        requirementIds,
      }),
    ];
  });

  return {
    schemaVersion: LEAD_ONTOLOGY_TURN_CARD_V2_SCHEMA_VERSION,
    cardId: `lead-ontology-turn-card-v2:${input.session.sessionId}`,
    sessionId: input.session.sessionId,
    phase: input.session.phase,
    title: "FDE Ontology Turn",
    whatIUnderstand: [
      summary(input.session),
      input.session.missionModel?.operationalDecision,
      input.session.evidenceModel?.evidenceDefinition,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    inferredButUnconfirmed: unresolvedHypotheses.map((hypothesis) => hypothesis.plainLanguage),
    recommendedDefaults: unresolvedHypotheses.map((hypothesis) => hypothesis.recommendedDefault),
    whatWillNotHappen: [
      "This card will not authorize project mutation.",
      "This card will not promote reference-only evidence outside an approved scope.",
      "This card will not register a public MCP tool.",
    ],
    blockingQuestions: input.session.unresolvedQuestions
      .filter((question) => question.blocking)
      .map((question) => question.plainQuestion),
    stateEffectPreview: [
      `${input.session.acceptedHypothesisIds.length} accepted hypothesis id(s)`,
      `${input.session.rejectedHypothesisIds.length} rejected hypothesis id(s)`,
      `${(input.session.deferredHypothesisIds ?? []).length} deferred hypothesis id(s)`,
      `${input.session.turnRecordIds.length} persisted turn record id(s)`,
    ],
    readyForSemanticIntentContract: grade.verdict === "ready-for-semantic-contract" ||
      grade.verdict === "ready-for-dtc",
    readyForDtc: grade.verdict === "ready-for-dtc",
    readiness: grade,
    ...(input.semanticIntentContext?.contextId
      ? { semanticIntentContextRef: input.semanticIntentContext.contextId }
      : {}),
    choices,
    nextActions: nextActions(grade),
    mutationAuthorizedFromCard: false,
  };
}

function hypothesisPreview(hypothesis: LatentIntentHypothesis): LeadHypothesisPreview {
  return {
    hypothesisId: hypothesis.hypothesisId,
    status: hypothesis.status,
    ...(hypothesis.family ? { family: hypothesis.family } : {}),
    ...(hypothesis.decisionAxis ? { decisionAxis: hypothesis.decisionAxis } : {}),
    plainLanguage: hypothesis.plainLanguage,
    whyLeadInferredThis: hypothesis.whyLeadInferredThis,
    whatUserMayNotHaveNoticed: hypothesis.whatUserMayNotHaveNoticed,
    recommendedDefault: hypothesis.recommendedDefault,
    riskIfWrong: hypothesis.riskIfWrong,
    whatWillNotHappenIfAccepted: hypothesis.whatWillNotHappenIfAccepted,
    ontologyImplication: hypothesis.ontologyImplication,
    evidenceNeeded: hypothesis.evidenceNeeded,
    sourceRefs: hypothesis.sourceRefs,
    contextEngineeringDomains: contextDomainsForHypothesisV3(hypothesis),
  };
}

function choiceForHypothesisV3(input: {
  readonly sessionId: string;
  readonly hypothesis: LatentIntentHypothesis;
  readonly kind: FDEOntologyTurnChoiceKind;
  readonly label: string;
  readonly consequence: string;
  readonly requirementIds: readonly string[];
}): LeadOntologyTurnCardV3Choice {
  const choiceId = `lead-card-choice-v3:${input.sessionId}:${input.kind}:${input.hypothesis.hypothesisId}`;
  const contextEngineeringDomains = contextDomainsForHypothesisV3(input.hypothesis);
  const affectsDtc = contextEngineeringDomains.some((domain) =>
    domain === "ACTION" || domain === "GOVERNANCE" || domain === "TECHNOLOGY"
  ) || input.hypothesis.ontologyImplication.possibleActions.length > 0;
  return {
    choiceId,
    kind: input.kind,
    label: input.label,
    consequence: input.consequence,
    targetHypothesisId: input.hypothesis.hypothesisId,
    appliesToRequirementIds: input.requirementIds,
    effect: {
      ifAccepted:
        "The hypothesis can feed SIC drafting as explicit accepted meaning; mutation remains unauthorized.",
      ifRejected:
        "The hypothesis stays out of the SIC/DTC candidate set and cannot drive ontology or runtime defaults.",
      ifDeferred:
        "The hypothesis remains visible as unresolved context for a later FDE turn and blocks silent promotion.",
      affectsSemanticIntent: true,
      affectsDtc,
      contextEngineeringDomains,
    },
    internalAction: {
      choiceId,
      kind: input.kind,
      targetHypothesisId: input.hypothesis.hypothesisId,
      appliesToRequirementIds: input.requirementIds,
      sourceRef: `lead-ontology-turn-card-v3:${input.sessionId}`,
    },
  };
}

export function buildLeadOntologyTurnCardV3(input: {
  readonly session: FDEOntologyEngineeringSession;
  readonly semanticIntentContext?: FDESemanticIntentContext;
}): LeadOntologyTurnCardV3 {
  const grade = gradeFDEOntologyEngineeringSession(input.session, {
    readinessProfile: input.session.readinessProfileId,
  });
  const unresolvedHypotheses = unresolvedHypothesesForSession(input.session);
  const choices = unresolvedHypotheses.flatMap((hypothesis) => {
    const requirementIds = hypothesis.readinessRequirementIds ?? [];
    return [
      choiceForHypothesisV3({
        sessionId: input.session.sessionId,
        hypothesis,
        kind: "accept",
        label: `Accept ${hypothesis.family ?? "hypothesis"}`,
        consequence: "Use this hypothesis for SIC/DTC readiness; this does not authorize mutation.",
        requirementIds,
      }),
      choiceForHypothesisV3({
        sessionId: input.session.sessionId,
        hypothesis,
        kind: "reject",
        label: `Reject ${hypothesis.family ?? "hypothesis"}`,
        consequence: "Keep this hypothesis out of the approved semantic contract.",
        requirementIds,
      }),
      choiceForHypothesisV3({
        sessionId: input.session.sessionId,
        hypothesis,
        kind: "defer",
        label: `Defer ${hypothesis.family ?? "hypothesis"}`,
        consequence: "Leave this hypothesis visible but unresolved for a later turn.",
        requirementIds,
      }),
    ];
  });

  return {
    schemaVersion: LEAD_ONTOLOGY_TURN_CARD_V3_SCHEMA_VERSION,
    cardId: `lead-ontology-turn-card-v3:${input.session.sessionId}`,
    sessionId: input.session.sessionId,
    phase: input.session.phase,
    title: "FDE Ontology Turn",
    whatIUnderstand: [
      summary(input.session),
      input.session.missionModel?.operationalDecision,
      input.session.evidenceModel?.evidenceDefinition,
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0),
    hypothesisPreviews: unresolvedHypotheses.map(hypothesisPreview),
    recommendedDefaults: unresolvedHypotheses.map((hypothesis) => hypothesis.recommendedDefault),
    whatWillNotHappen: [
      "This card will not authorize project mutation.",
      "This card will not promote reference-only evidence outside an approved scope.",
      "This card will not register a public MCP tool.",
    ],
    blockingQuestions: input.session.unresolvedQuestions
      .filter((question) => question.blocking)
      .map((question) => question.plainQuestion),
    stateEffectPreview: [
      `${input.session.acceptedHypothesisIds.length} accepted hypothesis id(s)`,
      `${input.session.rejectedHypothesisIds.length} rejected hypothesis id(s)`,
      `${(input.session.deferredHypothesisIds ?? []).length} deferred hypothesis id(s)`,
      `${input.session.turnRecordIds.length} persisted turn record id(s)`,
    ],
    readyForSemanticIntentContract: grade.verdict === "ready-for-semantic-contract" ||
      grade.verdict === "ready-for-dtc",
    readyForDtc: grade.verdict === "ready-for-dtc",
    readiness: grade,
    ...(input.semanticIntentContext?.contextId
      ? { semanticIntentContextRef: input.semanticIntentContext.contextId }
      : {}),
    choices,
    nextActions: nextActions(grade),
    mutationAuthorizedFromCard: false,
  };
}
