import type { SemanticConversationState } from "../chatbot-studio/semantic-conversation-state";
import type {
  OntologyActivation,
  OntologyRoutingContext,
} from "../context-engineering/ontology-activation";
import {
  normalizeArtifactLifecycle,
  normalizeSkillIntentMatcher,
  type SkillArtifactLifecycle,
  type SkillIntentMatcher,
  type SkillOntologyContract,
} from "./skill-ontology-contract";

export interface SkillOntologyRouterInput {
  readonly projectRoot: string;
  readonly semanticConversationState: SemanticConversationState;
  readonly ontologyActivation?: OntologyActivation;
  readonly ontologyContext?: OntologyRoutingContext;
  readonly availableSkills: readonly SkillOntologyContract[];
}

export interface SkillOntologyRouterResult {
  readonly selectedSkills: readonly SkillOntologyContract[];
  readonly rejectedSkills: readonly {
    readonly skillId: string;
    readonly reason: string;
  }[];
  readonly needsClarificationSkills: readonly SkillOntologyRouterDecision[];
  readonly decisions: readonly SkillOntologyRouterDecision[];
  readonly plainLanguageRoutingSummary: string;
  readonly requiredDtc: boolean;
}

export interface SkillOntologyRouterDecision {
  readonly skillId: string;
  readonly decision: "selected" | "rejected" | "needs-clarification";
  readonly score: number;
  readonly matchedReasons: readonly string[];
  readonly rejectedReasons: readonly string[];
  readonly requiresDtc: boolean;
  readonly requiredValidationPacks: readonly string[];
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, " ").trim();
}

function isMeaningfulToken(token: string): boolean {
  return token.length >= 3 || (/[가-힣]/.test(token) && token.length >= 2);
}

function tokens(values: readonly string[]): Set<string> {
  const result = new Set<string>();
  for (const value of values) {
    for (const token of normalize(value).split(/\s+/)) {
      if (isMeaningfulToken(token)) result.add(token);
    }
  }
  return result;
}

function overlapCount(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let count = 0;
  for (const value of left) {
    if (right.has(value)) count += 1;
  }
  return count;
}

function hasTokenOverlap(left: readonly string[], right: readonly string[]): boolean {
  return overlapCount(tokens(left), tokens(right)) > 0;
}

function textIncludesAny(text: string, values: readonly string[]): boolean {
  const normalizedText = normalize(text);
  return values.some((value) => {
    const normalizedValue = normalize(value);
    return normalizedValue.length > 0 && normalizedText.includes(normalizedValue);
  });
}

function artifactLifecycleFor(contract: SkillOntologyContract): SkillArtifactLifecycle {
  return normalizeArtifactLifecycle(
    contract.inputOntology,
    contract.outputOntology.artifactRefs,
    contract.actionBoundary.mutationSurfaces,
  );
}

function normalizedMatchers(contract: SkillOntologyContract): readonly SkillIntentMatcher[] {
  return (contract.intentMatchers ?? []).map(normalizeSkillIntentMatcher);
}

function routingContext(input: SkillOntologyRouterInput): OntologyRoutingContext {
  const context = input.ontologyContext ?? input.ontologyActivation;
  if (context === undefined) {
    throw new Error("routeSkillOntology: ontologyContext or ontologyActivation is required.");
  }
  return context;
}

function contextNouns(context: OntologyRoutingContext): readonly string[] {
  return "approvalState" in context ? context.nouns : context.approvedNouns;
}

function contextVerbs(context: OntologyRoutingContext): readonly string[] {
  return "approvalState" in context ? context.verbs : context.approvedVerbs;
}

function contextSurfaces(context: OntologyRoutingContext): readonly string[] {
  return "approvalState" in context ? context.surfaceHints : context.affectedSurfaces;
}

function contextOntologyRefs(context: OntologyRoutingContext): readonly string[] {
  return context.ontologyRefs;
}

function contextActionRefs(context: OntologyRoutingContext): readonly string[] {
  return context.actionRefs;
}

function conversationText(input: SkillOntologyRouterInput): string {
  const context = routingContext(input);
  return [
    input.semanticConversationState.userFacing.plainRequestSummary,
    input.semanticConversationState.userFacing.confirmedGoal,
    ...input.semanticConversationState.userFacing.confirmedNonGoals,
    ...contextNouns(context),
    ...contextVerbs(context),
    ...contextOntologyRefs(context),
    ...contextActionRefs(context),
    ...contextSurfaces(context),
  ].filter((value): value is string => typeof value === "string" && value.length > 0)
    .join("\n");
}

