import type {
  FDEOntologyEngineeringPhase,
  FDEOntologyEngineeringSession,
} from "../fde-ontology-engineering/types";
import type { LeadOntologyTurnCardV2Choice } from "../chatbot-studio/lead-ontology-turn-card";
import type { ConstructionLintFinding } from "../construction-lint/lint-candidates";
import type { StructuredApprovalRef } from "../prompt-front-door/approval-ref";
import type { PromptRuntime } from "../prompt-front-door/envelope";

export const ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION =
  "palantir-mini/ontology-engineering-workflow/v1" as const;

export type OntologyEngineeringWorkflowAction =
  | "start"
  | "turn"
  | "draft_sic"
  | "ingest"
  | "register"
  | "lint"
  | "elevate"
  | "approve_source_mutation"
  | "status";

/**
 * Result of the `lint` seam — a callable, read-only pass that runs the 8
 * ontology-construction anti-pattern lints over the session candidate arrays.
 * UNGATED (no approval needed): pure analysis, surfaces findings, mutates nothing.
 */
export interface OntologyEngineeringLintResult {
  readonly findings: readonly ConstructionLintFinding[];
}

/**
 * Result of the `ingest` seam — parse a frozen NC1 SOURCE jsonl into the session
 * candidate arrays (pre-approval; the elevation flow continues via draft_sic →
 * approve → register). Counts the merged candidates per kind and reports edges /
 * records that were skipped-and-reported during the parse.
 */
export interface OntologyEngineeringIngestResult {
  readonly counts: {
    readonly objects: number;
    readonly functions: number;
    readonly actions: number;
    readonly roles: number;
    readonly properties: number;
    readonly links: number;
  };
  readonly skipped: {
    readonly edges: ReadonlyArray<{ readonly candidateId: string; readonly reason: string }>;
    readonly records: ReadonlyArray<{ readonly line: number; readonly reason: string }>;
  };
}

/**
 * Result of the ENTRY-loop `register` seam (O-2 closure). Materializes an
 * approved ontology-engineering session's accepted candidate set into
 * registered, readable primitives via a single batched commit.
 */
export interface OntologyEngineeringRegisterResult {
  /** True iff the candidate set was committed (edit_committed appended). */
  readonly committed: boolean;
  /** Per-kind minted rids that were committed. */
  readonly registered: {
    readonly objectTypes: readonly string[];
    readonly actionTypes: readonly string[];
    readonly functions: readonly string[];
    readonly linkTypes: readonly string[];
    readonly roles: readonly string[];
    readonly properties: readonly string[];
  };
  /** Link candidates skipped because an endpoint did not resolve (D6). */
  readonly skipped: {
    readonly links: ReadonlyArray<{ readonly linkName: string; readonly reason: string }>;
  };
  /** The commit handler's verdict; absent when nothing was committed. */
  readonly commitResult?: unknown;
  /** Why the register call was refused (precondition gate not met / no edits). */
  readonly invalidReason?: string;
  /**
   * Construction anti-pattern lint findings over the registered candidate set.
   * ADVISORY: surfaced alongside the commit, never blocks it (slice default).
   */
  readonly lint?: readonly ConstructionLintFinding[];
}

export type OntologyEngineeringWorkflowPhase =
  | "not-started"
  | "fde-active"
  | "semantic-contract-ready"
  | "semantic-contract-drafted"
  | "semantic-contract-approved"
  | "digital-twin-approved"
  | "mutation-authorized";

export type UserDecisionKind = "accept" | "reject" | "defer" | "answer";

export interface TurnCardDecisionSpec {
  readonly choiceId: string;
  readonly kind: UserDecisionKind;
  readonly label: string;
  readonly consequence: string;
  readonly targetHypothesisId?: string;
  readonly appliesToRequirementIds: readonly string[];
  readonly affectsSemanticIntent: boolean;
  readonly affectsDtc: boolean;
  readonly sourceCardRef: string;
}

export interface UserDecisionRecord {
  readonly decisionId: string;
  readonly choiceId: string;
  readonly kind: UserDecisionKind;
  readonly recordedAt: string;
  readonly source: "turn-card" | "handler-input";
  readonly targetHypothesisId?: string;
  readonly appliesToRequirementIds: readonly string[];
  readonly note?: string;
  readonly fdeSessionRef?: string;
  readonly approvedMutationBoundary?: string;
}

