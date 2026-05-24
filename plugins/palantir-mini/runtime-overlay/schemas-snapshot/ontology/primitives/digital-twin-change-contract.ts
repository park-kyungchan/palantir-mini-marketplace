/**
 * @stable — DigitalTwinChangeContract primitive (prim-learn-26, v1.51.0)
 *
 * User-approved Digital Twin change boundary for Prompt-to-DTC execution.
 * Captures branch, permission, replay, observability, tool-surface, and
 * evaluation expectations as typed control-plane data.
 *
 * @owner palantirkc-ontology
 * @purpose Approved change boundary for ontology-affecting AI agent work
 */

import type { ApprovalRef } from "./approval-ref";
import type {
  BranchPolicyRef,
  MutationSurfaceRef,
  OntologyEngineeringRef,
  PermissionPolicyRef,
  ValidationPackRef,
} from "./ontology-engineering-ref";

export const DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION =
  "prompt-dtc/digital-twin-change-contract/v2";

export type DigitalTwinChangeContractStatus = "draft" | "approved" | "superseded";

export type DigitalTwinRiskKind =
  | "permission"
  | "branch-proposal"
  | "tool-surface"
  | "replay-migration"
  | "storage-indexing"
  | "observability"
  | "runtime-portability"
  | "evaluation";

export interface DigitalTwinRiskRecord {
  readonly riskId: string;
  readonly kind: DigitalTwinRiskKind;
  readonly status: "not-applicable" | "accepted" | "mitigated" | "open";
  readonly description: string;
  readonly mitigation?: string;
  readonly designAlternative?: string;
}

export interface DigitalTwinChangeContract {
  readonly schemaVersion: typeof DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION;
  readonly contractId: string;
  readonly status: DigitalTwinChangeContractStatus;
  readonly semanticIntentContractRef: string;

  /** Backward-compatible runtime fields. */
  readonly affectedSurfaces: readonly string[];
  readonly changeBoundary: string;
  readonly branchProposalPolicy: string;
  readonly permissionBoundary: string;
  readonly replayMigrationPlan: string;
  readonly observabilityPlan: string;
  readonly toolSurfaceReadiness: string;
  readonly evaluationPlan: string;

  /** Additive typed control-plane fields. */
  readonly touchedOntologyRefs?: readonly OntologyEngineeringRef[];
  readonly permittedMutationSurfaces?: readonly MutationSurfaceRef[];
  readonly requiredEvaluationRefs?: readonly ValidationPackRef[];
  readonly requiredBranchPolicyRef?: BranchPolicyRef;
  readonly requiredPermissionPolicyRef?: PermissionPolicyRef;

  readonly risks: readonly DigitalTwinRiskRecord[];
  readonly approvalRef?: ApprovalRef;
}

export function isDigitalTwinChangeContract(x: unknown): x is DigitalTwinChangeContract {
  if (typeof x !== "object" || x === null) return false;
  const contract = x as DigitalTwinChangeContract;
  return (
    contract.schemaVersion === DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION &&
    typeof contract.contractId === "string" &&
    contract.contractId.length > 0 &&
    (contract.status === "draft" ||
      contract.status === "approved" ||
      contract.status === "superseded") &&
    typeof contract.semanticIntentContractRef === "string" &&
    contract.semanticIntentContractRef.length > 0 &&
    Array.isArray(contract.affectedSurfaces) &&
    Array.isArray(contract.risks)
  );
}

// --- Foundry equivalence (Prompt-to-DTC change boundary) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "Approved Digital Twin change boundary for palantir-mini Prompt-to-DTC governance; plugin control-plane primitive",
};
export { categoryFoundryEquivalent as digitalTwinChangeContractFoundryEquivalent };
