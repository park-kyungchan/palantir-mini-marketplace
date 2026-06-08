/**
 * palantir-mini SELF-ONTOLOGY — CapabilityContract as a registered ObjectType + its 19
 * instances (Wave 2, harness redesign self-model build). Mirrors the `skill.objecttype.ts`
 * idiom: ONE `CapabilityContract` ObjectType (the type) + pm's live surface capability /
 * binding contracts seeded as instances.
 *
 * pm's runtime-neutral capability-binding surface modeled AS ontology: `core/contracts/`
 * declares the neutral contract vocabulary that unifies skills, agents, and tools under
 * one routing surface. The two LIVE enumerable contract sets are the 9
 * `NEUTRAL_CONTRACT_TYPE_NAMES` (the surface capability/binding Interfaces — agent / skill
 * / tool / retrieval / application-variable / runtime-projection contracts) and the 10
 * `WORKFLOW_FAMILIES` (each backing one `WorkflowFamilyEnforcementContract` in the
 * registry). Each is one CapabilityContract identity. This file declares the type and
 * seeds the 19 contracts — the snapshot OWNS the seed (it is the authority), so it does
 * NOT import the contracts tree uphill. The paired registration test cross-checks these
 * 19 contractNames against the LIVE `NEUTRAL_CONTRACT_TYPE_NAMES` + `WORKFLOW_FAMILIES`
 * arrays so the self-model fails loud if pm's contract surface drifts.
 *
 * Count provenance (LIVE-verified): `core/contracts/workflow-family-enforcement.ts`
 * declares `NEUTRAL_CONTRACT_TYPE_NAMES` (9 members) + `WORKFLOW_FAMILIES` (10 members) =
 * 19 named capability/binding contracts. Each instance carries identity (`contractName` =
 * the contract type name or family id, the PK) plus stored facts: `surfaceKind`
 * ("neutral-contract" for the 9 type names, "workflow-family" for the 10 families),
 * `family` (the family id for family-backed contracts, else "neutral"), `requiredContracts`
 * (the CONTRACT_REQUIREMENTS key each family enforces; "varies" for the neutral type names),
 * and `mutationCapability` (whether the contract gates a mutation boundary).
 *
 * @owner palantirkc-ontology
 * @purpose Wave-2 self-Ontology ObjectType (M-SELF, harness redesign)
 */

import {
  type ObjectTypeDeclaration,
  OBJECT_TYPE_REGISTRY,
  objectTypeRid,
} from "../primitives/object-type";

/** Stable RID for the self-Ontology CapabilityContract ObjectType. */
export const CAPABILITY_CONTRACT_OBJECT_TYPE_RID = objectTypeRid(
  "pm.self.ontology/object-type/capability-contract",
);

/**
 * CapabilityContract modeled as a Palantir ObjectType. `contractName` is the stable
 * primary key (the neutral contract type name or workflow-family id); `surfaceKind`,
 * `family`, `requiredContracts`, and `mutationCapability` are stored facts carried on each
 * registered INSTANCE below. The PascalCase apiName mirrors the generated symbol.
 */
export const CAPABILITY_CONTRACT_OBJECT_TYPE: ObjectTypeDeclaration = {
  rid: CAPABILITY_CONTRACT_OBJECT_TYPE_RID,
  apiName: "CapabilityContract",
  name: "CapabilityContract",
  description:
    "palantir-mini runtime-neutral capability-binding surface modeled as an ObjectType: " +
    "one instance per named contract in core/contracts (the 9 NEUTRAL_CONTRACT_TYPE_NAMES " +
    "surface Interfaces + the 10 WORKFLOW_FAMILIES enforcement contracts). contractName " +
    "identity plus surfaceKind, family, requiredContracts, and mutationCapability; the " +
    "enforcement logic lives in core/contracts/workflow-family-enforcement.ts, not here.",
  primaryKeyProperty: "contractName",
  titleProperty: "contractName",
  properties: [
    { name: "contractName", type: "string" },
    { name: "surfaceKind", type: '"neutral-contract" | "workflow-family"' },
    { name: "family", type: "string" },
    { name: "requiredContracts", type: "string" },
    { name: "mutationCapability", type: '"read-only" | "mutating"' },
  ],
};

/**
 * A registered CapabilityContract instance — stable contract identity (the type name or
 * family id) plus the four stored facts read off the contract surface.
 */
export interface CapabilityContractInstance {
  readonly contractName: string;
  readonly surfaceKind: "neutral-contract" | "workflow-family";
  readonly family: string;
  readonly requiredContracts: string;
  readonly mutationCapability: "read-only" | "mutating";
}

