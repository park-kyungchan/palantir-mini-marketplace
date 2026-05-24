import type { SemanticConversationState } from "../chatbot-studio/semantic-conversation-state";
import type {
  OntologyActivation,
  OntologyRoutingContext,
} from "../context-engineering/ontology-activation";
import type { CapabilityContract } from "./capability-contract";

export interface CapabilityRouterInput {
  readonly projectRoot: string;
  readonly semanticConversationState: SemanticConversationState;
  readonly ontologyActivation?: OntologyActivation;
  readonly ontologyContext?: OntologyRoutingContext;
  readonly availableCapabilities: readonly CapabilityContract[];
  readonly maxSelected?: number;
  /**
   * Optional agent capability contracts to score alongside skills + MCP tools.
   * Caller converts AgentDefinitionDeclaration[] via agentDefinitionToCapabilityContract()
   * before passing here. Router treats them like any other CapabilityContract
   * (same 8-dimension scorer). Filtered result surfaced in suggestedAgents.
   */
  readonly availableAgents?: readonly CapabilityContract[];
}

export interface CapabilityRouterDecision {
  readonly capabilityId: string;
  readonly decision: "selected" | "rejected" | "needs-clarification";
  readonly score: number;
  readonly matchedReasons: readonly string[];
  readonly rejectedReasons: readonly string[];
  readonly requiresDtc: boolean;
  readonly requiredValidationPacks: readonly string[];
}

