import type { PromptContractRefs, PromptEnvelope, PromptFrontDoorState } from "./envelope";
import { withPromptState } from "./envelope";

const ALLOWED_TRANSITIONS: Record<PromptFrontDoorState, readonly PromptFrontDoorState[]> = {
  captured: [
    "semantic_intent_questions_open",
    "semantic_intent_drafted",
    "semantic_intent_user_review",
    "superseded",
  ],
  semantic_intent_questions_open: ["semantic_intent_user_review", "superseded"],
  semantic_intent_drafted: [
    "semantic_intent_questions_open",
    "semantic_intent_user_review",
    "semantic_intent_approved",
    "superseded",
  ],
  semantic_intent_user_review: ["semantic_intent_approved", "superseded"],
  semantic_intent_approved: [
    "digital_twin_questions_open",
    "digital_twin_drafted",
    "digital_twin_user_review",
    "superseded",
  ],
  digital_twin_questions_open: ["digital_twin_user_review", "superseded"],
  digital_twin_drafted: [
    "digital_twin_questions_open",
    "digital_twin_user_review",
    "digital_twin_approved",
    "superseded",
  ],
  digital_twin_user_review: ["digital_twin_approved", "superseded"],
  digital_twin_approved: ["superseded"],
  superseded: [],
};

export interface PromptStateTransitionResult {
  readonly ok: boolean;
  readonly reason: string;
}

export function canTransitionPromptState(
  from: PromptFrontDoorState,
  to: PromptFrontDoorState,
): PromptStateTransitionResult {
  if (from === to) {
    return { ok: true, reason: "state is unchanged" };
  }
  if (ALLOWED_TRANSITIONS[from].includes(to)) {
    return { ok: true, reason: "transition allowed" };
  }
  return { ok: false, reason: `transition ${from} -> ${to} is not allowed` };
}

export function transitionPromptEnvelope(
  envelope: PromptEnvelope,
  to: PromptFrontDoorState,
  options: PromptContractRefs & {
    readonly supersededByPromptId?: string;
  } = {},
): PromptEnvelope {
  const transition = canTransitionPromptState(envelope.state, to);
  if (!transition.ok) {
    throw new Error(transition.reason);
  }

  const next = withPromptState(envelope, to, {
    ...envelope.contractRefs,
    semanticIntentContractRef:
      options.semanticIntentContractRef ?? envelope.contractRefs.semanticIntentContractRef,
    digitalTwinChangeContractRef:
      options.digitalTwinChangeContractRef ?? envelope.contractRefs.digitalTwinChangeContractRef,
    approvalRef: options.approvalRef ?? envelope.contractRefs.approvalRef,
    semanticIntentApprovalRef:
      options.semanticIntentApprovalRef ?? envelope.contractRefs.semanticIntentApprovalRef,
    digitalTwinApprovalRef:
      options.digitalTwinApprovalRef ?? envelope.contractRefs.digitalTwinApprovalRef,
  });

  if (to === "superseded" && options.supersededByPromptId) {
    return { ...next, supersededByPromptId: options.supersededByPromptId };
  }
  return next;
}
