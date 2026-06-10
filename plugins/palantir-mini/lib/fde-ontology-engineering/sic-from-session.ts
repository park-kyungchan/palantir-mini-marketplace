import type { SemanticIntentContract } from "../lead-intent/contracts";
import type {
  ActionTypeRef,
  FunctionRef,
  LinkTypeRef,
  ObjectTypeRef,
} from "#schemas/ontology/primitives/ontology-engineering-ref";
import type { SemanticIntentAxes, SicAxis } from "#schemas/ontology/primitives/semantic-intent-contract";
import type { FDEOntologyEngineeringSession } from "./types";

export interface FDEOntologyEngineeringSicDraftOptions {
  readonly contractId?: string;
  readonly affectedSurfaces?: readonly string[];
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));
}

/**
 * Build one of the nine SemanticIntentAxes from session signal. An axis with no
 * plain-language summary is left `open` — never `not-applicable`. Auto-marking an
 * axis not-applicable would reduce the nine-axis heart; `open` lets readiness flag
 * it for the turn-by-turn fill where the user confirms (or explicitly waives) it.
 */
function buildAxis(summary: string, refs: readonly string[]): SicAxis {
  const trimmedSummary = summary.trim();
  return {
    summary: trimmedSummary,
    refs: unique(refs),
    status: trimmedSummary.length > 0 ? "filled" : "open",
  };
}

/**
 * Read a candidate's declared RID. The typed-ref `declaredRid` field has landed on
 * the candidate types (E-PRF), so this reads it directly; candidates without a rid
 * are skipped. A non-empty declared rid flows into the typed-ref arrays.
 */
function declaredRid(candidate: { readonly declaredRid?: string }): string | undefined {
  const rid = candidate.declaredRid;
  return typeof rid === "string" && rid.trim().length > 0 ? rid.trim() : undefined;
}

function acceptedHypothesisSummaries(session: FDEOntologyEngineeringSession): readonly string[] {
  const accepted = new Set(session.acceptedHypothesisIds);
  return session.latentHypotheses
    .filter((hypothesis) => accepted.has(hypothesis.hypothesisId))
    .map((hypothesis) => hypothesis.plainLanguage);
}

function confirmedIntent(session: FDEOntologyEngineeringSession): string {
  return (
    session.stableSummary?.confirmedIntent
    ?? session.confirmedUserGoal
    ?? session.missionModel?.operationalDecision
    ?? "FDE ontology engineering session requires more accepted mission state."
  );
}

/**
 * Surface the nine understand-phase axes from accepted session signal. Every axis
 * is always represented; axes lacking session signal stay `open` (rule: only the
 * user, turn-by-turn, may record an axis as not-applicable).
 */
