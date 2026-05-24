// palantir-mini PR-13 — Deterministic application state for AIP Chatbot Studio reasoning loops.
// Variables pinned at loop start; subsequent tool inputs read pinned values; updates
// accumulate but do not cascade into pinned tool inputs.
//
// Plan: ~/.claude/plans/foamy-giggling-kettle.md lines 867-901.

import type { SemanticConversationState } from "./semantic-conversation-state";

export const CHATBOT_STUDIO_APPLICATION_STATE_SCHEMA_VERSION =
  "palantir-mini/chatbot-studio-application-state/v1";

export interface ChatbotStudioApplicationVariable {
  readonly variableId: string;
  readonly visibleToModel: boolean;
  readonly value: unknown;
  readonly updateMode: "deterministic";
}

export interface ChatbotStudioApplicationState {
  readonly schemaVersion: typeof CHATBOT_STUDIO_APPLICATION_STATE_SCHEMA_VERSION;
  readonly conversationStateId: string;
  readonly variables: readonly ChatbotStudioApplicationVariable[];
}

// ─── PR-13 deterministic pin/apply layer ─────────────────────────────────────

export type ApplicationStateUpdatePolicy =
  | "deterministic-tool"
  | "deterministic-llm"
  | "citation";

export interface ApplicationStateVariable {
  readonly variableId: string;
  readonly kind: "string" | "object-set";
  readonly description: string;
  readonly currentValue: unknown;
  readonly updatePolicy: ApplicationStateUpdatePolicy;
}

export interface PinnedSnapshot {
  readonly loopId: string;
  readonly pinnedAt: string;
  readonly variables: Readonly<Record<string, unknown>>;
}

export interface ReasoningLoopApplicationState {
  readonly variables: readonly ApplicationStateVariable[];
  readonly pinned: readonly PinnedSnapshot[];
}

export function pinApplicationStateForReasoningLoop(
  state: ReasoningLoopApplicationState,
  loopId: string,
  now?: Date,
): ReasoningLoopApplicationState {
  const pinnedAt = (now ?? new Date()).toISOString();
  const snapshot: PinnedSnapshot = {
    loopId,
    pinnedAt,
    variables: Object.fromEntries(state.variables.map((v) => [v.variableId, v.currentValue])),
  };
  return { variables: state.variables, pinned: [...state.pinned, snapshot] };
}

export interface ApplicationStateUpdate {
  readonly variableId: string;
  readonly nextValue: unknown;
}

export function applyApplicationStateUpdate(
  state: ReasoningLoopApplicationState,
  update: ApplicationStateUpdate,
): ReasoningLoopApplicationState {
  // Updates currentValue but does NOT alter pinned snapshots.
  const variables = state.variables.map((v) =>
    v.variableId !== update.variableId ? v : { ...v, currentValue: update.nextValue },
  );
  return { variables, pinned: state.pinned };
}

export function readVariableForLoop(
  state: ReasoningLoopApplicationState,
  loopId: string,
  variableId: string,
): unknown {
  // Find most-recent snapshot for this loop; fall back to currentValue if absent.
  const snapshot = [...state.pinned].reverse().find((s) => s.loopId === loopId);
  if (snapshot && variableId in snapshot.variables) return snapshot.variables[variableId];
  return state.variables.find((v) => v.variableId === variableId)?.currentValue;
}

// ─── Existing conversation-state builder ──────────────────────────────────────

export function buildApplicationStateFromConversation(
  conversation: SemanticConversationState,
): ChatbotStudioApplicationState {
  return {
    schemaVersion: CHATBOT_STUDIO_APPLICATION_STATE_SCHEMA_VERSION,
    conversationStateId: conversation.stateId,
    variables: [
      {
        variableId: "semantic.lifecycle",
        visibleToModel: true,
        value: conversation.lifecycle,
        updateMode: "deterministic",
      },
      {
        variableId: "semantic.approval.dtcReady",
        visibleToModel: true,
        value: conversation.contractFacing.dtcReady,
        updateMode: "deterministic",
      },
      {
        variableId: "semantic.project.root",
        visibleToModel: false,
        value: conversation.projectFacing.projectRoot,
        updateMode: "deterministic",
      },
      {
        variableId: "semantic.unresolvedQuestionCount",
        visibleToModel: true,
        value: conversation.userFacing.unresolvedQuestions.length,
        updateMode: "deterministic",
      },
      {
        variableId: "semantic.impact.directSurfaces",
        visibleToModel: true,
        value: conversation.impactFacing?.directSurfaceRefs ?? [],
        updateMode: "deterministic",
      },
      {
        variableId: "semantic.issues.knownIssueIds",
        visibleToModel: true,
        value: conversation.issueFacing?.knownIssueIds ?? [],
        updateMode: "deterministic",
      },
      {
        variableId: "semantic.validation.requiredPacks",
        visibleToModel: true,
        value:
          conversation.validationFacing?.requiredValidationPacks ??
          conversation.projectFacing.requiredValidationPacks,
        updateMode: "deterministic",
      },
    ],
  };
}