function contractSearchText(contract: SkillOntologyContract): readonly string[] {
  const lifecycle = artifactLifecycleFor(contract);
  const matchers = normalizedMatchers(contract);
  return [
    contract.skillId,
    contract.displayName,
    contract.category,
    contract.userFacingPurpose,
    contract.leadFacingPurpose,
    ...matchers.flatMap((matcher) => [
      matcher.matcherId,
      ...matcher.naturalLanguageExamples,
      ...matcher.nouns,
      ...matcher.verbs,
      ...matcher.projectScopeLanes,
      ...(matcher.prerequisites ?? []),
      ...(matcher.optionalExistingArtifacts ?? []),
      ...(matcher.createsArtifacts ?? []),
      ...(matcher.consumesArtifacts ?? []),
      ...(matcher.requiredArtifacts ?? []),
    ]),
    ...contract.inputOntology.objectRefs,
    ...contract.inputOntology.requiredArtifacts,
    ...lifecycle.prerequisites,
    ...lifecycle.optionalInputs,
    ...lifecycle.creates,
    ...lifecycle.mutates,
    ...contract.inputOntology.allowedRawInputs,
    ...contract.outputOntology.objectRefs,
    ...contract.outputOntology.artifactRefs,
    ...contract.outputOntology.validationPacks,
    ...contract.actionBoundary.mutationSurfaces,
    ...(contract.readSurfaces ?? []),
    ...(contract.writeSurfaces ?? []),
    ...(contract.knownIssueRefs ?? []),
    ...contract.nonGoals,
  ];
}

function forbiddenSurfaceConflict(
  contract: SkillOntologyContract,
  input: SkillOntologyRouterInput,
): boolean {
  const surfaces = [
    ...contract.actionBoundary.mutationSurfaces,
    ...(contract.writeSurfaces ?? []),
  ];
  return hasTokenOverlap(surfaces, input.semanticConversationState.ontologyFacing.forbiddenSurfaceRefs);
}

