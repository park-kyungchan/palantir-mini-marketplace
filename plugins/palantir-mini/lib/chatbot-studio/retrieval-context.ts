import {
  buildLLMControlFacingState,
  type SemanticConversationState,
} from "./semantic-conversation-state";

export const CHATBOT_STUDIO_RETRIEVAL_CONTEXT_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-retrieval-context/v1";

export interface ChatbotStudioRetrievalContext {
  readonly schemaVersion: typeof CHATBOT_STUDIO_RETRIEVAL_CONTEXT_SCHEMA_VERSION;
  readonly conversationStateId: string;
  readonly retrievedPrompt: string;
  /**
   * Backward-compatible alias for `ontologyPrimitiveRefs`.
   * Context surfaces, issue ids, validation packs, and runtime refs must not
   * be serialized here.
   */
  readonly ontologyRefs: readonly string[];
  readonly ontologyPrimitiveRefs: readonly string[];
  readonly contextEngineeringRefs: readonly string[];
  readonly issueRefs: readonly string[];
  readonly validationRefs: readonly string[];
  readonly skillRefs: readonly string[];
  readonly sourceRefs: readonly string[];
  readonly canonicalTermRefs?: readonly string[];
  readonly semanticConflictRefs?: readonly string[];
  /**
   * Document IDs included via document context retrieval (PR-12, opt-in).
   * Populated when `ontology_context_query` was called with
   * `includeDocumentContext:true`. Absent when document retrieval was not
   * requested.
   */
  readonly documentRefs?: readonly string[];
}

const ONTOLOGY_PRIMITIVE_REF_PREFIXES = [
  "ObjectType:",
  "LinkType:",
  "ActionType:",
  "Function:",
  "Interface:",
  "ObjectView:",
  "ObjectSet:",
  "Branch:",
  "Proposal:",
  "OntologyEdit:",
  "ontology:ObjectType:",
  "ontology:LinkType:",
  "ontology:ActionType:",
  "ontology:Function:",
  "ontology:Interface:",
  "ontology:ObjectView:",
  "ontology:ObjectSet:",
  "ontology:Branch:",
  "ontology:Proposal:",
  "ontology:OntologyEdit:",
] as const;

function unique(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string =>
    typeof value === "string" && value.length > 0
  )));
}

function isOntologyPrimitiveRef(ref: string): boolean {
  return ONTOLOGY_PRIMITIVE_REF_PREFIXES.some((prefix) => ref.startsWith(prefix));
}

export function buildRetrievalContextFromConversation(
  conversation: SemanticConversationState,
): ChatbotStudioRetrievalContext {
  const primitiveCandidates = [
    ...conversation.ontologyFacing.activatedObjectRefs,
    ...conversation.ontologyFacing.activatedActionRefs,
    ...conversation.ontologyFacing.activatedSurfaceRefs,
    ...conversation.ontologyFacing.activatedLaneRefs,
  ];
  const ontologyPrimitiveRefs = unique(primitiveCandidates.filter(isOntologyPrimitiveRef));
  const contextEngineeringRefs = unique([
    ...conversation.ontologyFacing.activatedObjectRefs.filter((ref) => !isOntologyPrimitiveRef(ref)),
    ...conversation.ontologyFacing.activatedActionRefs.filter((ref) => !isOntologyPrimitiveRef(ref)),
    ...conversation.ontologyFacing.activatedSurfaceRefs.filter((ref) => !isOntologyPrimitiveRef(ref)),
    ...conversation.ontologyFacing.activatedLaneRefs.filter((ref) => !isOntologyPrimitiveRef(ref)),
    ...(conversation.impactFacing?.directSurfaceRefs ?? []),
    ...(conversation.impactFacing?.downstreamSurfaceRefs ?? []),
  ]);
  const issueRefs = unique(conversation.issueFacing?.knownIssueIds ?? []);
  const validationRefs = unique(
    conversation.validationFacing?.requiredValidationPacks ??
      conversation.projectFacing.requiredValidationPacks,
  );
  const skillRefs = [
    ...conversation.skillFacing.candidateSkillRefs.map((skill) => skill.skillId),
    ...conversation.skillFacing.selectedSkillRefs.map((skill) => skill.skillId),
  ];
  const semantic = conversation.semanticConsistencyFacing;
  const llmControl = conversation.llmControlFacing ??
    buildLLMControlFacingState(conversation.stateId);

  return {
    schemaVersion: CHATBOT_STUDIO_RETRIEVAL_CONTEXT_SCHEMA_VERSION,
    conversationStateId: conversation.stateId,
    retrievedPrompt: [
      `Control state source: ${llmControl.stateSource}`,
      `Model writes to readiness/approval: ${
        llmControl.writableByModel ? "allowed" : "denied"
      }`,
      `Goal: ${conversation.userFacing.confirmedGoal ?? conversation.userFacing.plainRequestSummary}`,
      `Lifecycle: ${conversation.lifecycle}`,
      `DTC readiness: ${
        conversation.contractFacing.dtcReady ? "ready" : "not-ready"
      } (plugin-derived, read-only)`,
      `Approval authority: prompt-front-door contract refs (read-only)`,
      `Unresolved questions: ${conversation.userFacing.unresolvedQuestions.length}`,
      semantic
        ? `Canonical semantic terms: ${semantic.canonicalTermRefs.length}`
        : "Canonical semantic terms: not evaluated",
      semantic
        ? `Unresolved semantic conflicts: ${semantic.unresolvedConflictRefs.length}`
        : "Unresolved semantic conflicts: not evaluated",
      "Semantic boundary: Context Engineering refs are not Ontology primitive declarations or mutation authority.",
      `Ontology primitive refs: ${ontologyPrimitiveRefs.join(", ") || "none"}`,
      `Context Engineering refs: ${contextEngineeringRefs.join(", ") || "none"}`,
      `Direct impact: ${(conversation.impactFacing?.directSurfaceRefs ?? []).join(", ") || "none"}`,
      `Known issues: ${issueRefs.join(", ") || "none"}`,
      `Validation: ${validationRefs.join(", ") || "none"}`,
    ].join("\n"),
    ontologyRefs: ontologyPrimitiveRefs,
    ontologyPrimitiveRefs,
    contextEngineeringRefs,
    issueRefs,
    validationRefs,
    skillRefs: Array.from(new Set(skillRefs)),
    sourceRefs: [
      conversation.universalEntryRef,
      conversation.ontologyContextRef,
      conversation.contractFacing.semanticIntentContractRef,
      conversation.contractFacing.digitalTwinChangeContractRef,
      semantic?.resolverRunRef,
    ].filter((ref): ref is string => typeof ref === "string" && ref.length > 0),
    ...(semantic
      ? {
          canonicalTermRefs: semantic.canonicalTermRefs,
          semanticConflictRefs: semantic.unresolvedConflictRefs,
        }
      : {}),
  };
}
