/**
 * @stable — OntologyContextApproval primitive (prim-context-01, v1.55.0)
 *
 * Promotes the OntologyContextApproval type shape to schema-level authority.
 * Addresses the gap where OntologyContextSeed was permanently stuck at
 * approvalState: "unapproved-context-seed" — there was no path to promote a
 * retrieved context into an approved boundary that downstream agents
 * (project-implementer etc.) can rely on without re-running the semantic
 * intent gate.
 *
 * This file contains TYPE SHAPE ONLY — no classifier logic, no loader, no
 * createOntologyContextApproval() factory. Those remain in the plugin
 * (lib/ontology-context/approval.ts) which depends on crypto + fs.
 *
 * Three approval kinds:
 *   auto-low-risk  — emitted by pm_intent_router when requiredDtc=false AND
 *                    selectedCapabilities>0 AND impactContext.confidence=high
 *   lead-approved  — emitted by pm_lead_brief when Lead explicitly approves
 *                    a pending context approval ref
 *   user-approved  — emitted by semantic intent gate workbench on user sign-off
 *
 * Authority chain: research/ → schemas/ (this file) → shared-core/ →
 * plugin lib (createOntologyContextApproval + loadOntologyContextApproval) →
 * callers (pm_intent_router + pm_lead_brief).
 *
 * Promoted at: v1.55.0 (foamy-giggling-kettle PR-4).
 *
 * @owner palantirkc-ontology
 * @since v1.55.0
 */

import type { FoundryEquivalence } from "./category-foundry-equivalent";

export const ONTOLOGY_CONTEXT_APPROVAL_SCHEMA_VERSION =
  "palantir-mini/ontology-context-approval/v1" as const;

/**
 * Kind of approval that produced an OntologyContextApproval record.
 * Determines the trust level downstream agents may apply when consuming
 * the approved capability + surface boundary.
 */
export type OntologyContextApprovalKind =
  | "auto-low-risk"
  | "lead-approved"
  | "user-approved";

/**
 * Canonical schema shape for an OntologyContextApproval.
 * Created by the plugin's createOntologyContextApproval() factory;
 * loaded by loadOntologyContextApproval(); listed by listPendingContextApprovals().
 *
 * approvalId is a deterministic sha256:16 over the key inputs so that
 * identical intents produce identical approvalIds (idempotency).
 */
export interface OntologyContextApproval {
  readonly schemaVersion: typeof ONTOLOGY_CONTEXT_APPROVAL_SCHEMA_VERSION;
  /** Deterministic sha256:16 over {sourceQueryRef, universalOntologyEntryRef, approvalKind, approvedAt}. */
  readonly approvalId: string;
  /** ISO8601 timestamp of approval creation. */
  readonly approvedAt: string;
  /** ontologyContextQueryRef that was the source of the approval. */
  readonly sourceQueryRef: string;
  /** The UniversalOntologyEntry ref that this approval is bound to. */
  readonly universalOntologyEntryRef: string;
  /** Capability refs approved for the task (from capabilityContext.selectedCapabilityIds). */
  readonly approvedCapabilityRefs: readonly string[];
  /** Capability refs rejected for the task (from capabilityContext.rejectedCapabilityIds). */
  readonly rejectedCapabilityRefs: readonly string[];
  /** Surface refs approved for the task (from impactContext.directSurfaceRefs). */
  readonly approvedSurfaceRefs: readonly string[];
  /** Surface refs explicitly forbidden for the task. */
  readonly forbiddenSurfaceRefs: readonly string[];
  /** Kind of approval that produced this record. */
  readonly approvalKind: OntologyContextApprovalKind;
  /** byWhom.identity of the approving agent/runtime. */
  readonly approverIdentity: string;
  /** Prompt identity captured at time of approval (optional). */
  readonly promptId?: string;
  /** Prompt hash captured at time of approval (optional). */
  readonly promptHash?: string;
}

/**
 * Type guard for schema version literal.
 */
export function isOntologyContextApprovalSchemaVersionV1(
  candidate: unknown,
): candidate is typeof ONTOLOGY_CONTEXT_APPROVAL_SCHEMA_VERSION {
  return candidate === ONTOLOGY_CONTEXT_APPROVAL_SCHEMA_VERSION;
}

/**
 * Type guard for OntologyContextApproval.
 */
export function isOntologyContextApproval(
  candidate: unknown,
): candidate is OntologyContextApproval {
  if (typeof candidate !== "object" || candidate === null) return false;
  const approval = candidate as OntologyContextApproval;
  return (
    approval.schemaVersion === ONTOLOGY_CONTEXT_APPROVAL_SCHEMA_VERSION &&
    typeof approval.approvalId === "string" &&
    approval.approvalId.length > 0 &&
    typeof approval.sourceQueryRef === "string" &&
    typeof approval.universalOntologyEntryRef === "string" &&
    typeof approval.approvalKind === "string" &&
    (approval.approvalKind === "auto-low-risk" ||
      approval.approvalKind === "lead-approved" ||
      approval.approvalKind === "user-approved")
  );
}

// --- Foundry equivalence (per-prompt approved retrieval boundary) ---
import type {} from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "Per-prompt approved retrieval boundary for palantir-mini's context-routing layer; no Foundry object-type equivalent (control-plane substrate primitive).",
};
export { categoryFoundryEquivalent as ontologyContextApprovalFoundryEquivalent };
