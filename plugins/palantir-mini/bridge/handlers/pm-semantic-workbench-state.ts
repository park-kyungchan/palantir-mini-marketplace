// Internal workbench-state exporter.
//
// This handler is intentionally not registered in bridge/mcp-server.ts. Phase F
// keeps the workbench as a plugin-internal or skill-only surface until the
// SemanticWorkbenchState shape is stable.

import {
  buildSemanticWorkbenchState,
  type BuildSemanticWorkbenchStateInput,
  type SemanticWorkbenchState,
} from "../../lib/chatbot-studio/workbench-state";
import type { SemanticConversationState } from "../../lib/chatbot-studio/semantic-conversation-state";
import type { FDEOntologyEngineeringSession } from "../../lib/fde-ontology-engineering/types";

export interface SemanticWorkbenchStateInput {
  readonly conversation: SemanticConversationState;
  readonly reviewTitle?: string;
  readonly nextAllowedActions?: readonly string[];
  readonly fdeEngineeringSession?: FDEOntologyEngineeringSession;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertSemanticWorkbenchStateInput(
  input: unknown,
): asserts input is SemanticWorkbenchStateInput {
  if (!isRecord(input) || !isRecord(input.conversation)) {
    throw new Error("pm_semantic_workbench_state requires a conversation object.");
  }

  if (typeof input.conversation.stateId !== "string") {
    throw new Error("pm_semantic_workbench_state conversation.stateId must be a string.");
  }

  if (input.reviewTitle !== undefined && typeof input.reviewTitle !== "string") {
    throw new Error("pm_semantic_workbench_state reviewTitle must be a string when provided.");
  }

  if (
    input.nextAllowedActions !== undefined &&
    (!Array.isArray(input.nextAllowedActions) ||
      !input.nextAllowedActions.every((action) => typeof action === "string"))
  ) {
    throw new Error("pm_semantic_workbench_state nextAllowedActions must be a string array.");
  }
}

export function pmSemanticWorkbenchState(
  input: SemanticWorkbenchStateInput,
): SemanticWorkbenchState {
  const builderInput: BuildSemanticWorkbenchStateInput = {
    conversation: input.conversation,
    reviewTitle: input.reviewTitle,
    nextAllowedActions: input.nextAllowedActions,
    fdeEngineeringSession: input.fdeEngineeringSession,
  };
  return buildSemanticWorkbenchState(builderInput);
}

export default async function handler(rawArgs: unknown): Promise<SemanticWorkbenchState> {
  assertSemanticWorkbenchStateInput(rawArgs);
  return pmSemanticWorkbenchState(rawArgs);
}