function scoreSkill(
  contract: SkillOntologyContract,
  input: SkillOntologyRouterInput,
): SkillOntologyRouterDecision {
  const context = routingContext(input);
  const selectedIds = new Set(
    input.semanticConversationState.skillFacing.selectedSkillRefs.map((ref) => ref.skillId),
  );
  const candidateIds = new Set(
    input.semanticConversationState.skillFacing.candidateSkillRefs.map((ref) => ref.skillId),
  );
  const text = conversationText(input);
  const lifecycle = artifactLifecycleFor(contract);
  const matchers = normalizedMatchers(contract);
  const matchedReasons: string[] = [];
  const rejectedReasons: string[] = [];
  let score = 0;

  if (selectedIds.has(contract.skillId)) {
    score += 100;
    matchedReasons.push("explicit selected skill ref matched");
  } else if (candidateIds.has(contract.skillId)) {
    score += 80;
    matchedReasons.push("candidate skill ref matched");
  }

  if (textIncludesAny(text, [contract.skillId, contract.displayName])) {
    score += 80;
    matchedReasons.push("exact skill or capability id appeared in approved meaning");
  }

  const laneRefs = input.semanticConversationState.projectFacing.projectScopeLaneIds;
  if (matchers.some((matcher) =>
    matcher.projectScopeLanes.some((lane) => laneRefs.includes(lane))
  )) {
    score += 40;
    matchedReasons.push("projectScope lane matcher matched");
  }

  if (
    hasTokenOverlap(
      contextNouns(context),
      [
        ...contract.inputOntology.objectRefs,
        ...contract.outputOntology.objectRefs,
        ...matchers.flatMap((matcher) => matcher.nouns),
      ],
    )
  ) {
    score += 20;
    matchedReasons.push("ontology noun matcher matched");
  }

  if (
    hasTokenOverlap(
      contextVerbs(context),
      matchers.flatMap((matcher) => matcher.verbs),
    )
  ) {
    score += 20;
    matchedReasons.push("ontology verb matcher matched");
  }

  if (
    hasTokenOverlap(
      [
        ...contextSurfaces(context),
        ...input.semanticConversationState.ontologyFacing.activatedSurfaceRefs,
      ],
      [
        ...lifecycle.prerequisites,
        ...lifecycle.optionalInputs,
        ...matchers.flatMap((matcher) => [
          ...(matcher.prerequisites ?? []),
          ...(matcher.optionalExistingArtifacts ?? []),
          ...(matcher.consumesArtifacts ?? []),
        ]),
      ],
    )
  ) {
    score += 15;
    matchedReasons.push("input artifact lifecycle matcher matched");
  }

  if (
    hasTokenOverlap(
      [
        ...contextSurfaces(context),
        ...input.semanticConversationState.ontologyFacing.activatedSurfaceRefs,
      ],
      [
        ...lifecycle.creates,
        ...contract.outputOntology.artifactRefs,
        ...matchers.flatMap((matcher) => matcher.createsArtifacts ?? []),
      ],
    )
  ) {
    score += 12;
    matchedReasons.push("created artifact lifecycle matcher matched");
  }

  if (
    matchers.some((matcher) =>
      matcher.naturalLanguageExamples.some((example) => textIncludesAny(text, [example]))
    )
  ) {
    score += 10;
    matchedReasons.push("natural-language example matched");
  }

  if (
    matchers.some((matcher) =>
      matcher.negativeExamples?.some((example) => textIncludesAny(text, [example]))
    )
  ) {
    score -= 80;
    rejectedReasons.push("negative example matched");
  }

  if (forbiddenSurfaceConflict(contract, input)) {
    score -= 100;
    rejectedReasons.push("forbidden surface conflicts with skill write boundary");
  }

  const activationTokens = tokens([
    ...contextNouns(context),
    ...contextVerbs(context),
    ...contextOntologyRefs(context),
    ...contextActionRefs(context),
    ...contextSurfaces(context),
  ]);
  const keywordOverlap = Math.min(
    10,
    overlapCount(activationTokens, tokens(contractSearchText(contract))) * 2,
  );
  if (keywordOverlap > 0) {
    score += keywordOverlap;
    matchedReasons.push("contract keyword overlap matched");
  }

  const requiresDtc =
    contract.actionBoundary.mayMutateProjectFiles ||
    contract.actionBoundary.requiresDtcApproval;
  const decision: SkillOntologyRouterDecision["decision"] =
    score >= 40 && rejectedReasons.length === 0
      ? "selected"
      : score >= 20 && rejectedReasons.length === 0
        ? "needs-clarification"
        : "rejected";

  return {
    skillId: contract.skillId,
    decision,
    score,
    matchedReasons,
    rejectedReasons: decision === "rejected" && rejectedReasons.length === 0
      ? ["score below selection threshold"]
      : rejectedReasons,
    requiresDtc,
    requiredValidationPacks: contract.outputOntology.validationPacks,
  };
}

export function routeSkillOntology(
  input: SkillOntologyRouterInput,
): SkillOntologyRouterResult {
  const decisions = input.availableSkills
    .map((skill) => scoreSkill(skill, input))
    .sort((left, right) =>
      right.score - left.score || left.skillId.localeCompare(right.skillId),
    );
  const selectedIds = new Set(
    decisions.filter((decision) => decision.decision === "selected").map((decision) => decision.skillId),
  );
  const selected = input.availableSkills.filter((skill) => selectedIds.has(skill.skillId));
  const needsClarificationSkills = decisions.filter((decision) =>
    decision.decision === "needs-clarification"
  );
  const rejectedSkills = decisions
    .filter((decision) => decision.decision !== "selected")
    .map((decision) => ({
      skillId: decision.skillId,
      reason:
        decision.decision === "needs-clarification"
          ? `Needs clarification: ${decision.matchedReasons.join("; ") || "weak ontology match"}.`
          : decision.rejectedReasons.join("; "),
    }));
  const requiredDtc = decisions.some((decision) =>
    decision.decision === "selected" && decision.requiresDtc
  );

  return {
    selectedSkills: selected,
    rejectedSkills,
    needsClarificationSkills,
    decisions,
    plainLanguageRoutingSummary:
      selected.length > 0
        ? `Selected ${selected.length} skill(s) with scored ontology intent match reasons.`
        : needsClarificationSkills.length > 0
          ? "No skill selected yet; one or more skills need clarification because the ontology match is weak."
          : "No skill selected yet; the Lead must clarify meaning or add project skill ontology contracts before routing.",
    requiredDtc,
  };
}