/**
 * The 19 CapabilityContract instances — pm's LIVE named capability/binding contracts: the
 * 9 NEUTRAL_CONTRACT_TYPE_NAMES (surface Interfaces) followed by the 10 WORKFLOW_FAMILIES
 * (enforcement contracts), in their respective declaration order. Snapshot-owned seed (no
 * contracts-tree import); the registration test cross-checks this set against the live
 * NEUTRAL_CONTRACT_TYPE_NAMES + WORKFLOW_FAMILIES arrays and fails on any drift. The
 * requiredContracts fact for each family is the CONTRACT_REQUIREMENTS key it enforces.
 */
export const CAPABILITY_CONTRACT_INSTANCES: readonly CapabilityContractInstance[] = [
  // 9 NEUTRAL_CONTRACT_TYPE_NAMES — surface capability/binding Interfaces.
  { contractName: "WorkflowFamilyEnforcementContract", surfaceKind: "neutral-contract", family: "neutral", requiredContracts: "varies", mutationCapability: "mutating" },
  { contractName: "WorkflowPhaseContract", surfaceKind: "neutral-contract", family: "neutral", requiredContracts: "varies", mutationCapability: "mutating" },
  { contractName: "ComplexE2EScenarioDeclaration", surfaceKind: "neutral-contract", family: "neutral", requiredContracts: "varies", mutationCapability: "read-only" },
  { contractName: "AgentSurfaceContract", surfaceKind: "neutral-contract", family: "neutral", requiredContracts: "varies", mutationCapability: "mutating" },
  { contractName: "SkillSurfaceContract", surfaceKind: "neutral-contract", family: "neutral", requiredContracts: "varies", mutationCapability: "mutating" },
  { contractName: "ToolSurfaceContract", surfaceKind: "neutral-contract", family: "neutral", requiredContracts: "varies", mutationCapability: "mutating" },
  { contractName: "RetrievalContextContract", surfaceKind: "neutral-contract", family: "neutral", requiredContracts: "varies", mutationCapability: "read-only" },
  { contractName: "ApplicationVariableContract", surfaceKind: "neutral-contract", family: "neutral", requiredContracts: "varies", mutationCapability: "mutating" },
  { contractName: "RuntimeAdapterProjection", surfaceKind: "neutral-contract", family: "neutral", requiredContracts: "varies", mutationCapability: "read-only" },
  // 10 WORKFLOW_FAMILIES — each backs one WorkflowFamilyEnforcementContract in the registry.
  { contractName: "ontologyEngineering", surfaceKind: "workflow-family", family: "ontologyEngineering", requiredContracts: "sicAndDtc", mutationCapability: "mutating" },
  { contractName: "semanticIntentAndRouting", surfaceKind: "workflow-family", family: "semanticIntentAndRouting", requiredContracts: "sicOnly", mutationCapability: "mutating" },
  { contractName: "researchAndContextEngineering", surfaceKind: "workflow-family", family: "researchAndContextEngineering", requiredContracts: "sicOnly", mutationCapability: "read-only" },
  { contractName: "leadOrchestrationAndDelegation", surfaceKind: "workflow-family", family: "leadOrchestrationAndDelegation", requiredContracts: "workContract", mutationCapability: "mutating" },
  { contractName: "hookAndPolicyEnforcement", surfaceKind: "workflow-family", family: "hookAndPolicyEnforcement", requiredContracts: "fullMutation", mutationCapability: "mutating" },
  { contractName: "runtimeAdapterAndParity", surfaceKind: "workflow-family", family: "runtimeAdapterAndParity", requiredContracts: "workContract", mutationCapability: "read-only" },
  { contractName: "validationEvalAndHarness", surfaceKind: "workflow-family", family: "validationEvalAndHarness", requiredContracts: "workContract", mutationCapability: "read-only" },
  { contractName: "releaseAndShipping", surfaceKind: "workflow-family", family: "releaseAndShipping", requiredContracts: "workContract", mutationCapability: "mutating" },
  { contractName: "lineageReplayAndLearning", surfaceKind: "workflow-family", family: "lineageReplayAndLearning", requiredContracts: "none", mutationCapability: "read-only" },
  { contractName: "applicationAndChatbotAuthoring", surfaceKind: "workflow-family", family: "applicationAndChatbotAuthoring", requiredContracts: "sicAndDtc", mutationCapability: "mutating" },
];

// Register the CapabilityContract ObjectType (the type). The 19 instances above are data
// the self-model exposes + the registration test counts; instances are not type-registered.
OBJECT_TYPE_REGISTRY.register(CAPABILITY_CONTRACT_OBJECT_TYPE);
