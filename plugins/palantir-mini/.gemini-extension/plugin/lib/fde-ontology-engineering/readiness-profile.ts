import type {
  FDEOntologyEngineeringSession,
  FDEReadinessProfile,
  FDEReadinessProfileEvaluation,
  FDEReadinessRequirement,
  FDEReadinessRequirementResult,
  LatentIntentFamily,
} from "./types";

const REQUIREMENTS: Record<string, FDEReadinessRequirement> = {
  mission: {
    requirementId: "mission",
    kind: "mission",
    label: "Mission decision",
    required: true,
    description: "The operational decision or confirmed user goal is explicit.",
  },
  latentIntentDecision: {
    requirementId: "latent-intent-decision",
    kind: "latent-intent-decision",
    label: "Latent intent decision",
    required: true,
    description: "At least one inferred hypothesis has been accepted, rejected, or deferred.",
  },
  nonGoals: {
    requirementId: "non-goals",
    kind: "non-goals",
    label: "Non-goals",
    required: true,
    description: "The session records what should not be changed or promoted.",
  },
  evidenceClassification: {
    requirementId: "evidence-classification",
    kind: "evidence-classification",
    label: "Evidence classification",
    required: true,
    description: "Source evidence is explicitly classified before promotion.",
  },
  evidence: {
    requirementId: "evidence",
    kind: "evidence",
    label: "Evidence definition",
    required: true,
    description: "The session names evidence needed to justify the ontology shape.",
  },
  object: {
    requirementId: "object",
    kind: "object",
    label: "Object candidates",
    required: true,
    description: "At least one object candidate is present.",
  },
  link: {
    requirementId: "link",
    kind: "link",
    label: "Link candidates",
    required: true,
    description: "At least one link candidate is present.",
  },
  action: {
    requirementId: "action",
    kind: "action",
    label: "Action candidates",
    required: true,
    description: "At least one action candidate is present.",
  },
  function: {
    requirementId: "function",
    kind: "function",
    label: "Function candidates",
    required: true,
    description: "At least one function candidate is present.",
  },
  chatbotContext: {
    requirementId: "chatbot-context",
    kind: "chatbot-context",
    label: "Chatbot context",
    required: true,
    description: "Chatbot Studio application/retrieval context is explicit.",
  },
  applicationState: {
    requirementId: "application-state",
    kind: "application-state",
    label: "Application state",
    required: true,
    description: "Chatbot context candidates declare application state needs.",
  },
  evaluation: {
    requirementId: "evaluation",
    kind: "evaluation",
    label: "Evaluation plan",
    required: true,
    description: "Success signals or observable signals exist for evaluation.",
  },
  submissionCriteria: {
    requirementId: "submission-criteria",
    kind: "submission-criteria",
    label: "Submission criteria",
    required: true,
    description: "Writeback actions declare evidence or submission criteria.",
  },
  governance: {
    requirementId: "governance",
    kind: "governance",
    label: "Governance boundary",
    required: true,
    description: "Blocking clarification questions are resolved before contract drafting.",
  },
};

function req(id: keyof typeof REQUIREMENTS): FDEReadinessRequirement {
  return REQUIREMENTS[id]!;
}

