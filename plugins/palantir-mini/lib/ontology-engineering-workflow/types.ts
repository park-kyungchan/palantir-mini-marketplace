import type {
  FDEOntologyEngineeringPhase,
  FDEOntologyEngineeringSession,
} from "../fde-ontology-engineering/types";
import type { LeadOntologyTurnCardV2Choice } from "../chatbot-studio/lead-ontology-turn-card";
import type { ConstructionLintFinding } from "../construction-lint/lint-candidates";
import type { StructuredApprovalRef } from "../prompt-front-door/approval-ref";
import type { PromptRuntime } from "../prompt-front-door/envelope";

// Persisted-state schema version. Bumped to `…/v2` for the P4 mutation-mode lane:
// the new fields (`mutationMode`, `mutationAuthorization`) are additive and
// backward-compatible (optional), so persisted v1/v2 sessions both deserialize
// (store.ts does a bare `JSON.parse … as State`, no version gate).
export const ONTOLOGY_ENGINEERING_WORKFLOW_SCHEMA_VERSION =
  "palantir-mini/ontology-engineering-workflow/v2" as const;

/**
 * P4 — the SEVEN documented mutation modes (verbatim from the SSoT, which lists
 * them identically in three places: architecture-center/intent-to-build-flow.md:55
 * (Step 3, "Choose mutation mode"), ontology/approval-and-lineage.md:90-98
 * (the mutation-mode proof table), and global-branching/00-mutation-control-lifecycle.md:35-43
 * (the lifecycle→mode map). "No mode, no mutation"; an Agent that cannot map its
 * action to one row remains `proposal-only`.
 *
 * The runtime previously collapsed all seven into the single `mutationAuthorized`
 * boolean (= the promotion gate). They are now first-class: a consuming-layer
 * DATA/doc write is a `consumer-data-write` (or, lacking an approved action type,
 * `proposal-only`) — NOT a primitive promotion. Promotion
 * (`builder-structure-write` / `approved-commit`) keeps the full 9-axis SIC + DTC
 * gate; the schema-vs-data split (approval-and-lineage.md:81-82) means the other
 * lanes carry their own, lighter authorization predicate.
 */
export type MutationMode =
  | "read-only"
  | "proposal-only"
  | "dry-run/sandbox"
  | "consumer-data-write"
  | "builder-structure-write"
  | "approved-commit"
  | "armed-side-effect";

/**
 * The default mode when a caller does not declare one. `builder-structure-write`
 * preserves today's behavior EXACTLY: under this mode the per-mode predicate is
 * `deriveMutationAuthorized(state)` (the full SIC+DTC+workContract+decision-record
 * promotion gate), so the legacy `mutationAuthorized` boolean stays byte-identical
 * when no mode is supplied.
 */
export const DEFAULT_MUTATION_MODE: MutationMode = "builder-structure-write";

/**
 * Per-mode authorization verdict (P4). `authorized` answers "may this mode's write
 * proceed?" under the mode's OWN predicate (NOT a single global gate); `requires`
 * names the SSoT proof-table expectations that still must hold (or that are missing
 * from `state`, in which case `authorized` is conservatively `false`); `rationale`
 * is one line of human-readable grounding. Surfacing this NEVER widens the legacy
 * `mutationAuthorized` boolean — that stays bound to the promotion lanes (see
 * {@link deriveMutationAuthorized}).
 */
export interface MutationAuthorization {
  readonly mode: MutationMode;
  readonly authorized: boolean;
  readonly requires: readonly string[];
  readonly rationale: string;
}