function buildAxes(session: FDEOntologyEngineeringSession): SemanticIntentAxes {
  const roleCandidates = session.roleCandidates ?? [];
  const roleNames = roleCandidates.map((candidate) => candidate.plainName);

  const dataNames = [
    ...session.objectCandidates.map((candidate) => candidate.plainName),
    ...session.chatbotContextCandidates.map((candidate) => candidate.plainName),
  ];
  const logicNames = session.functionCandidates.map((candidate) => candidate.plainName);
  const actionNames = session.actionCandidates.map((candidate) => candidate.plainName);

  const governanceSummary = [
    session.stableSummary?.governanceSummary,
    roleNames.length > 0 ? `Roles: ${roleNames.join(", ")}` : undefined,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n");

  const successSignals = session.missionModel?.successSignals ?? [];

  const memoryPriorRefs = unique([
    ...(session.semanticIntentContextRef ? [session.semanticIntentContextRef] : []),
    ...(session.semanticIntentContractRef ? [session.semanticIntentContractRef] : []),
    ...(session.digitalTwinChangeContractRef ? [session.digitalTwinChangeContractRef] : []),
  ]);

  return {
    data: buildAxis(
      dataNames.length > 0 ? `Operational objects and application state: ${dataNames.join(", ")}` : "",
      [...session.objectCandidates, ...session.chatbotContextCandidates].flatMap(
        (candidate) => candidate.evidenceRefs,
      ),
    ),
    logic: buildAxis(
      logicNames.length > 0 ? `Decision logic / functions: ${logicNames.join(", ")}` : "",
      session.functionCandidates.flatMap((candidate) => candidate.evidenceRefs),
    ),
    action: buildAxis(
      actionNames.length > 0 ? `Write-back actions: ${actionNames.join(", ")}` : "",
      session.actionCandidates.flatMap((candidate) => candidate.evidenceRefs),
    ),
    governance: buildAxis(
      governanceSummary,
      roleCandidates.flatMap((candidate) => candidate.evidenceRefs ?? []),
    ),
    context: buildAxis(
      session.evidenceModel?.evidenceDefinition ?? "",
      [
        ...(session.evidenceModel?.sourceArtifactRefs ?? []),
        ...session.sourceRefs,
      ],
    ),
    successEval: buildAxis(
      successSignals.length > 0 ? `Success signals: ${successSignals.join(", ")}` : "",
      [],
    ),
    constraintsNonGoals: buildAxis(
      session.confirmedNonGoals.length > 0
        ? `Confirmed non-goals: ${session.confirmedNonGoals.join(", ")}`
        : "",
      [],
    ),
    actors: buildAxis(
      roleNames.length > 0 ? `Actors / roles: ${roleNames.join(", ")}` : "",
      roleCandidates.flatMap((candidate) => candidate.evidenceRefs ?? []),
    ),
    memoryPrior: buildAxis(
      memoryPriorRefs.length > 0 ? `Prior-session contract refs: ${memoryPriorRefs.join(", ")}` : "",
      memoryPriorRefs,
    ),
  };
}

function approvedObjectTypeRefs(session: FDEOntologyEngineeringSession): ObjectTypeRef[] {
  return session.objectCandidates.flatMap((candidate) => {
    const rid = declaredRid(candidate);
    return rid
      ? [{ kind: "ObjectType", rid, displayName: candidate.plainName, confidence: "exact" }]
      : [];
  });
}

function approvedActionTypeRefs(session: FDEOntologyEngineeringSession): ActionTypeRef[] {
  return session.actionCandidates.flatMap((candidate) => {
    const rid = declaredRid(candidate);
    return rid
      ? [{ kind: "ActionType", rid, displayName: candidate.plainName, confidence: "exact" }]
      : [];
  });
}

function approvedFunctionRefs(session: FDEOntologyEngineeringSession): FunctionRef[] {
  return session.functionCandidates.flatMap((candidate) => {
    const rid = declaredRid(candidate);
    return rid
      ? [{ kind: "Function", rid, displayName: candidate.plainName, confidence: "exact" }]
      : [];
  });
}

function approvedLinkTypeRefs(session: FDEOntologyEngineeringSession): LinkTypeRef[] {
  return session.linkCandidates.flatMap((candidate) => {
    const rid = declaredRid(candidate);
    return rid
      ? [{ kind: "LinkType", rid, displayName: candidate.plainName, confidence: "exact" }]
      : [];
  });
}

export function createSemanticIntentContractDraftFromFDEOntologySession(
  session: FDEOntologyEngineeringSession,
  options: FDEOntologyEngineeringSicDraftOptions = {},
): SemanticIntentContract {
  const acceptedSummaries = acceptedHypothesisSummaries(session);
  const nouns = unique([
    ...session.objectCandidates.map((candidate) => candidate.plainName),
    ...session.linkCandidates.map((candidate) => candidate.plainName),
    ...session.chatbotContextCandidates.map((candidate) => candidate.plainName),
  ]);
  const verbs = unique([
    ...session.actionCandidates.map((candidate) => candidate.plainName),
    ...session.functionCandidates.map((candidate) => candidate.plainName),
  ]);
  const intent = confirmedIntent(session);
  const objectTypeRefs = approvedObjectTypeRefs(session);
  const actionTypeRefs = approvedActionTypeRefs(session);
  const functionRefs = approvedFunctionRefs(session);
  const linkTypeRefs = approvedLinkTypeRefs(session);

  return {
    contractId: options.contractId ?? `semantic-intent:fde-session:${session.sessionId}`,
    status: "draft",
    rawIntent: intent,
    confirmedIntent: [
      intent,
      ...acceptedSummaries,
    ].join("\n"),
    nonGoals: [...session.confirmedNonGoals],
    approvedNouns: nouns,
    approvedVerbs: verbs,
    affectedSurfaces: unique([
      ...(options.affectedSurfaces ?? []),
      ...session.sourceRefs,
    ]),
    ...(objectTypeRefs.length > 0 ? { approvedObjectTypeRefs: objectTypeRefs } : {}),
    ...(actionTypeRefs.length > 0 ? { approvedActionTypeRefs: actionTypeRefs } : {}),
    ...(functionRefs.length > 0 ? { approvedFunctionRefs: functionRefs } : {}),
    ...(linkTypeRefs.length > 0 ? { approvedLinkTypeRefs: linkTypeRefs } : {}),
    axes: buildAxes(session),
    permissionsAndProposal: "Drafted from accepted FDE ontology engineering session state; not from raw prompt text.",
    acceptedRisks: (session.deferredHypothesisIds ?? []).map((id) => `Deferred hypothesis remains open: ${id}`),
    downstreamAllowed: [
      "Use accepted session state to review SemanticIntentContract fields.",
      "Ask additional FDE ontology engineering questions for unresolved gaps.",
    ],
    downstreamForbidden: [
      "Do not authorize ontology mutation from this draft alone.",
      "Do not rehydrate raw prompt text into the contract.",
    ],
    clarificationQuestions: session.unresolvedQuestions.map((question) => ({
      questionId: question.questionId,
      ambiguityType: "decision",
      materiality: question.blocking ? "blocking" : "important",
      decisionSpec: {
        decisionId: question.questionId,
        phase: question.phase,
        plainKoreanTitle: "FDE 결정 필요",
        plainKoreanSummary: question.plainQuestion,
        whyItMatters: question.whyItMatters,
        recommendedChoiceId: `${question.questionId}.answer`,
        choices: [
          {
            choiceId: `${question.questionId}.answer`,
            label: "답변 반영",
            consequence: question.recommendedDefault ?? "Answer before contract approval.",
            recommended: true,
          },
          {
            choiceId: `${question.questionId}.defer`,
            label: "보류",
            consequence: "The contract remains draft and cannot authorize downstream execution.",
            recommended: false,
          },
        ],
        evidenceRefs: session.sourceRefs,
        blocking: question.blocking,
        freeTextAllowed: true,
        stateEffectPreview: "Record a UserDecisionRecord before SIC approval.",
      },
      whyItMatters: question.whyItMatters,
      plainLanguageExplanation: question.whyItMatters,
      palantirArchitectureMapping: {
        operationalMeaning: question.phase,
        platformTerm: "Ontology Proposal",
      },
      defaultIfUserAcceptsRecommendation: question.recommendedDefault ?? "Keep as an open clarification.",
      whatWillNotHappen: [
        "No ontology edit will be authorized from an unresolved clarification.",
      ],
      requiresUserApproval: question.blocking,
      status: "open",
    })),
  };
}
