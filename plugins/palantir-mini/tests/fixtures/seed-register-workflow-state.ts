// palantir-mini test fixture — OE-2 register-seam workflow-state seeding.
//
// The direct `register` seam re-verifies the persisted approved-SIC snapshot via
// `isApprovedSemanticIntentContract` (OE-2 / OP-2). Register reads it through
// `readPreviousWorkflowState` keyed by `ontology-engineering-workflow:<sessionId>`.
// This helper writes such a state carrying a GENUINELY minted snapshot so the
// AUTHORIZED register tests authorize on the unforgeable minted approvalRef — not on
// a caller-supplied `status:"approved"` string. The NEGATIVE tests still fail on
// their intended gate (un-approved DTC / grade-not-passed), the snapshot being
// present so the failure is ABOUT those gates, not a missing snapshot.

import {
  ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
  type OntologyEngineeringWorkflowState,
  writeOntologyEngineeringWorkflowState,
} from "../../lib/ontology-engineering-workflow";
import { mintApprovedSemanticIntentContract } from "./minted-approved-sic";

/**
 * Persist a workflow state keyed to `sessionId` carrying a genuinely-minted
 * approved-SIC snapshot. Returns the snapshot's contractId.
 */
export function seedMintedApprovedSicWorkflowState(
  projectRoot: string,
  sessionId: string,
): string {
  const minted = mintApprovedSemanticIntentContract();
  const now = "2026-06-14T00:00:00.000Z";
  const state: OntologyEngineeringWorkflowState = {
    schemaVersion: ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
    contractId: `ontology-engineering-workflow:${sessionId}`,
    projectRoot,
    fdeSessionId: sessionId,
    fdeSessionRef: `fde-ontology-engineering://session/${sessionId}`,
    semanticIntentContractRef: minted.contractId,
    semanticIntentContractStatus: "approved",
    digitalTwinChangeContractRef: "dtc:approved-1",
    digitalTwinChangeContractStatus: "approved",
    phase: "digital-twin-approved",
    allowedNextActions: ["status"],
    mutationAuthorized: false,
    sourceRefs: [`fde-ontology-engineering://session/${sessionId}`],
    turnDecisionSpecs: [],
    userDecisionRecords: [],
    decisionLedgerAuditFindings: [],
    approvedSemanticIntentContractSnapshot: minted,
    createdAt: now,
    updatedAt: now,
  };
  writeOntologyEngineeringWorkflowState(state);
  return minted.contractId;
}