export type OntologyEngineeringWorkflowAction =
  | "start"
  | "turn"
  | "draft_sic"
  | "approve_sic"
  | "approve_technology_recommendation"
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
  | "mutation-authorized"
  | "registered";

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
  /**
   * P4 — the declared mutation mode for this state. OPTIONAL + load-bearing: a
   * persisted `v1` session (written before this field existed) MUST still
   * deserialize, so the field may be absent on loaded state. The constructor
   * always populates it (defaulting to {@link DEFAULT_MUTATION_MODE}); only
   * historical blobs read back through `store.ts` lack it.
   */
  readonly mutationMode?: MutationMode;
  /**
   * P4 — the per-mode authorization verdict. Lets a consuming-layer effort declare
   * `consumer-data-write` / `proposal-only` and get a governed path WITHOUT naming a
   * promoted primitive. OPTIONAL for the same backward-compat reason as
   * {@link mutationMode}. `mutationAuthorized` (the boolean above) is unchanged and
   * stays bound to the promotion lanes.
   */
  readonly mutationAuthorization?: MutationAuthorization;
  /**
   * ISO8601 set ONCE the workflow's accepted candidate set has been committed via
   * the `register`/`elevate` seam (S1 state-sync closure). Presence => terminal
   * `registered` phase + allowedNextActions `["status"]`. Persisted; preserved
   * across re-derivations until a new `start`. Does NOT flip `mutationAuthorized`
   * (the protected-surface gate signal stays tied to SIC/DTC approval).
   */
  readonly registeredAt?: string;
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
  /**
   * P4 — declared mutation mode. Absent ⇒ {@link DEFAULT_MUTATION_MODE}
   * (`builder-structure-write`), which preserves the historical authorization
   * semantics exactly.
   */
  readonly mutationMode?: MutationMode;
  /**
   * P4 — `consumer-data-write` proof inputs. A consuming-layer DATA/doc write is
   * authorized by an approved action type + emitted lineage (the LIGHTER predicate,
   * approval-and-lineage.md:81-82,95), NOT the 9-axis SIC promotion gate. Only
   * consulted when mutationMode === "consumer-data-write"; absent ⇒ that lane gates
   * to `false` (proof missing).
   */
  readonly consumerActionTypeRef?: string;
  readonly consumerWriteValidated?: boolean;
  /**
   * P4 — `approved-commit` proof input: the approval/commit reference. Only
   * consulted when mutationMode === "approved-commit"; absent ⇒ that lane gates to
   * `false` even when the promotion gate is otherwise satisfied.
   */
  readonly approvedCommitRef?: string;
  /**
   * P4 — `armed-side-effect` proof input: explicit arming for external/destructive
   * effects (the most restrictive lane, approval-and-lineage.md:98). Only consulted
   * when mutationMode === "armed-side-effect"; absent/false ⇒ that lane gates to
   * `false`.
   */
  readonly sideEffectArmed?: boolean;
  readonly registeredAt?: string;
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

/**
 * Structural signal bag for {@link deriveMutationAuthorizationByMode}. Carries the
 * promotion-gate signals (forwarded verbatim to {@link deriveMutationAuthorized})
 * plus the lighter-lane proof inputs. Every lane-specific field is OPTIONAL; when a
 * lane's proof is absent, that lane's verdict is conservatively `false`.
 */
export interface MutationModeState {
  readonly semanticIntentContractRef?: string;
  readonly semanticIntentContractStatus?: "draft" | "approved" | "superseded";
  readonly digitalTwinChangeContractRef?: string;
  readonly digitalTwinChangeContractStatus?: "draft" | "approved" | "superseded";
  readonly workContractRef?: string;
  readonly userDecisionRecords?: readonly UserDecisionRecord[];
  /** consumer-data-write: approved action type the write executes through. */
  readonly consumerActionTypeRef?: string;
  /** consumer-data-write: validation verdict for the emitted write. */
  readonly consumerWriteValidated?: boolean;
  /** approved-commit: the approval/commit reference. */
  readonly approvedCommitRef?: string;
  /** armed-side-effect: explicit arming for the external/destructive effect. */
  readonly sideEffectArmed?: boolean;
}

/**
 * P4 — per-mode authorization predicate that FRONTS {@link deriveMutationAuthorized}.
 *
 * The legacy boolean answers exactly ONE question (is the 9-axis SIC + DTC promotion
 * gate satisfied?) and the runtime used it for ALL seven SSoT modes. That over-gates
 * the lighter lanes (a `consumer-data-write` does not need SIC+DTC; a `read-only`
 * inspection needs nothing) and under-gates the heavier ones (`approved-commit` /
 * `armed-side-effect` need MORE than promotion). This fans the single gate out into
 * the seven SSoT rows, grounding each in the proof table
 * (approval-and-lineage.md:90-98). When a required signal is not present in `state`,
 * the verdict is conservatively `authorized: false` with the missing proof named in
 * `requires` — no state field is invented.
 */