/**
 * Developer/source-mutation fast-path approval record (Improvement #2).
 *
 * DISTINCT from {@link UserDecisionRecord}: this authorizes ontology-ENGINEERING
 * *source/developer* edits to pm's own protected surfaces (hooks, gate/router
 * handlers, workflow libs, skills, managed-settings) WITHOUT the SIC/DTC ceremony.
 * It is stored on a SEPARATE state array ({@link OntologyEngineeringWorkflowState.sourceMutationApprovals})
 * so it is INVISIBLE to `deriveMutationAuthorized` / `hasApprovedMutationDecisionRecord`
 * — the ontology-data gate is unchanged by construction.
 *
 * Unforgeable by the LLM: bound to a hook-captured real `PromptEnvelope`
 * (promptId + promptHash), substring-verified against the verbatim
 * `promptExcerpt`, turn-bound to the current/just-prior front-door pointer, and
 * short-TTL + single-use. The persisted record is NEVER trusted on its own — the
 * gate RE-VERIFIES it against the captured envelope at read time (HOLE-1 closure;
 * see `reverifySourceMutationApprovalAgainstEnvelope`).
 */
export interface SourceMutationApprovalRecord {
  readonly kind: "developer-source-mutation";
  /** StructuredApprovalRef bound to promptId + promptHash (unforgeable anchor). */
  readonly approvalRef: StructuredApprovalRef;
  /** SCOPE — normalized path/glob prefixes the user named. Never empty / never `**`-only. */
  readonly approvedSourcePaths: readonly string[];
  /** Turn binding — the captured prompt this approval points at. */
  readonly approvedAtPromptId: string;
  /** sha256 of the captured prompt — re-checked against the envelope at read time. */
  readonly approvedPromptHash: string;
  /** Front-door runtime + session the approval was minted under (pointer re-check). */
  readonly runtime: PromptRuntime;
  readonly sessionId: string;
  /** ISO8601 freshness anchor (short TTL). */
  readonly approvedAt: string;
  /** Set once a protected mutation consumes the record (single-use). */
  readonly consumedByToolCallId?: string;
  /** Substring-verified against `envelope.promptExcerpt` (the hook's verbatim capture). */
  readonly userQuote: string;
}

export interface DecisionLedgerAuditFinding {
  readonly findingId: "decision-ledger.forward-only-existing-gap";
  readonly severity: "warn";
  readonly policy: "forward-only-plus-audit";
  readonly message: string;
  readonly fdeSessionRef?: string;
  readonly turnCount: number;
  readonly userDecisionRecordCount: number;
  readonly expectedMinimumRecordCount: number;
  readonly backfillApplied: false;
}

export interface OntologyEngineeringWorkflowContract {
  readonly schemaVersion: typeof ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION;
  readonly contractId: string;
  readonly projectRoot: string;
  readonly universalOntologyEntryRef?: string;
  readonly fdeSessionId?: string;
  readonly fdeSessionRef?: string;
  readonly fdePhase?: FDEOntologyEngineeringPhase;
  readonly semanticIntentContractRef?: string;
  readonly semanticIntentContractStatus?: "draft" | "approved" | "superseded";
  readonly digitalTwinChangeContractRef?: string;
  readonly digitalTwinChangeContractStatus?: "draft" | "approved" | "superseded";
  readonly workContractRef?: string;
  readonly phase: OntologyEngineeringWorkflowPhase;
  readonly allowedNextActions: readonly OntologyEngineeringWorkflowAction[];
  readonly mutationAuthorized: boolean;
  readonly sourceRefs: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface OntologyEngineeringWorkflowState
  extends OntologyEngineeringWorkflowContract {
  readonly turnDecisionSpecs: readonly TurnCardDecisionSpec[];
  readonly userDecisionRecords: readonly UserDecisionRecord[];
  readonly decisionLedgerAuditFindings: readonly DecisionLedgerAuditFinding[];
  /**
   * Improvement #2 — developer/source-mutation fast-path approvals. SEPARATE
   * from `userDecisionRecords` so `deriveMutationAuthorized` sees nothing new.
   * Optional + additive: `deriveOntologyEngineeringWorkflowState` never populates
   * it (the value is merged in by the `approve_source_mutation` handler and
   * preserved across re-derivations). Absent ⇒ no fast-path approvals.
   */
  readonly sourceMutationApprovals?: readonly SourceMutationApprovalRecord[];
}

export interface DeriveWorkflowStateInput {
  readonly projectRoot: string;
  readonly fdeSession?: FDEOntologyEngineeringSession;
  readonly semanticIntentContractRef?: string;
  readonly semanticIntentContractStatus?: "draft" | "approved" | "superseded";
  readonly digitalTwinChangeContractRef?: string;
  readonly digitalTwinChangeContractStatus?: "draft" | "approved" | "superseded";
  readonly workContractRef?: string;
  readonly turnDecisionSpecs?: readonly TurnCardDecisionSpec[];
  readonly userDecisionRecords?: readonly UserDecisionRecord[];
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

function uniqueActions(
  actions: readonly OntologyEngineeringWorkflowAction[],
): readonly OntologyEngineeringWorkflowAction[] {
  return Array.from(new Set(actions));
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)));
}

