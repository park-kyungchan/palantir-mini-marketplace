/**
 * @stable — ApprovalRef primitive (prim-learn-22, v1.51.0)
 *
 * Prompt-to-DTC contracts need proof that a human approved the user-visible
 * meaning or change boundary. This primitive keeps that proof typed without
 * retaining the raw prompt by default.
 *
 * Authority chain:
 *   Palantir AI FDE / AIP Chatbot confirmation model
 *     ↓
 *   palantir-mini prompt-front-door approval cards
 *     ↓
 *   schemas/ontology/primitives/approval-ref.ts (this file)
 *     ↓
 *   shared-core re-export
 *
 * @owner palantirkc-ontology
 * @purpose Structured user approval provenance for Prompt-to-DTC contracts
 */

export const APPROVAL_REF_SCHEMA_VERSION = "prompt-front-door/approval-ref/v1";

export type PromptRuntime = "claude" | "codex" | "cursor" | "gemini" | "unknown";

export type ApprovalSurface =
  | "semantic-intent"
  | "digital-twin-change"
  | "prompt-boundary-field";

export interface StructuredApprovalRef {
  readonly schemaVersion: typeof APPROVAL_REF_SCHEMA_VERSION;
  readonly kind: "user-explicit-natural-language";
  readonly promptId: string;
  readonly promptHash: string;
  readonly sessionId: string;
  readonly runtime: PromptRuntime;
  readonly approvedAt: string;
  readonly userVisibleSummaryHash: string;
  readonly userAnswerExcerpt: string;
  readonly approvalSurface: ApprovalSurface;
}

export type ApprovalRef = string | StructuredApprovalRef;

export function isStructuredApprovalRef(ref: ApprovalRef | undefined): ref is StructuredApprovalRef {
  return typeof ref === "object" && ref !== null;
}

export function isApprovalRef(ref: unknown): ref is ApprovalRef {
  if (typeof ref === "string") return ref.trim().length > 0;
  if (!isStructuredApprovalRef(ref as ApprovalRef | undefined)) return false;
  const structured = ref as Partial<StructuredApprovalRef>;
  return (
    structured.schemaVersion === APPROVAL_REF_SCHEMA_VERSION &&
    structured.kind === "user-explicit-natural-language" &&
    typeof structured.promptId === "string" &&
    structured.promptId.length > 0 &&
    typeof structured.promptHash === "string" &&
    structured.promptHash.length > 0 &&
    typeof structured.sessionId === "string" &&
    structured.sessionId.length > 0 &&
    typeof structured.approvedAt === "string" &&
    structured.approvedAt.length > 0 &&
    typeof structured.userVisibleSummaryHash === "string" &&
    structured.userVisibleSummaryHash.length > 0 &&
    typeof structured.userAnswerExcerpt === "string" &&
    structured.userAnswerExcerpt.length > 0
  );
}

// --- Foundry equivalence (Prompt-to-DTC control-plane provenance) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "Prompt-to-DTC user approval provenance; analogous to action submission confirmation evidence, but palantir-mini-native",
};
export { categoryFoundryEquivalent as approvalRefFoundryEquivalent };
