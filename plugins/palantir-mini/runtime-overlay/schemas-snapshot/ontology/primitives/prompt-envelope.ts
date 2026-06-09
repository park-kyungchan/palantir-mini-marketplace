/**
 * @stable — PromptEnvelope primitive (prim-learn-24, v1.51.0)
 *
 * Prompt-front-door identity envelope. Captures prompt continuity metadata
 * without requiring raw prompt retention.
 *
 * @owner palantirkc-ontology
 * @purpose Prompt identity and contract lineage carrier for Prompt-to-DTC
 */

import type { ApprovalRef, PromptRuntime } from "./approval-ref";

export const PROMPT_FRONT_DOOR_SCHEMA_VERSION = "prompt-front-door/v1";

export type PromptFrontDoorState =
  | "captured"
  | "semantic_intent_questions_open"
  | "semantic_intent_drafted"
  | "semantic_intent_user_review"
  | "semantic_intent_approved"
  | "digital_twin_questions_open"
  | "digital_twin_drafted"
  | "digital_twin_user_review"
  | "digital_twin_approved"
  | "superseded";

export interface PromptContractRefs {
  readonly semanticIntentContractRef?: string;
  readonly digitalTwinChangeContractRef?: string;
  readonly approvalRef?: ApprovalRef;
  readonly semanticIntentApprovalRef?: ApprovalRef;
  readonly digitalTwinApprovalRef?: ApprovalRef;
}

export interface PromptEnvelope {
  readonly schemaVersion: typeof PROMPT_FRONT_DOOR_SCHEMA_VERSION;
  readonly promptId: string;
  readonly promptHash: string;
  readonly promptExcerpt: string;
  readonly promptLength: number;
  readonly sessionId: string;
  readonly runtime: PromptRuntime;
  readonly projectRoot: string;
  readonly capturedAt: string;
  readonly state: PromptFrontDoorState;
  readonly contractRefs: PromptContractRefs;
  readonly previousPromptHash?: string;
  readonly supersededByPromptId?: string;
  readonly rawPrompt?: string;
}

export function isPromptEnvelope(x: unknown): x is PromptEnvelope {
  if (typeof x !== "object" || x === null) return false;
  const envelope = x as PromptEnvelope;
  return (
    envelope.schemaVersion === PROMPT_FRONT_DOOR_SCHEMA_VERSION &&
    typeof envelope.promptId === "string" &&
    envelope.promptId.length > 0 &&
    typeof envelope.promptHash === "string" &&
    envelope.promptHash.length > 0 &&
    typeof envelope.sessionId === "string" &&
    envelope.sessionId.length > 0 &&
    typeof envelope.projectRoot === "string" &&
    envelope.projectRoot.length > 0 &&
    typeof envelope.contractRefs === "object" &&
    envelope.contractRefs !== null
  );
}
