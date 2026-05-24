import type { SemanticConversationState } from "./semantic-conversation-state";

export const CHATBOT_STUDIO_RETRIEVAL_CONTEXT_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-retrieval-context/v1";

export interface ChatbotStudioRetrievalContext {
  readonly schemaVersion: typeof CHATBOT_STUDIO_RETRIEVAL_CONTEXT_SCHEMA_VERSION;
  readonly conversationStateId: string;
  readonly retrievedPrompt: string;
  readonly ontologyRefs: readonly string[];
  readonly skillRefs: readonly string[];
  readonly sourceRefs: readonly string[];
  /**
   * Document IDs included via document context retrieval (PR-12, opt-in).
   * Populated when `ontology_context_query` was called with
   * `includeDocumentContext:true`. Absent when document retrieval was not
   * requested.
   */
  readonly documentRefs?: readonly string[];
}

export function buildRetrievalContextFromConversation(
  conversation: SemanticConversationState,
): ChatbotStudioRetrievalContext {
  const ontologyRefs = [
    ...conversation.ontologyFacing.activatedObjectRefs,
    ...conversation.ontologyFacing.activatedActionRefs,
    ...conversation.ontologyFacing.activatedSurfaceRefs,
    ...conversation.ontologyFacing.activatedLaneRefs,
    ...(conversation.impactFacing?.directSurfaceRefs ?? []),
    ...(conversation.impactFacing?.downstreamSurfaceRefs ?? []),
    ...(conversation.issueFacing?.knownIssueIds ?? []),
    ...(conversation.validationFacing?.requiredValidationPacks ?? []),
  ];
  const skillRefs = [
    ...conversation.skillFacing.candidateSkillRefs.map((skill) => skill.skillId),
    ...conversation.skillFacing.selectedSkillRefs.map((skill) => skill.skillId),
  ];

  return {
    schemaVersion: CHATBOT_STUDIO_RETRIEVAL_CONTEXT_SCHEMA_VERSION,
    conversationStateId: conversation.stateId,
    retrievedPrompt: [
      `Goal: ${conversation.userFacing.confirmedGoal ?? conversation.userFacing.plainRequestSummary}`,
      `Lifecycle: ${conversation.lifecycle}`,
      `DTC ready: ${conversation.contractFacing.dtcReady ? "yes" : "no"}`,
      `Unresolved questions: ${conversation.userFacing.unresolvedQuestions.length}`,
      `Direct impact: ${(conversation.impactFacing?.directSurfaceRefs ?? []).join(", ") || "none"}`,
      `Known issues: ${(conversation.issueFacing?.knownIssueIds ?? []).join(", ") || "none"}`,
      `Validation: ${(
        conversation.validationFacing?.requiredValidationPacks ??
        conversation.projectFacing.requiredValidationPacks
      ).join(", ") || "none"}`,
    ].join("\n"),
    ontologyRefs,
    skillRefs: Array.from(new Set(skillRefs)),
    sourceRefs: [
      conversation.universalEntryRef,
      conversation.ontologyContextRef,
      conversation.contractFacing.semanticIntentContractRef,
      conversation.contractFacing.digitalTwinChangeContractRef,
    ].filter((ref): ref is string => typeof ref === "string" && ref.length > 0),
  };
}