export const FDE_READINESS_PROFILES: readonly FDEReadinessProfile[] = [
  {
    profileId: "framework-discovery",
    label: "Framework Discovery",
    description:
      "Enough ontology shape to draft SIC for a framework or discovery pass without requiring Chatbot Studio context.",
    requirements: [
      req("mission"),
      req("evidence"),
      req("object"),
      req("latentIntentDecision"),
      req("nonGoals"),
      req("evidenceClassification"),
    ],
    rules: [
      {
        ruleId: "framework-discovery.no-chatbot-required",
        requirementId: "chatbot-context",
        severity: "recommended",
        description: "Chatbot context is useful later but does not block SIC readiness.",
      },
      {
        ruleId: "framework-discovery.link-recommended",
        requirementId: "link",
        severity: "recommended",
        description: "Link candidates are useful but do not block early SIC readiness.",
      },
      {
        ruleId: "framework-discovery.function-recommended",
        requirementId: "function",
        severity: "recommended",
        description: "Function candidates are useful but do not block early SIC readiness.",
      },
    ],
    allowsSemanticIntentDraft: true,
    allowsDtcDraft: false,
  },
  {
    profileId: "chatbot-studio-design",
    label: "Chatbot Studio Design",
    description:
      "SIC readiness for Chatbot Studio work requires application state, retrieval context, and eval evidence.",
    requirements: [
      req("mission"),
      req("evidence"),
      req("latentIntentDecision"),
      req("nonGoals"),
      req("evidenceClassification"),
      req("object"),
      req("function"),
      req("chatbotContext"),
      req("applicationState"),
      req("evaluation"),
    ],
    rules: [
      {
        ruleId: "chatbot-studio-design.application-state-required",
        requirementId: "application-state",
        severity: "required",
        description: "Chatbot Studio design cannot be ready without application state.",
      },
    ],
    allowsSemanticIntentDraft: true,
    allowsDtcDraft: false,
  },
  {
    profileId: "action-writeback-design",
    label: "Action Writeback Design",
    description:
      "Writeback-oriented ontology engineering requires action candidates and submission criteria before readiness.",
    requirements: [
      req("mission"),
      req("evidence"),
      req("latentIntentDecision"),
      req("nonGoals"),
      req("evidenceClassification"),
      req("object"),
      req("action"),
      req("submissionCriteria"),
      req("evaluation"),
    ],
    rules: [
      {
        ruleId: "action-writeback-design.submission-criteria-required",
        requirementId: "submission-criteria",
        severity: "required",
        description: "Action writeback is not ready until submission criteria are explicit.",
      },
    ],
    allowsSemanticIntentDraft: true,
    allowsDtcDraft: false,
  },
  {
    profileId: "instructional-explanation-quality",
    label: "Instructional Explanation Quality",
    description:
      "Non-developer education prompts require learner-visible evidence, non-goals, and an accepted/deferred latent decision before SIC drafting.",
    requirements: [
      req("mission"),
      req("evidence"),
      req("latentIntentDecision"),
      req("nonGoals"),
      req("evidenceClassification"),
      req("object"),
      req("function"),
      req("evaluation"),
    ],
    rules: [
      {
        ruleId: "instructional-explanation-quality.teacher-judgment-not-writeback",
        requirementId: "action",
        severity: "recommended",
        description: "Teacher judgment or grading writeback remains out of scope unless a DTC later names it.",
      },
    ],
    allowsSemanticIntentDraft: true,
    allowsDtcDraft: false,
  },
  {
    profileId: "curriculum-reference-boundary",
    label: "Curriculum Reference Boundary",
    description:
      "MYP/curriculum prompts require reference-only classification and non-goals before they can inform a semantic contract.",
    requirements: [
      req("mission"),
      req("evidence"),
      req("latentIntentDecision"),
      req("nonGoals"),
      req("evidenceClassification"),
    ],
    rules: [
      {
        ruleId: "curriculum-reference-boundary.promotion-blocked",
        requirementId: "governance",
        severity: "recommended",
        description: "Curriculum evidence can support the SIC but cannot be promoted by readiness alone.",
      },
    ],
    allowsSemanticIntentDraft: true,
    allowsDtcDraft: false,
  },
  {
    profileId: "technology-surface",
    label: "Technology Surface",
    description:
      "UI, 3D, and runtime-surface prompts require application-state evidence and explicit non-goals before SIC drafting.",
    requirements: [
      req("mission"),
      req("evidence"),
      req("latentIntentDecision"),
      req("nonGoals"),
      req("evidenceClassification"),
      req("applicationState"),
      req("evaluation"),
    ],
    rules: [
      {
        ruleId: "technology-surface.dtc-not-from-card",
        requirementId: "action",
        severity: "recommended",
        description: "Runtime readiness and Lead cards remain review-only and do not authorize DTC mutation.",
      },
    ],
    allowsSemanticIntentDraft: true,
    allowsDtcDraft: false,
  },
];