export function deriveMutationAuthorizationByMode(
  mode: MutationMode,
  state: MutationModeState,
): MutationAuthorization {
  // The existing promotion gate (9-axis SIC + DTC + workContract + decision record).
  const promotionGate = deriveMutationAuthorized(state);

  switch (mode) {
    case "read-only":
      return {
        mode,
        authorized: true,
        requires: [],
        rationale:
          "Inspection only; cites source paths, no write-set. Always authorized.",
      };

    case "proposal-only":
      return {
        mode,
        authorized: true,
        requires: ["recorded proposal"],
        rationale:
          "Drafts a reviewable artifact without applying it; the catch-all lane an Agent falls back to when no other row maps. Authorized; the proposal must be recorded.",
      };

    case "dry-run/sandbox":
      return {
        mode,
        authorized: true,
        requires: ["sandbox; no real commit"],
        rationale:
          "Stages in an isolated branch/scenario with side effects suppressed. Authorized only while writes provably stay inside the sandbox.",
      };

    case "consumer-data-write": {
      // LIGHTER predicate (approval-and-lineage.md:81-82,95): an approved action
      // type + a validated write + emitted lineage — NOT the 9-axis SIC promotion
      // gate. Gated false until the write-set/lineage signal is present in state.
      const hasActionType =
        typeof state.consumerActionTypeRef === "string" &&
        state.consumerActionTypeRef.trim().length > 0;
      const validated = state.consumerWriteValidated === true;
      const authorized = hasActionType && validated;
      const requires: string[] = [];
      if (!hasActionType) requires.push("approved consumer action type (write-set + lineage)");
      if (!validated) requires.push("write validation verdict");
      if (authorized) requires.push("emitted 5-dim lineage row");
      return {
        mode,
        authorized,
        requires,
        rationale: authorized
          ? "Approved action type against DATA instances with a passing validation verdict; the lighter consumer lane, distinct from SIC+DTC promotion."
          : "Consumer DATA write requires an approved action type + write validation (the lighter lane); absent ⇒ gated false (no SIC ceremony, but no write-set/lineage signal either).",
      };
    }

    case "builder-structure-write":
      // EXISTING promotion gate, unchanged — preserves current behavior. This is the
      // lane the legacy `mutationAuthorized` boolean has always represented.
      return {
        mode,
        authorized: promotionGate,
        requires: promotionGate
          ? ["proposal/PR review", "owner/reviewer proof", "lineage on merge"]
          : ["approved SIC", "approved DTC", "work contract", "approved decision record"],
        rationale: promotionGate
          ? "Structure change through the builder/source lane; the 9-axis SIC + DTC promotion gate is satisfied."
          : "Structure change requires the full SIC + DTC + work-contract + decision-record promotion gate; not yet satisfied.",
      };

    case "approved-commit": {
      // Promotion gate AND an approved-commit ref must both be present.
      const hasCommitRef =
        typeof state.approvedCommitRef === "string" &&
        state.approvedCommitRef.trim().length > 0;
      const authorized = promotionGate && hasCommitRef;
      const requires: string[] = [];
      if (!promotionGate) requires.push("promotion gate (SIC + DTC + work contract + decision record)");
      if (!hasCommitRef) requires.push("approval/commit reference");
      requires.push("exact write-set", "append-only lineage");
      return {
        mode,
        authorized,
        rationale: authorized
          ? "Promotion gate satisfied and an approval/commit reference is present; commit may apply with exact write-set + lineage."
          : "Commit needs BOTH the promotion gate AND an approval/commit reference; at least one is missing ⇒ gated false.",
        requires,
      };
    }

    case "armed-side-effect": {
      // Most restrictive: authorized iff explicitly armed in state.
      const armed = state.sideEffectArmed === true;
      return {
        mode,
        authorized: armed,
        requires: armed
          ? ["blast radius", "approver", "rollback/recovery plan", "event lineage"]
          : ["explicit arming", "blast radius", "approver", "rollback/recovery plan"],
        rationale: armed
          ? "Side effect is explicitly armed; arming, blast radius, approver, and recovery plan must accompany the edge."
          : "External/destructive side effects require explicit arming; not armed ⇒ gated false (the most restrictive lane).",
      };
    }
  }
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
  const registered = (input.registeredAt ?? "").trim().length > 0;
  const phase: OntologyEngineeringWorkflowPhase = registered
    ? "registered"
    : deriveWorkflowPhase(input);
  // Gate signal — UNCHANGED. Registration does NOT authorize protected-surface
  // mutation; the terminal signal is `phase: "registered"` + register.committed.
  const mutationAuthorized = deriveMutationAuthorized(input);
  // P4 — per-mode authorization. `mutationAuthorized` (above) stays === the
  // `builder-structure-write` predicate, so default-mode behavior is byte-identical.
  const mutationMode: MutationMode = input.mutationMode ?? DEFAULT_MUTATION_MODE;
  const mutationAuthorization = deriveMutationAuthorizationByMode(mutationMode, {
    semanticIntentContractRef: input.semanticIntentContractRef,
    semanticIntentContractStatus: input.semanticIntentContractStatus,
    digitalTwinChangeContractRef: input.digitalTwinChangeContractRef,
    digitalTwinChangeContractStatus: input.digitalTwinChangeContractStatus,
    workContractRef: input.workContractRef,
    userDecisionRecords: input.userDecisionRecords,
    consumerActionTypeRef: input.consumerActionTypeRef,
    consumerWriteValidated: input.consumerWriteValidated,
    approvedCommitRef: input.approvedCommitRef,
    sideEffectArmed: input.sideEffectArmed,
  });
  const allowedNextActions: readonly OntologyEngineeringWorkflowAction[] = registered
    ? ["status"]
    : deriveAllowedNextActions(input);
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
    allowedNextActions,
    mutationAuthorized,
    mutationMode,
    mutationAuthorization,
    registeredAt: input.registeredAt,
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
