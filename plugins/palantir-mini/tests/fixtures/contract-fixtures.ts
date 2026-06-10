/**
 * Shared SIC / DTC test fixtures.
 *
 * `makeSic` / `makeDtc` build a minimal, schema-valid lib SemanticIntentContract /
 * DigitalTwinChangeContract with sane defaults — INCLUDING the now-required
 * `schemaVersion` (single-sourced from the primitive consts). Tests that only
 * need *a* well-formed contract spread the helper and override the fields they
 * assert on, instead of restating every required field (and re-minting
 * `schemaVersion`) inline.
 *
 * Defaults satisfy the primitive guards (isSemanticIntentContract /
 * isDigitalTwinChangeContract) so a `makeSic()` / `makeDtc()` value is a valid
 * primitive contract as well as a valid lib mirror.
 */
import type {
  DigitalTwinChangeContract,
  SemanticIntentContract,
} from "../../lib/lead-intent/contracts";
import { SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/semantic-intent-contract";
import { DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION } from "#schemas/ontology/primitives/digital-twin-change-contract";

export function makeSic(
  overrides: Partial<SemanticIntentContract> = {},
): SemanticIntentContract {
  return {
    schemaVersion: SEMANTIC_INTENT_CONTRACT_SCHEMA_VERSION,
    contractId: "semantic-intent:fixture",
    status: "draft",
    rawIntent: "Fixture intent",
    confirmedIntent: "Fixture confirmed intent",
    nonGoals: [],
    approvedNouns: [],
    approvedVerbs: [],
    affectedSurfaces: [],
    permissionsAndProposal: "",
    acceptedRisks: [],
    downstreamAllowed: [],
    downstreamForbidden: [],
    clarificationQuestions: [],
    ...overrides,
  };
}

export function makeDtc(
  overrides: Partial<DigitalTwinChangeContract> = {},
): DigitalTwinChangeContract {
  return {
    schemaVersion: DIGITAL_TWIN_CHANGE_CONTRACT_SCHEMA_VERSION,
    contractId: "digital-twin-change:fixture",
    status: "draft",
    semanticIntentContractRef: "semantic-intent:fixture",
    affectedSurfaces: [],
    changeBoundary: "",
    branchProposalPolicy: "",
    permissionBoundary: "",
    replayMigrationPlan: "",
    observabilityPlan: "",
    toolSurfaceReadiness: "",
    evaluationPlan: "",
    risks: [],
    ...overrides,
  };
}
