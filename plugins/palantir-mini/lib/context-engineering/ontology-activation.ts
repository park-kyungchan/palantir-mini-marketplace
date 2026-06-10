// palantir-mini — AIP #4 Ontology activation for approved Layer 0 intent.

import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../lead-intent/contracts";
import { semanticIntentContractRefFromApproved } from "../semantic-intent/approved-contract";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

export interface OntologyActivation {
  semanticIntentContractRef: string;
  approvedNouns: readonly string[];
  approvedVerbs: readonly string[];
  affectedSurfaces: readonly string[];
  forbiddenSurfaces: readonly string[];
  ontologyRefs: readonly string[];
  actionRefs: readonly string[];
  evaluationDirection: "directional-only";
  toolBoundaryDirection: "directional-only";
}

export interface OntologyContextSeed {
  approvalState: "unapproved-context-seed";
  sourceEntryId: string;
  nouns: readonly string[];
  verbs: readonly string[];
  surfaceHints: readonly string[];
  capabilityHints: readonly string[];
  laneRefs: readonly string[];
  ontologyRefs: readonly string[];
  actionRefs: readonly string[];
  evaluationDirection: "directional-only";
  toolBoundaryDirection: "directional-only";
}

export type OntologyRoutingContext = OntologyActivation | OntologyContextSeed;

export function deriveOntologyActivation(
  contract: SemanticIntentContract,
): OntologyActivation {
  const semanticIntentContractRef = semanticIntentContractRefFromApproved(contract);

  return {
    semanticIntentContractRef,
    approvedNouns: contract.approvedNouns,
    approvedVerbs: contract.approvedVerbs,
    affectedSurfaces: contract.affectedSurfaces,
    forbiddenSurfaces: contract.downstreamForbidden,
    ontologyRefs: [
      ...(contract.approvedObjectTypeRefs ?? []),
      ...(contract.approvedLinkTypeRefs ?? []),
      ...(contract.approvedSurfaceRefs ?? []),
      ...(contract.approvedLaneRefs ?? []),
    ].map(String),
    actionRefs: [
      ...(contract.approvedActionTypeRefs ?? []),
      ...(contract.approvedFunctionRefs ?? []),
    ].map(String),
    evaluationDirection: "directional-only",
    toolBoundaryDirection: "directional-only",
  };
}

export function draftDigitalTwinFromOntologyActivation(
  contract: SemanticIntentContract,
): DigitalTwinChangeContract {
  const activation = deriveOntologyActivation(contract);
  return {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: `dtc:${activation.semanticIntentContractRef}`,
    status: "draft",
    semanticIntentContractRef: activation.semanticIntentContractRef,
    affectedSurfaces: [...activation.affectedSurfaces],
    changeBoundary:
      "AIP #4 Ontology activation is limited to the approved nouns, verbs, surfaces, and non-goals from the SemanticIntentContract.",
    branchProposalPolicy:
      "Branch/proposal policy must be explicit before mutation; no production-risk mutation is inferred from raw prompt text.",
    permissionBoundary:
      "Permission boundaries are inherited from approved surfaces and must stay non-mutating until user approval.",
    replayMigrationPlan:
      "Replay and migration work remains directional unless a later approved DigitalTwinChangeContract expands it.",
    observabilityPlan:
      "Emit prompt, SemanticIntentContract, DigitalTwinChangeContract, and ontology activation refs into lineage.",
    toolSurfaceReadiness:
      "AIP #5 tool/context services are direction-only for this slice; tools may read context but not widen scope.",
    evaluationPlan:
      "AIP #7 lifecycle is direction-only for this slice; evals verify #3/#4 bridge completeness first.",
    touchedOntologyRefs: [...activation.ontologyRefs] as never,
    risks: [
      {
        riskId: "layer0.reversibility",
        kind: "branch-proposal",
        status: "mitigated",
        description: "Layer 0 activation stays branch/proposal scoped until explicit user approval.",
        mitigation: "Do not route implementation from raw prompt text; require approved contract refs.",
      },
    ],
    approvalRef: contract.approvalRef,
  };
}
