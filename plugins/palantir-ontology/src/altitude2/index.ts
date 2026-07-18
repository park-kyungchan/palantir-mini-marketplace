// Public barrel for src/altitude2/ (ledger row P440). Every Altitude-2
// capability the everyday operator surface exposes is re-exported here, and
// `operation-profile.ts`'s `DEFAULT_OPERATION_PROFILE_CAPABILITIES` pins
// this exact export-name set as the default routine-consumer-operation
// profile (A2-002). No Altitude-1 construction function
// (`openFdeSession`/`recordTurn`/`transitionSession`/`proposeSic`/
// `approveSic`/`proposeDtc`/`finalizeDtc`/`stageConstruction`/
// `evaluateReadiness`/`validateConstruction`) and no raw governance
// authority-minting primitive (`issueMutationAuthority`/`createMintLedger`/
// `createFileWriteExecutor`, `src/governance/index.ts`) is re-exported from
// here — `routeCommit` is this package's ONE Altitude-2 mutation-authority
// touchpoint, and it is a governed, session-state-gated ROUTING call, never
// a standalone minting or writer capability (see `commit-routing.ts`'s
// module doc for the full boundary rationale).

export { bindConsumerOntology, openReadOrQuery } from "./consumer-binding";
export type { BindConsumerOntologyRequest, ConsumerBindingDeps } from "./consumer-binding";
export { queryNamedResource, searchOntology, inspectImpact } from "./reads";
export type { ResourceResult, SearchResult, ImpactResult } from "./reads";
export { proposeOperation } from "./proposal";
export { performDryRun } from "./dry-run";
export { runGovernanceCheck } from "./governance-check";
export type { GovernanceCheckDeps } from "./governance-check";
export { routeCommit } from "./commit-routing";
export type { RouteCommitDeps, CommitRouteOutcome, MintLedger } from "./commit-routing";
export { appendOperationLineage } from "./lineage";
export type { LineageDeps, LineageEntry } from "./lineage";
export { assertLegalTransition, isOperationState, OPERATION_STATES } from "./operation-state-machine";
export { isStateWithinBindingScope } from "./binding-scope";
export type {
  AggregateResult,
  BindingActor,
  BindingScope,
  ImpactQuery,
  NamedResourceQuery,
  OntologyBinding,
  OperationSession,
  OperationState,
  Proposal,
  SearchQuery,
} from "./types";
export { isBindingScope, isNamedIdentifier } from "./types";