function hasText(value: string | undefined): boolean {
  return value !== undefined && value.trim().length > 0;
}

function successSignals(session: FDEOntologyEngineeringSession): readonly string[] {
  return [
    ...(session.missionModel?.successSignals ?? []),
    ...(session.evidenceModel?.observableSignals ?? []),
    ...(session.evidenceModel?.sourceArtifactRefs ?? []),
  ].filter((value) => value.trim().length > 0);
}

function decidedHypothesisIds(session: FDEOntologyEngineeringSession): readonly string[] {
  return [
    ...session.acceptedHypothesisIds,
    ...session.rejectedHypothesisIds,
    ...(session.deferredHypothesisIds ?? []),
  ].filter((value) => value.trim().length > 0);
}

function acceptedOrDecidedHypotheses(session: FDEOntologyEngineeringSession): readonly string[] {
  const decided = new Set(decidedHypothesisIds(session));
  return session.latentHypotheses
    .filter((hypothesis) => decided.has(hypothesis.hypothesisId) || hypothesis.status !== "inferred")
    .map((hypothesis) => hypothesis.ruleId ?? hypothesis.hypothesisId);
}

function evidenceClassificationRefs(session: FDEOntologyEngineeringSession): readonly string[] {
  return [
    ...(session.evidenceModel?.sourceArtifactRefs ?? []),
    ...session.sourceRefs,
    ...session.latentHypotheses.flatMap((hypothesis) =>
      (hypothesis.readinessRequirementIds ?? []).includes("evidence-classification")
        ? [hypothesis.ruleId ?? hypothesis.hypothesisId]
        : []
    ),
  ].filter((value) => value.trim().length > 0);
}