function contractApproved(input: {
  readonly ref?: string;
  readonly status?: "draft" | "approved" | "superseded";
}): boolean {
  return input.status === "approved" && input.ref !== undefined && input.ref.trim().length > 0;
}

function hasApprovedMutationDecisionRecord(
  records: readonly UserDecisionRecord[] | undefined,
): boolean {
  return (records ?? []).some((record) =>
    record.kind === "accept" &&
    record.source === "handler-input" &&
    typeof record.approvedMutationBoundary === "string" &&
    record.approvedMutationBoundary.trim().length > 0
  );
}

function deriveDecisionLedgerAuditFindings(input: {
  readonly fdeSession?: FDEOntologyEngineeringSession;
  readonly fdeSessionRef?: string;
  readonly userDecisionRecords?: readonly UserDecisionRecord[];
}): readonly DecisionLedgerAuditFinding[] {
  const turnCount = input.fdeSession?.turnCount ?? 0;
  const userDecisionRecordCount = input.userDecisionRecords?.length ?? 0;

  if (turnCount === 0 || userDecisionRecordCount >= turnCount) return [];

  return [{
    findingId: "decision-ledger.forward-only-existing-gap",
    severity: "warn",
    policy: "forward-only-plus-audit",
    message:
      "Existing FDE turns outnumber UserDecisionRecord entries; the ledger is forward-only, so historical records are not backfilled.",
    fdeSessionRef: input.fdeSessionRef,
    turnCount,
    userDecisionRecordCount,
    expectedMinimumRecordCount: turnCount,
    backfillApplied: false,
  }];
}

export function deriveMutationAuthorized(input: {
  readonly semanticIntentContractRef?: string;
  readonly semanticIntentContractStatus?: "draft" | "approved" | "superseded";
  readonly digitalTwinChangeContractRef?: string;
  readonly digitalTwinChangeContractStatus?: "draft" | "approved" | "superseded";
  readonly workContractRef?: string;
  readonly userDecisionRecords?: readonly UserDecisionRecord[];
}): boolean {
  return contractApproved({
    ref: input.semanticIntentContractRef,
    status: input.semanticIntentContractStatus,
  }) && contractApproved({
    ref: input.digitalTwinChangeContractRef,
    status: input.digitalTwinChangeContractStatus,
  }) &&
    input.workContractRef !== undefined &&
    input.workContractRef.trim().length > 0 &&
    hasApprovedMutationDecisionRecord(input.userDecisionRecords);
}

export function deriveWorkflowPhase(input: {
  readonly fdeSession?: FDEOntologyEngineeringSession;
  readonly semanticIntentContractRef?: string;
  readonly semanticIntentContractStatus?: "draft" | "approved" | "superseded";
  readonly digitalTwinChangeContractRef?: string;
  readonly digitalTwinChangeContractStatus?: "draft" | "approved" | "superseded";
  readonly workContractRef?: string;
  readonly userDecisionRecords?: readonly UserDecisionRecord[];
}): OntologyEngineeringWorkflowPhase {
  if (deriveMutationAuthorized(input)) return "mutation-authorized";
  if (contractApproved({
    ref: input.digitalTwinChangeContractRef,
    status: input.digitalTwinChangeContractStatus,
  })) return "digital-twin-approved";
  if (contractApproved({
    ref: input.semanticIntentContractRef,
    status: input.semanticIntentContractStatus,
  })) return "semantic-contract-approved";
  if (input.semanticIntentContractRef !== undefined) return "semantic-contract-drafted";
  if (input.fdeSession?.phase === "semantic-contract-ready" || input.fdeSession?.phase === "dtc-ready") {
    return "semantic-contract-ready";
  }
  if (input.fdeSession !== undefined) return "fde-active";
  return "not-started";
}