export interface CapabilityRouterResult {
  readonly selectedCapabilities: readonly CapabilityContract[];
  readonly rejectedCapabilities: readonly {
    readonly capabilityId: string;
    readonly reason: string;
  }[];
  readonly needsClarificationCapabilities: readonly CapabilityRouterDecision[];
  readonly decisions: readonly CapabilityRouterDecision[];
  readonly plainLanguageRoutingSummary: string;
  readonly requiredDtc: boolean;
  /**
   * Agent-sourceKind capabilities with decision==="selected", sorted score desc.
   * Populated only when input.availableAgents was provided and non-empty.
   */
  readonly suggestedAgents: readonly CapabilityRouterDecision[];
  /**
   * When exactly one selected capability has a single actionTypeRef, that ref
   * is surfaced here for downstream recipe enrichment. Undefined otherwise.
   */
  readonly suggestedActionTypeRid?: string;
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

function routingContext(input: CapabilityRouterInput): OntologyRoutingContext {
  const context = input.ontologyContext ?? input.ontologyActivation;
  if (context === undefined) {
    throw new Error("routeCapabilityOntology: ontologyContext or ontologyActivation is required.");
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

function explicitSelectedCapabilityIds(state: SemanticConversationState): Set<string> {
  return new Set([
    ...(state.capabilityFacing?.selectedCapabilityRefs ?? []).map((ref) => ref.capabilityId),
    ...state.skillFacing.selectedSkillRefs.map((ref) => ref.skillId),
  ]);
}

function explicitCandidateCapabilityIds(state: SemanticConversationState): Set<string> {
  return new Set([
    ...(state.capabilityFacing?.candidateCapabilityRefs ?? []).map((ref) => ref.capabilityId),
    ...state.skillFacing.candidateSkillRefs.map((ref) => ref.skillId),
  ]);
}

function conversationText(input: CapabilityRouterInput): string {
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

function capabilitySearchText(capability: CapabilityContract): readonly string[] {
  const lifecycle = capability.inputOntology.artifactLifecycle;
  return [
    capability.capabilityId,
    capability.displayName,
    capability.category,
    capability.sourceKind,
    capability.sourceRef,
    capability.userFacingPurpose,
    capability.leadFacingPurpose,
    ...capability.intentMatchers.flatMap((matcher) => [
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
    ...capability.inputOntology.objectRefs,
    ...capability.inputOntology.requiredArtifacts,
    ...lifecycle.prerequisites,
    ...lifecycle.optionalInputs,
    ...lifecycle.creates,
    ...lifecycle.mutates,
    ...capability.inputOntology.allowedRawInputs,
    ...capability.outputOntology.objectRefs,
    ...capability.outputOntology.artifactRefs,
    ...capability.outputOntology.validationPacks,
    ...capability.actionBoundary.mutationSurfaces,
    ...capability.readSurfaces,
    ...capability.writeSurfaces,
    ...capability.knownIssueRefs,
    ...capability.nonGoals,
  ];
}

function forbiddenSurfaceConflict(
  capability: CapabilityContract,
  input: CapabilityRouterInput,
): boolean {
  const surfaces = [
    ...capability.actionBoundary.mutationSurfaces,
    ...capability.writeSurfaces,
  ];
  return hasTokenOverlap(surfaces, input.semanticConversationState.ontologyFacing.forbiddenSurfaceRefs);
}

function scoreCapability(
  capability: CapabilityContract,
  input: CapabilityRouterInput,
): CapabilityRouterDecision {
  const context = routingContext(input);
  const selectedIds = explicitSelectedCapabilityIds(input.semanticConversationState);
  const candidateIds = explicitCandidateCapabilityIds(input.semanticConversationState);
  const text = conversationText(input);
  const lifecycle = capability.inputOntology.artifactLifecycle;
  const matchedReasons: string[] = [];
  const rejectedReasons: string[] = [];
  let score = 0;

  if (selectedIds.has(capability.capabilityId)) {
    score += 100;
    matchedReasons.push("explicit selected capability ref matched");
  } else if (candidateIds.has(capability.capabilityId)) {
    score += 80;
    matchedReasons.push("candidate capability ref matched");
  }

  if (textIncludesAny(text, [capability.capabilityId, capability.displayName])) {
    score += 80;
    matchedReasons.push("exact capability id appeared in approved meaning");
  }

  const laneRefs = input.semanticConversationState.projectFacing.projectScopeLaneIds;
  if (capability.intentMatchers.some((matcher) =>
    matcher.projectScopeLanes.some((lane) => laneRefs.includes(lane))
  )) {
    score += 40;
    matchedReasons.push("projectScope lane matcher matched");
  }

  if (
    hasTokenOverlap(
      contextNouns(context),
      [
        ...capability.inputOntology.objectRefs,
        ...capability.outputOntology.objectRefs,
        ...capability.intentMatchers.flatMap((matcher) => matcher.nouns),
      ],
    )
  ) {
    score += 20;
    matchedReasons.push("ontology noun matcher matched");
  }

  if (
    hasTokenOverlap(
      contextVerbs(context),
      capability.intentMatchers.flatMap((matcher) => matcher.verbs),
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
        ...capability.intentMatchers.flatMap((matcher) => [
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
        ...capability.outputOntology.artifactRefs,
        ...capability.intentMatchers.flatMap((matcher) => matcher.createsArtifacts ?? []),
      ],
    )
  ) {
    score += 12;
    matchedReasons.push("created artifact lifecycle matcher matched");
  }

  if (
    capability.intentMatchers.some((matcher) =>
      matcher.naturalLanguageExamples.some((example) => textIncludesAny(text, [example]))
    )
  ) {
    score += 10;
    matchedReasons.push("natural-language example matched");
  }

  if (
    capability.intentMatchers.some((matcher) =>
      matcher.negativeExamples?.some((example) => textIncludesAny(text, [example]))
    )
  ) {
    score -= 80;
    rejectedReasons.push("negative example matched");
  }

  if (forbiddenSurfaceConflict(capability, input)) {
    score -= 100;
    rejectedReasons.push("forbidden surface conflicts with capability write boundary");
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
    overlapCount(activationTokens, tokens(capabilitySearchText(capability))) * 2,
  );
  if (keywordOverlap > 0) {
    score += keywordOverlap;
    matchedReasons.push("contract keyword overlap matched");
  }

  const requiresDtc =
    capability.actionBoundary.mayMutateProjectFiles ||
    capability.actionBoundary.requiresDtcApproval;
  const decision: CapabilityRouterDecision["decision"] =
    score >= 40 && rejectedReasons.length === 0
      ? "selected"
      : score >= 20 && rejectedReasons.length === 0
        ? "needs-clarification"
        : "rejected";

  return {
    capabilityId: capability.capabilityId,
    decision,
    score,
    matchedReasons,
    rejectedReasons: decision === "rejected" && rejectedReasons.length === 0
      ? ["score below selection threshold"]
      : rejectedReasons,
    requiresDtc,
    requiredValidationPacks: capability.outputOntology.validationPacks,
  };
}

export function routeCapabilityOntology(
  input: CapabilityRouterInput,
): CapabilityRouterResult {
  const decisions = input.availableCapabilities
    .map((capability) => scoreCapability(capability, input))
    .sort((left, right) =>
      right.score - left.score || left.capabilityId.localeCompare(right.capabilityId),
    );
  const selectedIds = new Set(
    decisions
      .filter((decision) => decision.decision === "selected")
      .slice(0, input.maxSelected ?? Number.POSITIVE_INFINITY)
      .map((decision) => decision.capabilityId),
  );
  const selected = input.availableCapabilities.filter((capability) =>
    selectedIds.has(capability.capabilityId)
  );
  const needsClarificationCapabilities = decisions.filter((decision) =>
    decision.decision === "needs-clarification"
  );
  const rejectedCapabilities = decisions
    .filter((decision) => !selectedIds.has(decision.capabilityId))
    .map((decision) => ({
      capabilityId: decision.capabilityId,
      reason:
        decision.decision === "needs-clarification"
          ? `Needs clarification: ${decision.matchedReasons.join("; ") || "weak ontology match"}.`
          : decision.rejectedReasons.join("; "),
    }));
  const requiredDtc = decisions.some((decision) =>
    selectedIds.has(decision.capabilityId) && decision.requiresDtc
  );

  // Score availableAgents using the same scorer — they are generic CapabilityContracts.
  const agentDecisions: CapabilityRouterDecision[] =
    input.availableAgents && input.availableAgents.length > 0
      ? input.availableAgents
          .map((agent) => scoreCapability(agent, input))
          .sort((l, r) => r.score - l.score || l.capabilityId.localeCompare(r.capabilityId))
      : [];

  const suggestedAgents = agentDecisions.filter((d) => d.decision === "selected");

  // suggestedActionTypeRid: populated when exactly one selected capability has
  // exactly one actionTypeRef.
  let suggestedActionTypeRid: string | undefined;
  const allSelectedCaps = selected;
  if (allSelectedCaps.length === 1) {
    const cap = allSelectedCaps[0];
    const actionRefs = (cap as unknown as { outputOntology: { actionTypeRefs?: string[] } })
      .outputOntology.actionTypeRefs;
    if (Array.isArray(actionRefs) && actionRefs.length === 1) {
      suggestedActionTypeRid = actionRefs[0];
    }
  }

  return {
    selectedCapabilities: selected,
    rejectedCapabilities,
    needsClarificationCapabilities,
    decisions,
    plainLanguageRoutingSummary:
      selected.length > 0
        ? `Selected ${selected.length} capability(ies) with scored ontology intent match reasons.`
        : needsClarificationCapabilities.length > 0
          ? "No capability selected yet; one or more capabilities need clarification because the ontology match is weak."
          : "No capability selected yet; the Lead must clarify meaning or add project capability contracts before routing.",
    requiredDtc,
    suggestedAgents,
    suggestedActionTypeRid,
  };
}