function evaluateRequirement(
  session: FDEOntologyEngineeringSession,
  requirement: FDEReadinessRequirement,
): FDEReadinessRequirementResult {
  switch (requirement.kind) {
    case "mission": {
      const evidence = [
        session.confirmedUserGoal,
        session.missionModel?.operationalDecision,
        session.missionModel?.decisionOwnerRole,
      ].filter((value): value is string => hasText(value));
      return {
        requirementId: requirement.requirementId,
        satisfied: evidence.length >= 2 || hasText(session.confirmedUserGoal),
        evidence,
        missing: "mission decision and owner role",
      };
    }
    case "latent-intent-decision": {
      const evidence = acceptedOrDecidedHypotheses(session);
      return {
        requirementId: requirement.requirementId,
        satisfied: evidence.length > 0,
        evidence,
        missing: "latent intent decision",
      };
    }
    case "non-goals": {
      const evidence = [
        ...session.confirmedNonGoals,
        ...session.latentHypotheses.flatMap((hypothesis) =>
          hypothesis.family === "scope-non-goal" ? [hypothesis.hypothesisId] : []
        ),
      ].filter((value) => value.trim().length > 0);
      return {
        requirementId: requirement.requirementId,
        satisfied: evidence.length > 0,
        evidence,
        missing: "non-goals",
      };
    }
    case "evidence-classification": {
      const evidence = evidenceClassificationRefs(session);
      return {
        requirementId: requirement.requirementId,
        satisfied: evidence.length > 0,
        evidence,
        missing: "evidence classification",
      };
    }
    case "evidence": {
      const evidence = [
        session.evidenceModel?.evidenceDefinition,
        ...(session.evidenceModel?.sourceArtifactRefs ?? []),
      ].filter((value): value is string => hasText(value));
      return {
        requirementId: requirement.requirementId,
        satisfied: evidence.length > 0,
        evidence,
        missing: "evidence definition",
      };
    }
    case "object":
      return {
        requirementId: requirement.requirementId,
        satisfied: session.objectCandidates.length > 0,
        evidence: session.objectCandidates.map((candidate) => candidate.plainName),
        missing: "object candidates",
      };
    case "link":
      return {
        requirementId: requirement.requirementId,
        satisfied: session.linkCandidates.length > 0,
        evidence: session.linkCandidates.map((candidate) => candidate.plainName),
        missing: "link candidates",
      };
    case "action":
      return {
        requirementId: requirement.requirementId,
        satisfied: session.actionCandidates.length > 0,
        evidence: session.actionCandidates.map((candidate) => candidate.plainName),
        missing: "action candidates",
      };
    case "function":
      return {
        requirementId: requirement.requirementId,
        satisfied: session.functionCandidates.length > 0,
        evidence: session.functionCandidates.map((candidate) => candidate.plainName),
        missing: "function candidates",
      };
    case "chatbot-context":
      return {
        requirementId: requirement.requirementId,
        satisfied: session.chatbotContextCandidates.length > 0,
        evidence: session.chatbotContextCandidates.map((candidate) => candidate.plainName),
        missing: "chatbot context candidates",
      };
    case "application-state":
      return {
        requirementId: requirement.requirementId,
        satisfied: session.chatbotContextCandidates.some((candidate) =>
          hasText(candidate.applicationStateNeed)
        ),
        evidence: session.chatbotContextCandidates.map((candidate) => candidate.applicationStateNeed),
        missing: "chatbot application state",
      };
    case "evaluation": {
      const evidence = successSignals(session);
      return {
        requirementId: requirement.requirementId,
        satisfied: evidence.length > 0,
        evidence,
        missing: "evaluation signals or evidence refs",
      };
    }
    case "submission-criteria":
      return {
        requirementId: requirement.requirementId,
        satisfied: session.actionCandidates.some((candidate) =>
          (candidate.submissionCriteria?.length ?? 0) > 0 ||
          candidate.evidenceRefs.length > 0 ||
          hasText(candidate.operationalIntent)
        ),
        evidence: session.actionCandidates.flatMap((candidate) => [
          candidate.operationalIntent,
          ...(candidate.submissionCriteria ?? []),
          ...candidate.evidenceRefs,
        ]).filter((value) => value.trim().length > 0),
        missing: "action submission criteria",
      };
    case "governance":
      return {
        requirementId: requirement.requirementId,
        satisfied: !session.unresolvedQuestions.some((question) => question.blocking),
        evidence: session.unresolvedQuestions.map((question) => question.questionId),
        missing: "blocking clarification resolution",
      };
  }
}

export function findFDEReadinessProfile(
  profile: FDEReadinessProfile | LatentIntentFamily | undefined,
): FDEReadinessProfile {
  if (profile && typeof profile !== "string") return profile;
  return (
    FDE_READINESS_PROFILES.find((candidate) => candidate.profileId === profile) ??
    FDE_READINESS_PROFILES[0]!
  );
}

export function evaluateFDEReadinessProfile(
  session: FDEOntologyEngineeringSession,
  profile?: FDEReadinessProfile | LatentIntentFamily,
): FDEReadinessProfileEvaluation {
  const selected = findFDEReadinessProfile(profile ?? session.readinessProfileId);
  const requirementResults = selected.requirements.map((requirement) =>
    evaluateRequirement(session, requirement)
  );
  const missingRequired = requirementResults
    .filter((result) => !result.satisfied)
    .map((result) => result.missing);
  const score = requirementResults.length === 0
    ? 1
    : requirementResults.filter((result) => result.satisfied).length / requirementResults.length;
  const blockingQuestionCount = session.unresolvedQuestions.filter((question) => question.blocking).length;
  const readyForSemanticIntent =
    selected.allowsSemanticIntentDraft &&
    missingRequired.length === 0 &&
    blockingQuestionCount === 0;

  return {
    profileId: selected.profileId,
    score,
    readyForSemanticIntent,
    readyForDigitalTwin:
      readyForSemanticIntent &&
      selected.allowsDtcDraft &&
      session.semanticIntentContractRef !== undefined,
    requirementResults,
    missingRequired,
    warnings: selected.rules
      .filter((rule) => rule.severity === "recommended")
      .map((rule) => rule.description),
  };
}