export function deriveAllowedNextActions(input: {
  readonly fdeSession?: FDEOntologyEngineeringSession;
  readonly semanticIntentContractRef?: string;
  readonly semanticIntentContractStatus?: "draft" | "approved" | "superseded";
  readonly digitalTwinChangeContractRef?: string;
  readonly digitalTwinChangeContractStatus?: "draft" | "approved" | "superseded";
  readonly workContractRef?: string;
  readonly userDecisionRecords?: readonly UserDecisionRecord[];
}): readonly OntologyEngineeringWorkflowAction[] {
  const mutationAuthorized = deriveMutationAuthorized(input);
  if (input.fdeSession === undefined) return ["start", "status"];

  const actions: OntologyEngineeringWorkflowAction[] = ["turn", "status"];
  const sicApproved = contractApproved({
    ref: input.semanticIntentContractRef,
    status: input.semanticIntentContractStatus,
  });
  const sicDrafted = input.semanticIntentContractRef !== undefined && !sicApproved;
  const readyForSic =
    input.fdeSession.phase === "semantic-contract-ready" ||
    input.fdeSession.phase === "dtc-ready" ||
    input.fdeSession.readinessProfile?.readyForSemanticIntent === true;

  if (!sicApproved && !sicDrafted && readyForSic) actions.unshift("draft_sic");
  if (mutationAuthorized) return ["status"];
  return uniqueActions(actions);
}

export function turnCardDecisionSpecsFromChoices(input: {
  readonly cardId: string;
  readonly choices: readonly LeadOntologyTurnCardV2Choice[];
}): readonly TurnCardDecisionSpec[] {
  return input.choices.map((choice) => ({
    choiceId: choice.choiceId,
    kind: choice.kind,
    label: choice.label,
    consequence: choice.consequence,
    targetHypothesisId: choice.targetHypothesisId,
    appliesToRequirementIds: choice.appliesToRequirementIds,
    affectsSemanticIntent: choice.affectsSemanticIntent,
    affectsDtc: choice.affectsDtc,
    sourceCardRef: input.cardId,
  }));
}

export function userDecisionRecordsFromSpecs(input: {
  readonly specs: readonly TurnCardDecisionSpec[];
  readonly choiceIds: readonly string[];
  readonly recordedAt: string;
  readonly note?: string;
}): readonly UserDecisionRecord[] {
  const selected = new Set(input.choiceIds);
  return input.specs
    .filter((spec) => selected.has(spec.choiceId))
    .map((spec) => ({
      decisionId: `user-decision:${spec.choiceId}`,
      choiceId: spec.choiceId,
      kind: spec.kind,
      recordedAt: input.recordedAt,
      source: "turn-card",
      targetHypothesisId: spec.targetHypothesisId,
      appliesToRequirementIds: spec.appliesToRequirementIds,
      note: input.note,
    }));
}

export function deriveOntologyEngineeringWorkflowState(
  input: DeriveWorkflowStateInput,
): OntologyEngineeringWorkflowState {
  const updatedAt = input.updatedAt ?? new Date().toISOString();
  const createdAt = input.createdAt ?? input.fdeSession?.createdAt ?? updatedAt;
  const phase = deriveWorkflowPhase(input);
  const mutationAuthorized = deriveMutationAuthorized(input);
  const fdeSessionRef = input.fdeSession
    ? `fde-ontology-engineering://session/${input.fdeSession.sessionId}`
    : undefined;
  const userDecisionRecords = input.userDecisionRecords ?? [];
  const sourceRefs = uniqueStrings([
    ...(input.fdeSession?.sourceRefs ?? []),
    input.fdeSession?.universalOntologyEntryRef ?? "",
    fdeSessionRef ?? "",
    input.semanticIntentContractRef ?? "",
    input.digitalTwinChangeContractRef ?? "",
    input.workContractRef ?? "",
  ]);

  return {
    schemaVersion: ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION,
    contractId: input.fdeSession
      ? `ontology-engineering-workflow:${input.fdeSession.sessionId}`
      : `ontology-engineering-workflow:${input.projectRoot}`,
    projectRoot: input.projectRoot,
    universalOntologyEntryRef: input.fdeSession?.universalOntologyEntryRef,
    fdeSessionId: input.fdeSession?.sessionId,
    fdeSessionRef,
    fdePhase: input.fdeSession?.phase,
    semanticIntentContractRef: input.semanticIntentContractRef,
    semanticIntentContractStatus: input.semanticIntentContractStatus,
    digitalTwinChangeContractRef: input.digitalTwinChangeContractRef,
    digitalTwinChangeContractStatus: input.digitalTwinChangeContractStatus,
    workContractRef: input.workContractRef,
    phase,
    allowedNextActions: deriveAllowedNextActions(input),
    mutationAuthorized,
    sourceRefs,
    turnDecisionSpecs: input.turnDecisionSpecs ?? [],
    userDecisionRecords,
    decisionLedgerAuditFindings: deriveDecisionLedgerAuditFindings({
      fdeSession: input.fdeSession,
      fdeSessionRef,
      userDecisionRecords,
    }),
    createdAt,
    updatedAt,
  };
}
