import {
  createFDEOntologyEngineeringSessionFromEntry,
  fdeOntologyEngineeringSessionRef,
  readCurrentFDEOntologyEngineeringSession,
  readFDEOntologyEngineeringSession,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../lib/fde-ontology-engineering/session-store";
import type {
  FDEOntologyEngineeringSession,
  ObjectTypeCandidate,
  ActionTypeCandidate,
  FunctionCandidate,
  RoleCandidate,
  PropertyCandidate,
  LinkTypeCandidate,
} from "../../lib/fde-ontology-engineering/types";
import {
  createSemanticIntentContractDraftFromFDEOntologySession,
  isSemanticIntentContractHollow,
  blockingClarificationQuestions,
} from "../../lib/fde-ontology-engineering/sic-from-session";
import type { FDEOntologyTurnChoiceApplication } from "../../lib/fde-ontology-engineering/turn-choice";
import type {
  SemanticIntentContract,
  DigitalTwinRequiredUserDecision,
  TurnCardDecisionSpec as TechnologyApprovalCardSpec,
} from "../../lib/lead-intent/contracts";
import { isApprovedSemanticIntentContract } from "../../lib/semantic-intent/approved-contract";
import {
  approveSemanticIntentContract,
  type ApproveSemanticIntentContractResult,
} from "../../lib/semantic-intent/approved-contract";
import {
  approveTechnologyRecommendation,
  buildTechnologyApprovalCard,
  type ApproveTechnologyRecommendationResult,
  type ApprovedTechnologyRecommendation,
} from "../../lib/semantic-intent/approve-technology-recommendation";
import {
  buildContextEngineeringPlanV2,
  type TechnologyRecommendation,
} from "../../lib/context-engineering/context-plan-builder";
import {
  readCurrentUniversalOntologyEntry,
  readUniversalOntologyEntry,
  readUniversalOntologyEntryByRef,
} from "../../lib/ontology-entry/entry-store";
import type { UniversalOntologyEntry } from "../../lib/ontology-entry/universal-entry";
import {
  deriveOntologyEngineeringWorkflowState,
  ontologyEngineeringWorkflowCurrentPath,
  ontologyEngineeringWorkflowStatePath,
  readCurrentOntologyEngineeringWorkflowState,
  readOntologyEngineeringWorkflowState,
  turnCardDecisionSpecsFromChoices,
  userDecisionRecordsFromSpecs,
  writeOntologyEngineeringWorkflowState,
  type OntologyEngineeringWorkflowAction,
  type OntologyEngineeringWorkflowState,
  type OntologyEngineeringRegisterResult,
  type OntologyEngineeringIngestResult,
  type OntologyEngineeringLintResult,
  type TurnCardDecisionSpec,
  type UserDecisionRecord,
  type UserDecisionKind,
  type MutationMode,
} from "../../lib/ontology-engineering-workflow";
import { registerAcceptedCandidates } from "../../lib/ontology-engineering-workflow/register-accepted";
import { sicBackedDigitalTwinReady } from "../../lib/ontology-engineering-workflow/sic-backed-readiness";
import {
  elevateOntologyFromSource,
  type ElevateResult,
} from "../../lib/ontology-engineering-workflow/elevate";
import { verifyAndMintSourceMutationApproval } from "../../lib/ontology-engineering-workflow";
import type { SourceMutationApprovalRecord } from "../../lib/ontology-engineering-workflow";
import { appendEventAtomic } from "../../lib/event-log/append";
import { resolveHostRuntimeIdentity } from "../../lib/runtime/identity";
import { approvalRefToString, validateApprovalRefValue } from "../../lib/prompt-front-door/approval-ref";
import { PromptFrontDoorStore } from "../../lib/prompt-front-door/store";
import type { PromptContractRecord } from "../../lib/prompt-front-door/store";
import type { PromptEnvelope, PromptRuntime } from "../../lib/prompt-front-door/envelope";
import { PROMPT_RUNTIMES, isPromptRuntime } from "../../lib/prompt-front-door/envelope";
import { rebindPersistedApprovalToCurrentEnvelope } from "../../lib/prompt-front-door/rebind-persisted-approval";
import type { ApprovedSemanticIntentContract } from "../../lib/semantic-intent/approved-contract";
import type { DigitalTwinChangeContract } from "../../lib/lead-intent/contracts";
import { createHash } from "node:crypto";
import * as path from "node:path";
import { gitHeadSha as gitHeadShaFor } from "../../lib/git/head-sha";
import type { EventEnvelope, EventId, SessionId, CommitSha } from "../../lib/event-log/types";
import { lintConstructionCandidates } from "../../lib/construction-lint/lint-candidates";
import { ingestJsonlSourceToCandidates } from "../../lib/fde-ontology-engineering/source-ingest";
import commitEditsHandler from "./commit-edits";
import getOntology from "./get-ontology";
import { COMMIT_EDITS_ACTION_TYPE_RID } from "../../runtime-overlay/schemas-snapshot/ontology/self/action-types";
import {
  handleFDEOntologyTurn,
  type FDEOntologyTurnHandlerInput,
  type FDEOntologyTurnHandlerResult,
} from "./fde-ontology-turn";

interface HandlerChoiceApplication extends FDEOntologyTurnChoiceApplication {
  readonly decisionId?: string;
  readonly decision?: string;
  readonly note?: string;
  readonly approvedMutationBoundary?: string;
  readonly fdeSessionRef?: string;
}

export interface OntologyEngineeringWorkflowHandlerInput
  extends Partial<Omit<FDEOntologyTurnHandlerInput, "projectRoot" | "session">> {
  readonly action: OntologyEngineeringWorkflowAction;
  readonly project?: string;
  readonly projectRoot?: string;
  readonly universalOntologyEntryRef?: string;
  readonly universalOntologyEntryId?: string;
  readonly sessionId?: string;
  readonly fdeSessionRef?: string;
  readonly ontologyContextQueryRef?: string;
  readonly workflowTraceRef?: string;
  readonly semanticIntentContractRef?: string;
  readonly semanticIntentContractStatus?: "draft" | "approved" | "superseded";
  /**
   * The draft SemanticIntentContract to approve (action `approve_sic`). The caller
   * threads the user-confirmed, nine-axis-filled SIC produced by the fill sequence
   * (its `fillSequence` carries the per-axis `source` the Q2 gate enforces). When
   * absent, `approve_sic` reconstructs a draft from the session, which has no
   * user-confirmed fill steps and is therefore refused by the Q2 gate.
   */
  readonly semanticIntentContract?: SemanticIntentContract;
  /**
   * The proposed TechnologyRecommendation to approve (action
   * `approve_technology_recommendation`). When absent, the handler rebuilds the
   * recommendation from the current ContextEngineeringPlan; supplying it lets the
   * caller approve a recommendation it already surfaced on the technology card.
   */
  readonly technologyRecommendation?: TechnologyRecommendation;
  readonly digitalTwinChangeContractRef?: string;
  readonly digitalTwinChangeContractStatus?: "draft" | "approved" | "superseded";
  /** Caller-supplied readiness grade — gates the composed `elevate` flow's register step. */
  readonly readyForDigitalTwin?: boolean;
  readonly workContractRef?: string;
  readonly choiceApplications?: readonly HandlerChoiceApplication[];
  readonly affectedSurfaces?: readonly string[];
  readonly recordedDecisionNote?: string;
  /** Absolute path to a frozen NC1 SOURCE jsonl, required when action is `ingest`. */
  readonly sourceJsonlPath?: string;
  // ─── 7.22.2 — rebind_registered inputs (pure-provenance re-elevation) ──────────
  /**
   * The VERIFIED already-registered rids to re-elevate (action `rebind_registered`).
   * Fail-closed: the handler INTERSECTS this set with the live getOntology snapshot
   * (the unforgeable already-registered proof) — a rid not in the snapshot is REJECTED,
   * never registered-new. A new rid can never flow through this action.
   */
  readonly rebindRids?: readonly string[];
  /**
   * OPTIONAL audit link: the approved GlobalBranchingProposal / drift-proposal ref the
   * `rebindRids` set derives from. Provenance pointer only — authorization comes from the
   * live-snapshot proof + the SIC/DTC gate, NOT from this ref.
   */
  readonly rebindProposalRef?: string;
  // ─── 7.23.0 — drift_rebind inputs (composed governed RESUME) ─────────────────
  /**
   * Prompt-front-door promptId of the CURRENT captured envelope the persisted minted
   * approved SIC + DTC are re-bound to (action `drift_rebind`). Used to locate the
   * current envelope (mirrors the hook's readCurrentEnvelope: readEnvelope(sessionId,
   * promptId) else the current pointer). NOT an authorization input — the minted
   * approvalRefs are re-verified from the STORE, never from this field.
   */
  readonly promptId?: string;
  /**
   * sha256 of the current captured prompt (action `drift_rebind`). Continuity anchor
   * the re-keyed contract records carry so the PreToolUse gate's
   * contractContinuityMatches passes for the current prompt.
   */
  readonly promptHash?: string;
  readonly createdAt?: string;
  readonly emittedAt?: string;
  // ─── Improvement #2 — approve_source_mutation inputs (verified, never trusted) ──
  /** Pointer to the captured real prompt (front-door promptId). */
  readonly userApprovalPromptId?: string;
  /** sha256 of the captured prompt. */
  readonly userApprovalPromptHash?: string;
  /** Model's quote of the user's approval sentence (substring-verified vs excerpt). */
  readonly userApprovalQuote?: string;
  /** SCOPE — surface globs/paths the user named. */
  readonly approvedSourcePaths?: readonly string[];
  /** Front-door session id used to locate the captured envelope. */
  readonly frontDoorSessionId?: string;
  /** Front-door runtime (claude/codex/...) used for the pointer re-check. */
  readonly frontDoorRuntime?: "claude" | "codex" | "cursor" | "gemini" | "unknown";
}

export interface SourceMutationApprovalActionResult {
  /** The minted record (absent on failure). */
  readonly record?: SourceMutationApprovalRecord;
  /** Why verification failed (absent on success). */
  readonly invalidReason?: string;
}

export interface SicApprovalActionResult {
  /** True iff the SIC was approved (status:'approved' minted). */
  readonly approved: boolean;
  /** Plain-language KO/EN outcome (refusal reason when not approved). */
  readonly message: string;
  /** Per-axis/field issues when refused. */
  readonly issues?: readonly { readonly field: string; readonly message: string }[];
  /** Axis keys whose fill step was not user-confirmed (Q2 gate refusal). */
  readonly unconfirmedAxes?: readonly string[];
}

export interface TechnologyApprovalActionResult {
  /** True iff the technology recommendation was approved (approvalRef minted). */
  readonly approved: boolean;
  /** Plain-language KO/EN outcome (refusal reason when not approved). */
  readonly message: string;
  /** The approved recommendation (input rec + minted approvalRef); absent on refusal. */
  readonly recommendation?: ApprovedTechnologyRecommendation;
  /**
   * The plan's TECHNOLOGY required-user-decision flipped to status:'approved' with the
   * minted approvalRef (absent on refusal). The ContextEngineeringPlan is rebuilt per
   * call (the workflow state carries no plan slot), so this flipped decision is the
   * single hook `validateDigitalTwinChangeContract` consumes to clear the blocking
   * TECHNOLOGY lane.
   */
  readonly technologyDecision?: DigitalTwinRequiredUserDecision;
  /**
   * The non-developer confirm/correct card for the PROPOSED recommendation, surfaced while
   * the TECHNOLOGY decision is still pending approval (Q3 user-approval UX). Carries the
   * current proposed rec as its draft. Present on the pending/refusal path when a rec is
   * resolvable; ABSENT once approval succeeds (the decision flipped open → approved).
   */
  readonly technologyApprovalCard?: TechnologyApprovalCardSpec;
  /** Per-field issues when refused. */
  readonly issues?: readonly { readonly field: string; readonly message: string }[];
}

export interface OntologyEngineeringWorkflowHandlerResult {
  readonly action: OntologyEngineeringWorkflowAction;
  readonly state: OntologyEngineeringWorkflowState;
  readonly statePath: string;
  readonly currentPath: string;
  readonly session?: FDEOntologyEngineeringSession;
  readonly sessionRef?: string;
  readonly turn?: FDEOntologyTurnHandlerResult;
  readonly semanticIntentContract?: SemanticIntentContract;
  readonly register?: OntologyEngineeringRegisterResult;
  readonly ingest?: OntologyEngineeringIngestResult;
  readonly lint?: OntologyEngineeringLintResult;
  readonly elevate?: ElevateResult;
  readonly sourceMutationApproval?: SourceMutationApprovalActionResult;
  readonly sicApproval?: SicApprovalActionResult;
  readonly technologyApproval?: TechnologyApprovalActionResult;
  /**
   * P1 — draft_sic honesty. "draft" when the SIC carries grounded meaning;
   * "clarification-required" when the draft is hollow (all axes open, no
   * candidates, placeholder intent). A hollow draft must NOT read as progress.
   */
  readonly sicDraftStatus?: "draft" | "clarification-required";
  /**
   * P1 — when sicDraftStatus is "clarification-required", the blocking questions
   * surfaced as the PRIMARY payload so the operator answers them instead of
   * proceeding on a success-shaped hollow draft.
   */
  readonly clarificationRequired?: {
    readonly reason: string;
    readonly blockingQuestions: readonly unknown[];
  };
  /**
   * P2 — self-describing turn readiness. When a `turn` leaves required readiness
   * requirements unsatisfied, name the EXACT typed input field that advances each
   * one (prose in sanitizedTurnSummary seeds a latent hypothesis only).
   */
  readonly readinessAdvisory?: {
    readonly unsatisfied: readonly { readonly requirementId: string; readonly expectedInputField: string }[];
    readonly note: string;
  };
  /**
   * P4 — consuming-layer mutation lane. Echoes the declared `mode`, its per-mode
   * `authorization` verdict (from state.mutationAuthorization), and the full set of
   * `selectableModes`, so an operator running consuming-layer work can declare
   * `consumer-data-write` / `proposal-only` and SEE the per-mode authorization
   * instead of only the promotion boolean. Surfaced on `start` and `turn`.
   */
  readonly mutationLane?: {
    readonly mode: MutationMode;
    readonly authorization: NonNullable<OntologyEngineeringWorkflowState["mutationAuthorization"]>;
    readonly selectableModes: readonly MutationMode[];
    readonly note: string;
  };
  /**
   * P3 — make the `turnDecisionSpecs` → `choiceApplications` round-trip discoverable
   * from the tool surface. When the turn minted decision specs that no
   * `userDecisionRecord` has answered yet, ECHO the still-open `choiceId`s and NAME
   * the input field (`choiceApplications`) that records them, so the operator can act
   * on the `decision-ledger.forward-only-existing-gap` warning without
   * reverse-engineering the input schema. Surfaced on `turn`; absent when every spec
   * already round-tripped (no open decisions).
   */
  readonly decisionAdvisory?: {
    readonly openChoiceIds: readonly string[];
    readonly openChoices: readonly { readonly choiceId: string; readonly kind: UserDecisionKind; readonly label: string }[];
    readonly recordInputField: "choiceApplications";
    readonly note: string;
  };
  /**
   * P5b — make the session self-locating. Echo the CURRENT derived `phase` plus the
   * canonical NEXT action (the head of the state's already-derived
   * `allowedNextActions`, with the full set alongside), so a tool response states
   * where the session is and what to call next. Pure response-augmentation: reads
   * `state.phase` / `state.allowedNextActions` (no state-write change). Surfaced on
   * `turn`.
   */
  readonly phaseAdvisory?: {
    readonly phase: OntologyEngineeringWorkflowState["phase"];
    readonly canonicalNextAction: OntologyEngineeringWorkflowAction;
    readonly allowedNextActions: readonly OntologyEngineeringWorkflowAction[];
    readonly note: string;
  };
}

const MINIMAL_ROOT_PAYLOAD_EXAMPLE =
  '{"projectRoot":"/absolute/project/root","action":"status"}';
const MINIMAL_TURN_PAYLOAD_EXAMPLE =
  '{"projectRoot":"/absolute/project/root","action":"turn","sessionId":"fde-session:example","sanitizedTurnSummary":"Summarize the approved user meaning."}';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertInput(value: unknown): asserts value is OntologyEngineeringWorkflowHandlerInput {
  if (!isRecord(value)) {
    throw new Error("pm_ontology_engineering_workflow requires an input object.");
  }
  if (
    value.action !== "start" &&
    value.action !== "turn" &&
    value.action !== "draft_sic" &&
    value.action !== "approve_sic" &&
    value.action !== "approve_technology_recommendation" &&
    value.action !== "ingest" &&
    value.action !== "register" &&
    value.action !== "rebind_registered" &&
    value.action !== "drift_rebind" &&
    value.action !== "lint" &&
    value.action !== "elevate" &&
    value.action !== "approve_source_mutation" &&
    value.action !== "status"
  ) {
    throw new Error("pm_ontology_engineering_workflow action must be start, turn, draft_sic, approve_sic, approve_technology_recommendation, ingest, register, rebind_registered, drift_rebind, lint, elevate, approve_source_mutation, or status.");
  }
  if (!hasNonEmptyString(value, "project") && !hasNonEmptyString(value, "projectRoot")) {
    throw new Error(
      "pm_ontology_engineering_workflow: missing_project_root: `projectRoot` is required for public MCP calls. " +
        "Legacy direct callers may pass `project`; accepted aliases are `projectRoot` and `project`. " +
        `Minimal payload: ${MINIMAL_ROOT_PAYLOAD_EXAMPLE}`,
    );
  }
  if (value.action === "turn" && !hasNonEmptyString(value, "sanitizedTurnSummary")) {
    throw new Error(
      "pm_ontology_engineering_workflow: missing_sanitized_turn_summary: `sanitizedTurnSummary` is required when action is `turn`. " +
        `Minimal turn payload: ${MINIMAL_TURN_PAYLOAD_EXAMPLE}`,
    );
  }
  if (
    (value.action === "ingest" || value.action === "elevate") &&
    !hasNonEmptyString(value, "sourceJsonlPath")
  ) {
    throw new Error(
      "pm_ontology_engineering_workflow: missing_source_jsonl_path: `sourceJsonlPath` is required when action is `ingest` or `elevate`.",
    );
  }
}

function hasNonEmptyString(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0;
}

function projectRoot(input: OntologyEngineeringWorkflowHandlerInput): string {
  return input.projectRoot?.trim() || input.project?.trim() || "";
}

function sessionIdFromRef(ref: string | undefined): string | undefined {
  return ref?.replace(/^fde-ontology-engineering:\/\/session\//, "");
}

function readUniversalEntry(
  input: OntologyEngineeringWorkflowHandlerInput,
): UniversalOntologyEntry | undefined {
  const root = projectRoot(input);
  if (input.universalOntologyEntryRef) {
    return readUniversalOntologyEntryByRef(root, input.universalOntologyEntryRef);
  }
  if (input.universalOntologyEntryId) {
    return readUniversalOntologyEntry(root, input.universalOntologyEntryId);
  }
  return readCurrentUniversalOntologyEntry(root);
}

function readWorkflowCurrentSession(
  root: string,
): FDEOntologyEngineeringSession | undefined {
  const currentWorkflow = readCurrentOntologyEngineeringWorkflowState(root);
  if (currentWorkflow?.fdeSessionId === undefined) return undefined;
  return readFDEOntologyEngineeringSession(root, currentWorkflow.fdeSessionId) ?? undefined;
}

function readSessionByInput(
  input: OntologyEngineeringWorkflowHandlerInput,
): FDEOntologyEngineeringSession | undefined {
  const root = projectRoot(input);
  const sessionId = sessionIdFromRef(input.fdeSessionRef) ?? input.sessionId;
  if (sessionId !== undefined) {
    return readFDEOntologyEngineeringSession(root, sessionId) ?? undefined;
  }
  return readWorkflowCurrentSession(root) ??
    readCurrentFDEOntologyEngineeringSession(root) ??
    undefined;
}

function createOrReadSessionFromEntry(
  input: OntologyEngineeringWorkflowHandlerInput,
  required: boolean,
): FDEOntologyEngineeringSession | undefined {
  const root = projectRoot(input);
  const existing = readSessionByInput(input);
  if (existing !== undefined) return existing;

  const entry = readUniversalEntry(input);
  if (entry === undefined) {
    if (!required) return undefined;
    throw new Error("pm_ontology_engineering_workflow could not resolve UniversalOntologyEntry.");
  }

  const candidate = createFDEOntologyEngineeringSessionFromEntry({
    entry,
    sessionId: input.sessionId,
    ontologyContextQueryRef: input.ontologyContextQueryRef,
    workflowTraceRef: input.workflowTraceRef,
    createdAt: input.createdAt,
  });
  const alreadyWritten = readFDEOntologyEngineeringSession(root, candidate.sessionId);
  const session = alreadyWritten ?? candidate;
  if (alreadyWritten === null) writeFDEOntologyEngineeringSessionSnapshot(session);
  return session;
}

function selectedChoiceIds(input: OntologyEngineeringWorkflowHandlerInput): readonly string[] {
  return (input.choiceApplications ?? [])
    .map((choice) => choice.choiceId)
    .filter((choiceId): choiceId is string =>
      typeof choiceId === "string" && choiceId.length > 0
    );
}

/**
 * P2 — map an unsatisfied readiness requirementId to the EXACT typed input field a
 * `turn` must carry to advance it. Prose in `sanitizedTurnSummary` only seeds a
 * latent hypothesis (see lib/fde-ontology-engineering/implicit-intent.ts:14-24); the
 * grader (readiness-profile.ts) credits only these typed signal fields. Field names
 * mirror FDEImplicitIntentSignal (`objectNames`/`linkNames`/… under `signal`) + the
 * turn input (`confirmedNonGoals`, `acceptedHypothesisIds`, `choiceApplications`).
 */
const READINESS_REQUIREMENT_INPUT_FIELD: Readonly<Record<string, string>> = {
  mission: "signal.mission (operationalDecision + decisionOwnerRole)",
  evidence: "signal.evidence (evidenceDefinition + sourceArtifactRefs)",
  "evidence-classification": "signal.evidence.sourceArtifactRefs / signal.sourceRefs",
  object: "signal.objectNames",
  link: "signal.linkNames",
  action: "signal.actionNames",
  function: "signal.functionNames",
  "chatbot-context": "signal.chatbotContextNames",
  "application-state": "signal.chatbotContextNames (with applicationStateNeed)",
  "non-goals": "confirmedNonGoals",
  "latent-intent-decision": "choiceApplications / acceptedHypothesisIds",
  evaluation: "signal.mission.successSignals / signal.evidence.observableSignals",
  "submission-criteria": "signal.actionNames (with submissionCriteria)",
  governance: "resolve blocking clarificationQuestions",
};

function readinessAdvisoryForSession(
  session: FDEOntologyEngineeringSession,
): OntologyEngineeringWorkflowHandlerResult["readinessAdvisory"] {
  const results = session.readinessProfile?.requirementResults ?? [];
  const unsatisfied = results
    .filter((result) => !result.satisfied)
    .map((result) => ({
      requirementId: result.requirementId,
      expectedInputField:
        READINESS_REQUIREMENT_INPUT_FIELD[result.requirementId] ?? "typed turn signal field",
    }));
  if (unsatisfied.length === 0) return undefined;
  return {
    unsatisfied,
    note:
      "Readiness is graded from typed turn-signal fields, not free text. Prose in `sanitizedTurnSummary` seeds a latent hypothesis only — pass the named fields to advance each requirement.",
  };
}

/**
 * P4 — the consuming-layer lane inputs (`mutationMode` + the lighter-lane proof
 * fields). These are read OFF the raw input record rather than declared as keys of
 * {@link OntologyEngineeringWorkflowHandlerInput} on purpose: the SSoT-conformance
 * test (`tests/bridge/mcp-server-schema.test.ts`) asserts at the TYPE level that
 * every key of the public input type is in its enumerated public-field list, and
 * that list + the published MCP schema must move together in a single edit this
 * single-writer wave may not make to the test. Reading them through this narrowing
 * accessor lets a caller DECLARE a lane today (operator-actionable) without widening
 * `keyof OntologyEngineeringWorkflowHandlerInput`. Publishing them on the MCP schema
 * + the test list is the small Wave-3 follow-up flagged in the wave return.
 */
const MUTATION_MODES: readonly MutationMode[] = [
  "read-only",
  "proposal-only",
  "dry-run/sandbox",
  "consumer-data-write",
  "builder-structure-write",
  "approved-commit",
  "armed-side-effect",
];

interface MutationLaneInputs {
  readonly mutationMode?: MutationMode;
  readonly consumerActionTypeRef?: string;
  readonly consumerWriteValidated?: boolean;
  readonly approvedCommitRef?: string;
  readonly sideEffectArmed?: boolean;
}

function mutationLaneInputs(input: OntologyEngineeringWorkflowHandlerInput): MutationLaneInputs {
  const raw = input as unknown as Record<string, unknown>;
  const rawMode = raw.mutationMode;
  const mutationMode =
    typeof rawMode === "string" && (MUTATION_MODES as readonly string[]).includes(rawMode)
      ? (rawMode as MutationMode)
      : undefined;
  const consumerActionTypeRef =
    typeof raw.consumerActionTypeRef === "string" ? raw.consumerActionTypeRef : undefined;
  const consumerWriteValidated =
    typeof raw.consumerWriteValidated === "boolean" ? raw.consumerWriteValidated : undefined;
  const approvedCommitRef =
    typeof raw.approvedCommitRef === "string" ? raw.approvedCommitRef : undefined;
  const sideEffectArmed =
    typeof raw.sideEffectArmed === "boolean" ? raw.sideEffectArmed : undefined;
  return {
    mutationMode,
    consumerActionTypeRef,
    consumerWriteValidated,
    approvedCommitRef,
    sideEffectArmed,
  };
}

/**
 * P4 — surface the consuming-layer mutation lane on the tool response. Echoes the
 * declared mode, its per-mode authorization verdict (carried on the derived state),
 * and the full set of selectable modes, so a consuming-layer effort can declare
 * `consumer-data-write` / `proposal-only` and SEE the per-mode authorization instead
 * of only the promotion boolean (`state.mutationAuthorized`).
 */
function mutationLaneForState(
  state: OntologyEngineeringWorkflowState,
): OntologyEngineeringWorkflowHandlerResult["mutationLane"] {
  const authorization = state.mutationAuthorization;
  if (authorization === undefined) return undefined;
  return {
    mode: state.mutationMode ?? authorization.mode,
    authorization,
    selectableModes: MUTATION_MODES,
    note:
      "Declare `mutationMode` to select a lane. `builder-structure-write` (default) keeps the full 9-axis SIC + DTC promotion gate; `consumer-data-write` / `proposal-only` are the lighter consuming-layer lanes — `state.mutationAuthorized` (the promotion boolean) is unchanged.",
  };
}

/**
 * P3 — surface the `turnDecisionSpecs` → `choiceApplications` round-trip on the tool
 * response. Diffs the minted decision specs against the records just written to
 * state: a spec is OPEN when no `userDecisionRecord` carries its `choiceId`. When any
 * remain open, echo their `choiceId`s (with `kind` + `label` for actionability) and
 * NAME the input field — `choiceApplications` — that records them. Returns undefined
 * when every spec already round-tripped (nothing to act on), mirroring
 * {@link readinessAdvisoryForSession}/{@link mutationLaneForState} (pure
 * response-augmentation; no state-write change).
 */
function decisionAdvisoryForState(
  state: OntologyEngineeringWorkflowState,
): OntologyEngineeringWorkflowHandlerResult["decisionAdvisory"] {
  const specs = state.turnDecisionSpecs;
  if (specs.length === 0) return undefined;
  const answered = new Set(state.userDecisionRecords.map((record) => record.choiceId));
  const open = specs.filter((spec) => !answered.has(spec.choiceId));
  if (open.length === 0) return undefined;
  return {
    openChoiceIds: open.map((spec) => spec.choiceId),
    openChoices: open.map((spec) => ({
      choiceId: spec.choiceId,
      kind: spec.kind,
      label: spec.label,
    })),
    recordInputField: "choiceApplications",
    note:
      "Open turn-card decisions have no matching UserDecisionRecord. Record them by passing `choiceApplications` (an array of `{ choiceId, kind }`) on the next call — each submitted `choiceId` mints a UserDecisionRecord and clears the `decision-ledger.forward-only-existing-gap` warning.",
  };
}

/**
 * P5b — make the session self-locating. Echo the CURRENT derived `phase` plus the
 * canonical NEXT action. Both are already computed on the derived state
 * (`deriveAllowedNextActions` orders the list most-advanced-first via `unshift`, so
 * the head is canonical); this is a pure echo of `state.phase` /
 * `state.allowedNextActions`, not a re-derivation. Returns undefined only if the
 * state somehow carries no allowed action (defensive — `deriveAllowedNextActions`
 * always returns at least `["status"]`).
 */
function phaseAdvisoryForState(
  state: OntologyEngineeringWorkflowState,
): OntologyEngineeringWorkflowHandlerResult["phaseAdvisory"] {
  const allowedNextActions = state.allowedNextActions;
  const canonicalNextAction = allowedNextActions[0];
  if (canonicalNextAction === undefined) return undefined;
  return {
    phase: state.phase,
    canonicalNextAction,
    allowedNextActions,
    note:
      `Session phase is \`${state.phase}\`. The canonical next action is \`${canonicalNextAction}\` (the head of \`state.allowedNextActions\`); the full allowed set is [${allowedNextActions.join(", ")}].`,
  };
}

function kindFromDecision(value: string | undefined): UserDecisionRecord["kind"] | undefined {
  switch (value) {
    case "accepted":
    case "accept":
      return "accept";
    case "rejected":
    case "reject":
      return "reject";
    case "deferred":
    case "defer":
      return "defer";
    case "answered":
    case "answer":
      return "answer";
    default:
      return undefined;
  }
}

function handlerInputDecisionRecords(
  input: OntologyEngineeringWorkflowHandlerInput,
  recordedAt: string,
): readonly UserDecisionRecord[] {
  return (input.choiceApplications ?? [])
    .map((choice, index): UserDecisionRecord | undefined => {
      const choiceId = choice.choiceId;
      if (typeof choiceId !== "string" || choiceId.length === 0) return undefined;
      const kind = choice.kind ?? kindFromDecision(choice.decision);
      if (kind === undefined) return undefined;
      return {
        decisionId: choice.decisionId ?? `handler-input:${choiceId}:${index}`,
        choiceId,
        kind,
        recordedAt,
        source: "handler-input",
        targetHypothesisId: choice.targetHypothesisId,
        appliesToRequirementIds: choice.appliesToRequirementIds ?? [],
        note: choice.note ?? input.recordedDecisionNote,
        fdeSessionRef: choice.fdeSessionRef ?? input.fdeSessionRef ??
          (input.sessionId ? fdeOntologyEngineeringSessionRef(input.sessionId) : undefined),
        approvedMutationBoundary: choice.approvedMutationBoundary,
      };
    })
    .filter((record): record is UserDecisionRecord => record !== undefined);
}

function workflowIdForSession(session: FDEOntologyEngineeringSession | undefined): string | undefined {
  return session ? `ontology-engineering-workflow:${session.sessionId}` : undefined;
}

function readPreviousWorkflowState(input: {
  readonly root: string;
  readonly action: OntologyEngineeringWorkflowAction;
  readonly session?: FDEOntologyEngineeringSession;
}): OntologyEngineeringWorkflowState | null {
  if (input.action === "start") return null;
  const workflowId = workflowIdForSession(input.session);
  if (workflowId !== undefined) {
    return readOntologyEngineeringWorkflowState(input.root, workflowId);
  }
  return readCurrentOntologyEngineeringWorkflowState(input.root);
}

function previousRecords(
  root: string,
  session: FDEOntologyEngineeringSession | undefined,
): readonly UserDecisionRecord[] {
  return readPreviousWorkflowState({ root, action: "turn", session })?.userDecisionRecords ?? [];
}

function deriveStateSnapshot(input: {
  readonly handlerInput: OntologyEngineeringWorkflowHandlerInput;
  readonly session?: FDEOntologyEngineeringSession;
  readonly turnDecisionSpecs?: readonly TurnCardDecisionSpec[];
  readonly userDecisionRecords?: readonly UserDecisionRecord[];
  readonly semanticIntentContract?: SemanticIntentContract;
  readonly preservePreviousUpdatedAt?: boolean;
  readonly registeredAt?: string;
}): OntologyEngineeringWorkflowState {
  const root = projectRoot(input.handlerInput);
  const preservePrevious = input.handlerInput.action !== "start";
  const previous = preservePrevious
    ? readPreviousWorkflowState({
      root,
      action: input.handlerInput.action,
      session: input.session,
    })
    : null;
  const semanticIntentContractRef =
    input.semanticIntentContract?.contractId ??
    input.handlerInput.semanticIntentContractRef ??
    (preservePrevious ? previous?.semanticIntentContractRef : undefined);
  const semanticIntentContractStatus =
    input.semanticIntentContract?.status ??
    input.handlerInput.semanticIntentContractStatus ??
    (preservePrevious ? previous?.semanticIntentContractStatus : undefined);
  // P4 — the declared mutation mode is a DECLARATION (persists across turns like the
  // contract refs); absent ⇒ the constructor defaults to DEFAULT_MUTATION_MODE. The
  // four proof inputs below are live per-call signals (gate "may this write proceed
  // now"), so they are read straight from the input without prior-state fallback.
  // Read via the narrowing accessor (see `mutationLaneInputs`) so the public input
  // type's key set — which the SSoT-conformance test pins — is not widened.
  const laneInputs = mutationLaneInputs(input.handlerInput);
  const mutationMode: MutationMode | undefined =
    laneInputs.mutationMode ??
    (preservePrevious ? previous?.mutationMode : undefined);
  return deriveOntologyEngineeringWorkflowState({
    projectRoot: root,
    fdeSession: input.session,
    semanticIntentContractRef,
    semanticIntentContractStatus,
    digitalTwinChangeContractRef:
      input.handlerInput.digitalTwinChangeContractRef ??
      (preservePrevious ? previous?.digitalTwinChangeContractRef : undefined),
    digitalTwinChangeContractStatus:
      input.handlerInput.digitalTwinChangeContractStatus ??
      (preservePrevious ? previous?.digitalTwinChangeContractStatus : undefined),
    workContractRef:
      input.handlerInput.workContractRef ??
      (preservePrevious ? previous?.workContractRef : undefined),
    mutationMode,
    consumerActionTypeRef: laneInputs.consumerActionTypeRef,
    consumerWriteValidated: laneInputs.consumerWriteValidated,
    approvedCommitRef: laneInputs.approvedCommitRef,
    sideEffectArmed: laneInputs.sideEffectArmed,
    registeredAt:
      input.registeredAt ?? (preservePrevious ? previous?.registeredAt : undefined),
    turnDecisionSpecs:
      input.turnDecisionSpecs ?? (preservePrevious ? previous?.turnDecisionSpecs : undefined) ?? [],
    userDecisionRecords:
      input.userDecisionRecords ?? (preservePrevious ? previous?.userDecisionRecords : undefined) ?? [],
    createdAt: (preservePrevious ? previous?.createdAt : undefined) ?? input.handlerInput.createdAt,
    updatedAt: input.preservePreviousUpdatedAt
      ? previous?.updatedAt ?? input.handlerInput.emittedAt
      : input.handlerInput.emittedAt,
  });
}

function statePaths(state: OntologyEngineeringWorkflowState): {
  readonly statePath: string;
  readonly currentPath: string;
} {
  return {
    statePath: ontologyEngineeringWorkflowStatePath(state.projectRoot, state.contractId),
    currentPath: ontologyEngineeringWorkflowCurrentPath(state.projectRoot),
  };
}

function readState(input: {
  readonly handlerInput: OntologyEngineeringWorkflowHandlerInput;
  readonly session?: FDEOntologyEngineeringSession;
  readonly turnDecisionSpecs?: readonly TurnCardDecisionSpec[];
  readonly userDecisionRecords?: readonly UserDecisionRecord[];
  readonly semanticIntentContract?: SemanticIntentContract;
}): OntologyEngineeringWorkflowHandlerResult {
  const state = deriveStateSnapshot({ ...input, preservePreviousUpdatedAt: true });
  const paths = statePaths(state);
  return {
    action: input.handlerInput.action,
    state,
    statePath: paths.statePath,
    currentPath: paths.currentPath,
    session: input.session,
    sessionRef: input.session ? fdeOntologyEngineeringSessionRef(input.session.sessionId) : undefined,
    semanticIntentContract: input.semanticIntentContract,
  };
}

function writeState(input: {
  readonly handlerInput: OntologyEngineeringWorkflowHandlerInput;
  readonly session?: FDEOntologyEngineeringSession;
  readonly turnDecisionSpecs?: readonly TurnCardDecisionSpec[];
  readonly userDecisionRecords?: readonly UserDecisionRecord[];
  readonly semanticIntentContract?: SemanticIntentContract;
}): OntologyEngineeringWorkflowHandlerResult {
  const state = deriveStateSnapshot(input);
  const written = writeOntologyEngineeringWorkflowState(state);
  return {
    action: input.handlerInput.action,
    state,
    statePath: written.statePath,
    currentPath: written.currentPath,
    session: input.session,
    sessionRef: input.session ? fdeOntologyEngineeringSessionRef(input.session.sessionId) : undefined,
    semanticIntentContract: input.semanticIntentContract,
  };
}

/**
 * Persist the terminal `registered` state after a COMMITTED register/elevate (S1
 * state-sync closure). Threads a `registeredAt` signal so the derived top-level
 * phase advances to `registered` and is WRITTEN (not just readState-derived),
 * reconciling it with the nested elevate.phase namespace. Preserves the SEPARATE
 * `sourceMutationApprovals` array, which deriveOntologyEngineeringWorkflowState
 * does not carry (same accumulate-from-disk pattern as approve_source_mutation).
 */
function writeRegisteredState(input: {
  readonly handlerInput: OntologyEngineeringWorkflowHandlerInput;
  readonly session?: FDEOntologyEngineeringSession;
  readonly registeredAt: string;
}): OntologyEngineeringWorkflowHandlerResult {
  const root = projectRoot(input.handlerInput);
  const state = deriveStateSnapshot({
    handlerInput: input.handlerInput,
    session: input.session,
    registeredAt: input.registeredAt,
  });
  const prev = readPreviousWorkflowState({ root, action: input.handlerInput.action, session: input.session });
  const prevApprovals = prev?.sourceMutationApprovals ?? [];
  // OE-2 — preserve the minted approved-SIC snapshot across the terminal write the
  // same accumulate-from-disk way as sourceMutationApprovals (derive drops both).
  const nextState: OntologyEngineeringWorkflowState = {
    ...state,
    ...(prevApprovals.length > 0 ? { sourceMutationApprovals: prevApprovals } : {}),
    ...(prev?.approvedSemanticIntentContractSnapshot !== undefined
      ? { approvedSemanticIntentContractSnapshot: prev.approvedSemanticIntentContractSnapshot }
      : {}),
  };
  const written = writeOntologyEngineeringWorkflowState(nextState);
  return {
    action: input.handlerInput.action,
    state: nextState,
    statePath: written.statePath,
    currentPath: written.currentPath,
    session: input.session,
    sessionRef: input.session ? fdeOntologyEngineeringSessionRef(input.session.sessionId) : undefined,
  };
}

/**
 * Map an FDE session's candidate arrays to the construction-lint input. The
 * lint pass is purely structural (objects/actions/functions/links/roles), so
 * this is the single mapping used by BOTH the `lint` seam and the advisory
 * attach on `register`.
 */
function lintFindingsForSession(session: FDEOntologyEngineeringSession) {
  return lintConstructionCandidates({
    objects: session.objectCandidates,
    actions: session.actionCandidates,
    functions: session.functionCandidates,
    links: session.linkCandidates,
    roles: session.roleCandidates ?? [],
  });
}

/**
 * `lint` seam — a callable, READ-ONLY construction anti-pattern pass.
 *
 * UNGATED (no approval needed, like `status`/`turn`): read the project session,
 * run the 8 construction lints over its candidate arrays, and return the
 * freshly-derived workflow state plus the lint findings. Mutates nothing.
 */
function handleLint(
  input: OntologyEngineeringWorkflowHandlerInput,
): OntologyEngineeringWorkflowHandlerResult {
  const root = projectRoot(input);
  if (root.length === 0) {
    throw new Error("pm_ontology_engineering_workflow lint requires a projectRoot.");
  }
  const session = readSessionByInput(input);
  if (session === undefined) {
    throw new Error("pm_ontology_engineering_workflow lint requires an existing FDE session.");
  }
  const lint: OntologyEngineeringLintResult = { findings: lintFindingsForSession(session) };
  return { ...readState({ handlerInput: input, session }), lint };
}

/**
 * `ingest` seam — feed a frozen NC1 SOURCE jsonl into the register pipeline.
 *
 * Pre-approval (NO approval gate — like `turn`): parse the SOURCE jsonl into the
 * five candidate arrays and merge them onto the project's FDE session, so the
 * elevation flow can continue: ingest → draft_sic → approve → register. Returns
 * the freshly-derived workflow state plus the ingest counts + skipped report.
 */
function handleIngest(
  input: OntologyEngineeringWorkflowHandlerInput,
): OntologyEngineeringWorkflowHandlerResult {
  const root = projectRoot(input);
  if (root.length === 0) {
    throw new Error("pm_ontology_engineering_workflow ingest requires a projectRoot.");
  }
  const sourceJsonlPath = input.sourceJsonlPath?.trim();
  if (sourceJsonlPath === undefined || sourceJsonlPath.length === 0) {
    throw new Error("pm_ontology_engineering_workflow ingest requires a sourceJsonlPath.");
  }

  const { session, counts, skipped } = ingestJsonlSourceToCandidates({
    sourceJsonlPath,
    projectRoot: root,
    rawUserRequest: input.recordedDecisionNote,
  });

  const ingest: OntologyEngineeringIngestResult = { counts, skipped };
  return { ...readState({ handlerInput: input, session }), ingest };
}

/**
 * ENTRY-loop `register` seam (O-2 closure). An EXPLICIT call materializes an
 * approved ontology-engineering session's accepted candidate set into
 * registered, READABLE primitives: register → commit → materialize → read,
 * per-project isolated. NOT auto-fired on the approval transition — re-gated here.
 *
 * Precondition gate (D3 + D5): refuse unless BOTH hold —
 *   (a) approval: the workflow has reached digital-twin-approved (SIC approved +
 *       valid ref AND DTC approved + valid ref — the front-door FSM
 *       `digital_twin_approved` + isApprovedSemanticIntentContract semantics,
 *       encoded by deriveOntologyEngineeringWorkflowState's contract-approved check);
 *   (b) grade: the FDE readiness grade passed (session.readinessProfile.
 *       readyForDigitalTwin === true — the grade signal reachable in this
 *       handler's context).
 * When not (approved AND graded): return an INVALID no-op (invalidReason) and
 * write NO edits.
 */
async function handleRegister(
  input: OntologyEngineeringWorkflowHandlerInput,
): Promise<OntologyEngineeringWorkflowHandlerResult> {
  const root = projectRoot(input);
  if (root.length === 0) {
    throw new Error("pm_ontology_engineering_workflow register requires a projectRoot.");
  }
  const session = readSessionByInput(input);
  if (session === undefined) {
    throw new Error("pm_ontology_engineering_workflow register requires an existing FDE session.");
  }

  // Derive the workflow state (reads prior persisted contract approval + handler
  // input). phase digital-twin-approved / mutation-authorized ⇒ SIC + DTC approved.
  const state = deriveStateSnapshot({ handlerInput: input, session, preservePreviousUpdatedAt: true });
  const phaseApproved =
    state.phase === "digital-twin-approved" ||
    state.phase === "mutation-authorized" ||
    state.phase === "registered";
  // OE-2 (OP-2 / D3-1) — the phase above is derived from the caller-settable
  // semanticIntentContractStatus string (forgeable). RE-VERIFY against the MINTED
  // approved-SIC snapshot persisted by `approve_sic`: load it from the persisted
  // workflow state and run `isApprovedSemanticIntentContract` (unforgeable minted
  // approvalRef required). A model adapter passing status:"approved" with NO minted
  // SIC no longer authorizes — the snapshot is absent ⇒ mintedSicReverified is false.
  const persistedSnapshot = readPreviousWorkflowState({
    root,
    action: input.action,
    session,
  })?.approvedSemanticIntentContractSnapshot;
  const mintedSicReverified = isApprovedSemanticIntentContract(persistedSnapshot);
  const approved = phaseApproved && mintedSicReverified;
  // OE-2 (dead-gate repair) — the FDE readiness flag can NEVER be true via a
  // sanctioned path (every FDE_READINESS_PROFILE has allowsDtcDraft:false, so the
  // evaluator can only ever grade readyForDigitalTwin:false). Grade ALSO from the
  // GENUINE, UNFORGEABLE evidence: the re-verified minted approved-SIC snapshot
  // (the SAME persistedSnapshot above) + ingested object candidates. OR'd, never
  // replacing the flag — a caller still cannot fabricate either branch.
  const graded =
    session.readinessProfile?.readyForDigitalTwin === true ||
    sicBackedDigitalTwinReady(persistedSnapshot, session);

  if (!approved || !graded) {
    const reasons: string[] = [];
    if (!approved) {
      if (!phaseApproved) {
        reasons.push(
          `digital-twin contract not approved (workflow phase=${state.phase}; require SIC+DTC approved)`,
        );
      }
      if (!mintedSicReverified) {
        reasons.push(
          "no minted approved SemanticIntentContract re-verified (OE-2): the persisted SIC snapshot must pass " +
            "isApprovedSemanticIntentContract (minted approvalRef) — a caller-supplied status:\"approved\" alone does not authorize",
        );
      }
    }
    if (!graded) {
      reasons.push("FDE readiness grade not passed (readinessProfile.readyForDigitalTwin !== true)");
    }
    const register: OntologyEngineeringRegisterResult = {
      committed: false,
      registered: { objectTypes: [], actionTypes: [], functions: [], linkTypes: [], roles: [], properties: [] },
      skipped: { links: [] },
      invalidReason: reasons.join("; "),
    };
    return { ...readState({ handlerInput: input, session }), register };
  }

  // Already-materialized rids → skip on re-register (idempotency against the
  // append-only fold, which does not itself dedup).
  const snapshot = (await getOntology({ project: root })).snapshot.registeredPrimitives;
  // FOLD-1: bucket entries are now { rid, declaration? } — project to bare rids
  // for the idempotency set.
  const alreadyRegistered = new Set<string>([
    ...(snapshot?.objectTypes ?? []),
    ...(snapshot?.actionTypes ?? []),
    ...(snapshot?.functions ?? []),
    ...(snapshot?.linkTypes ?? []),
    ...(snapshot?.roles ?? []),
    ...(snapshot?.properties ?? []),
  ].map((e) => e.rid));

  const { edits, registered, skipped } = await registerAcceptedCandidates({
    session,
    projectRoot: root,
    alreadyRegistered,
  });

  if (edits.length === 0) {
    const register: OntologyEngineeringRegisterResult = {
      committed: false,
      registered: { objectTypes: [], actionTypes: [], functions: [], linkTypes: [], roles: [], properties: [] },
      skipped,
      invalidReason: "nothing to register: no new accepted candidates (all already registered or none present)",
    };
    return { ...readState({ handlerInput: input, session }), register };
  }

  // Single batched commit (D4) through the ONE commit path (commit_edits handler).
  // The handler attaches its own 5-dim lineage (byWhom defaults to the runtime
  // identity; reasoning records the dryRunRef) — see commit.ts:baseLineage.
  const commitResult = await commitEditsHandler({
    project: root,
    actionTypeRid: COMMIT_EDITS_ACTION_TYPE_RID,
    edits,
  });

  // Construction anti-pattern lint over the same session candidate arrays.
  // ADVISORY: findings are surfaced on the register result, but the gate has
  // already passed and the commit proceeds regardless — never block on findings.
  const register: OntologyEngineeringRegisterResult = {
    committed: true,
    registered,
    skipped,
    commitResult,
    lint: lintFindingsForSession(session),
  };
  const registeredAt = input.emittedAt ?? new Date().toISOString();
  return { ...writeRegisteredState({ handlerInput: input, session, registeredAt }), register };
}

/**
 * `rebind_registered` seam (7.22.2) — PURE-PROVENANCE drift-fold re-elevation.
 *
 * Re-emits the EXISTING declaration of each verified already-registered rid as an
 * edit so commitEdits stamps a fresh `edit_committed` at `atopWhich=HEAD`, flipping
 * the rid from stale to clean WITHOUT any grammar change (no new primitive, no
 * semantic edit). Modeled on `handleRegister` but kept as a SEPARATE action so the
 * `register` contract (`edits.length===0 ⇒ committed:false` idempotency) stays
 * byte-identical.
 *
 * FAIL-CLOSED rid resolution (two independent proofs):
 *   PROOF 1 (unforgeable) — rid ∈ live getOntology snapshot registeredPrimitives.
 *   PROOF 2 (caller-supplied) — rid ∈ input.rebindRids.
 * Re-bind set = PROOF1 ∩ PROOF2. A rid NOT in the snapshot is REJECTED (a new rid
 * can NEVER flow through this action). Empty intersection ⇒ committed:false with a
 * DISTINCT invalidReason (not the generic register "nothing to register" string).
 *
 * Each rid's declaration is SOURCED from the live snapshot (never re-minted), turned
 * back into an accepted candidate (declaredRid = rid so the rid round-trips
 * deterministically), and driven through Part-A re-bind mode of
 * `registerAcceptedCandidates` → the SAME `commitEditsHandler` call `handleRegister`
 * uses. Reuses `handleRegister`'s `approved && graded` gate (defense-in-depth) so a
 * minted SIC is still required even on a direct lib-import path that bypassed the hooks.
 */
async function handleRegisterRebind(
  input: OntologyEngineeringWorkflowHandlerInput,
): Promise<OntologyEngineeringWorkflowHandlerResult> {
  const root = projectRoot(input);
  if (root.length === 0) {
    throw new Error("pm_ontology_engineering_workflow rebind_registered requires a projectRoot.");
  }
  const session = readSessionByInput(input);
  if (session === undefined) {
    throw new Error("pm_ontology_engineering_workflow rebind_registered requires an existing FDE session.");
  }

  // ── Defense-in-depth gate (identical to handleRegister) — re-bind is still a
  //    governed mutation; a minted approved SIC + readiness grade are required even
  //    on a direct lib-import path that bypassed the PreToolUse hooks. ─────────────
  const state = deriveStateSnapshot({ handlerInput: input, session, preservePreviousUpdatedAt: true });
  const phaseApproved =
    state.phase === "digital-twin-approved" ||
    state.phase === "mutation-authorized" ||
    state.phase === "registered";
  const persistedSnapshot = readPreviousWorkflowState({
    root,
    action: input.action,
    session,
  })?.approvedSemanticIntentContractSnapshot;
  const mintedSicReverified = isApprovedSemanticIntentContract(persistedSnapshot);
  const approved = phaseApproved && mintedSicReverified;
  const graded =
    session.readinessProfile?.readyForDigitalTwin === true ||
    sicBackedDigitalTwinReady(persistedSnapshot, session);

  if (!approved || !graded) {
    const reasons: string[] = [];
    if (!approved) {
      if (!phaseApproved) {
        reasons.push(
          `digital-twin contract not approved (workflow phase=${state.phase}; require SIC+DTC approved)`,
        );
      }
      if (!mintedSicReverified) {
        reasons.push(
          "no minted approved SemanticIntentContract re-verified (OE-2): the persisted SIC snapshot must pass " +
            "isApprovedSemanticIntentContract (minted approvalRef) — a caller-supplied status:\"approved\" alone does not authorize",
        );
      }
    }
    if (!graded) {
      reasons.push("FDE readiness grade not passed (readinessProfile.readyForDigitalTwin !== true)");
    }
    const register: OntologyEngineeringRegisterResult = {
      committed: false,
      registered: { objectTypes: [], actionTypes: [], functions: [], linkTypes: [], roles: [], properties: [] },
      skipped: { links: [] },
      invalidReason: reasons.join("; "),
    };
    return { ...readState({ handlerInput: input, session }), register };
  }

  // ── Live snapshot = the unforgeable already-registered PROOF set. ───────────────
  const snapshot = (await getOntology({ project: root })).snapshot.registeredPrimitives;
  const objectTypes = snapshot?.objectTypes ?? [];
  const actionTypes = snapshot?.actionTypes ?? [];
  const functions = snapshot?.functions ?? [];
  const linkTypes = snapshot?.linkTypes ?? [];
  const roles = snapshot?.roles ?? [];
  const properties = snapshot?.properties ?? [];
  const alreadyRegistered = new Set<string>(
    [...objectTypes, ...actionTypes, ...functions, ...linkTypes, ...roles, ...properties].map((e) => e.rid),
  );

  // ── Fail-closed rid resolution: PROOF1 (snapshot) ∩ PROOF2 (rebindRids). A
  //    supplied rid NOT already-registered is REJECTED into `unverified` and NEVER
  //    flows to the emit path (a new rid can never be re-bound). ───────────────────
  const requestedRids = input.rebindRids ?? [];
  const targetRids = new Set<string>();
  const unverifiedRids: string[] = [];
  for (const rid of requestedRids) {
    if (alreadyRegistered.has(rid)) targetRids.add(rid);
    else unverifiedRids.push(rid);
  }

  if (targetRids.size === 0) {
    const detail =
      requestedRids.length === 0
        ? "no rebindRids supplied"
        : `none of the ${requestedRids.length} supplied rid(s) are already-registered (unverified: ${unverifiedRids.join(", ")})`;
    const register: OntologyEngineeringRegisterResult = {
      committed: false,
      registered: { objectTypes: [], actionTypes: [], functions: [], linkTypes: [], roles: [], properties: [] },
      skipped: { links: [] },
      invalidReason: `no verified re-bind rids: ${detail}`,
    };
    return { ...readState({ handlerInput: input, session }), register };
  }

  // ── SOURCE each target rid's EXISTING declaration from the snapshot (never
  //    re-mint) → reconstruct an accepted candidate (declaredRid = rid so the rid
  //    round-trips deterministically through Part-A). A rid→plainName index over the
  //    object buckets lets a re-bound LINK resolve its endpoint NAMES; a link's
  //    endpoints are re-bound alongside it (a link's HEAD anchoring is meaningless
  //    without its endpoints at HEAD) — grammar-neutral after Part-B dedup. ─────────
  const decl = (e: { declaration?: Record<string, unknown> }): Record<string, unknown> => e.declaration ?? {};
  const ridToPlainName = new Map<string, string>();
  for (const e of [...objectTypes, ...actionTypes, ...functions, ...roles, ...properties]) {
    const name = decl(e).plainName;
    if (typeof name === "string") ridToPlainName.set(e.rid, name);
  }

  const objectCandidates: ObjectTypeCandidate[] = [];
  const actionCandidates: ActionTypeCandidate[] = [];
  const functionCandidates: FunctionCandidate[] = [];
  const roleCandidates: RoleCandidate[] = [];
  const propertyCandidates: PropertyCandidate[] = [];
  const linkCandidates: LinkTypeCandidate[] = [];
  const endpointObjectRids = new Set<string>();

  const baseCandidate = (rid: string, d: Record<string, unknown>) => ({
    candidateId: typeof d.candidateId === "string" ? d.candidateId : rid,
    plainName: typeof d.plainName === "string" ? d.plainName : rid,
    evidenceRefs: Array.isArray(d.evidenceRefs) ? (d.evidenceRefs as readonly string[]) : [],
    declaredRid: rid,
    ...(typeof d.backingSourceRef === "string" ? { backingSourceRef: d.backingSourceRef } : {}),
  });

  for (const e of objectTypes) {
    if (!targetRids.has(e.rid)) continue;
    const d = decl(e);
    objectCandidates.push({
      ...baseCandidate(e.rid, d),
      whyItMayMatter: typeof d.whyItMayMatter === "string" ? d.whyItMayMatter : "",
    });
  }
  for (const e of actionTypes) {
    if (!targetRids.has(e.rid)) continue;
    const d = decl(e);
    actionCandidates.push({
      ...baseCandidate(e.rid, d),
      operationalIntent: typeof d.operationalIntent === "string" ? d.operationalIntent : "",
      writebackRisk:
        d.writebackRisk === "none" || d.writebackRisk === "low" || d.writebackRisk === "medium" || d.writebackRisk === "high"
          ? d.writebackRisk
          : "none",
      ...(Array.isArray(d.submissionCriteria) ? { submissionCriteria: d.submissionCriteria as readonly string[] } : {}),
    });
  }
  for (const e of functions) {
    if (!targetRids.has(e.rid)) continue;
    const d = decl(e);
    functionCandidates.push({
      ...baseCandidate(e.rid, d),
      logicIntent: typeof d.logicIntent === "string" ? d.logicIntent : "",
      ...(typeof d.deterministic === "boolean" ? { deterministic: d.deterministic } : {}),
    });
  }
  for (const e of roles) {
    if (!targetRids.has(e.rid)) continue;
    const d = decl(e);
    roleCandidates.push({
      candidateId: typeof d.candidateId === "string" ? d.candidateId : e.rid,
      plainName: typeof d.plainName === "string" ? d.plainName : e.rid,
      ...(d.principalKind === "agent" || d.principalKind === "runtime" || d.principalKind === "capability-token"
        ? { principalKind: d.principalKind }
        : {}),
      ...(Array.isArray(d.grantedResourceRefs) ? { grantedResourceRefs: d.grantedResourceRefs as readonly string[] } : {}),
      ...(Array.isArray(d.permissions) ? { permissions: d.permissions as readonly string[] } : {}),
      ...(Array.isArray(d.evidenceRefs) ? { evidenceRefs: d.evidenceRefs as readonly string[] } : {}),
      ...(typeof d.backingSourceRef === "string" ? { backingSourceRef: d.backingSourceRef } : {}),
    });
  }
  for (const e of properties) {
    if (!targetRids.has(e.rid)) continue;
    const d = decl(e);
    propertyCandidates.push({
      candidateId: typeof d.candidateId === "string" ? d.candidateId : e.rid,
      plainName: typeof d.plainName === "string" ? d.plainName : e.rid,
      declaredRid: e.rid,
      ...(typeof d.ownerObjectName === "string" ? { ownerObjectName: d.ownerObjectName } : {}),
      ...(typeof d.dataType === "string" ? { dataType: d.dataType } : {}),
      ...(Array.isArray(d.readableBy) ? { readableBy: d.readableBy as readonly string[] } : {}),
      ...(Array.isArray(d.evidenceRefs) ? { evidenceRefs: d.evidenceRefs as readonly string[] } : {}),
      ...(typeof d.backingSourceRef === "string" ? { backingSourceRef: d.backingSourceRef } : {}),
    });
  }
  for (const e of linkTypes) {
    if (!targetRids.has(e.rid)) continue;
    const d = decl(e);
    const srcRid = typeof d.srcRid === "string" ? d.srcRid : undefined;
    const dstRid = typeof d.dstRid === "string" ? d.dstRid : undefined;
    const sourceObject = srcRid ? ridToPlainName.get(srcRid) : undefined;
    const targetObject = dstRid ? ridToPlainName.get(dstRid) : undefined;
    if (srcRid) endpointObjectRids.add(srcRid);
    if (dstRid) endpointObjectRids.add(dstRid);
    linkCandidates.push({
      candidateId: typeof d.candidateId === "string" ? d.candidateId : e.rid,
      plainName: typeof d.linkName === "string" ? d.linkName : e.rid,
      businessMeaning: typeof d.businessMeaning === "string" ? d.businessMeaning : "",
      evidenceRefs: Array.isArray(d.evidenceRefs) ? (d.evidenceRefs as readonly string[]) : [],
      declaredRid: e.rid,
      ...(sourceObject !== undefined ? { sourceObject } : {}),
      ...(targetObject !== undefined ? { targetObject } : {}),
      ...(d.srcCardinality === "one" || d.srcCardinality === "many" ? { srcCardinality: d.srcCardinality } : {}),
      ...(d.dstCardinality === "one" || d.dstCardinality === "many" ? { dstCardinality: d.dstCardinality } : {}),
    });
  }
  // Seed endpoint object NAME bindings for any re-bound link whose endpoint object
  // is not itself a target — they re-bind alongside the link (grammar-neutral).
  for (const e of objectTypes) {
    if (endpointObjectRids.has(e.rid) && !targetRids.has(e.rid)) {
      const d = decl(e);
      objectCandidates.push({
        ...baseCandidate(e.rid, d),
        whyItMayMatter: typeof d.whyItMayMatter === "string" ? d.whyItMayMatter : "",
      });
    }
  }

  // ── Drive Part-A re-bind mode over EXACTLY the reconstructed candidate set. The
  //    full snapshot is `alreadyRegistered`; `reElevateAlreadyRegistered:true` makes
  //    the six skip-guards fall through to re-emit each reconstructed declaration. ──
  const rebindSession: FDEOntologyEngineeringSession = {
    ...session,
    objectCandidates,
    actionCandidates,
    functionCandidates,
    linkCandidates,
    roleCandidates,
    propertyCandidates,
  };
  const { edits, registered, skipped } = await registerAcceptedCandidates({
    session: rebindSession,
    projectRoot: root,
    alreadyRegistered,
    reElevateAlreadyRegistered: true,
  });

  if (edits.length === 0) {
    const register: OntologyEngineeringRegisterResult = {
      committed: false,
      registered: { objectTypes: [], actionTypes: [], functions: [], linkTypes: [], roles: [], properties: [] },
      skipped,
      invalidReason: `no verified re-bind rids: reconstruction produced no edits for ${targetRids.size} target rid(s)`,
    };
    return { ...readState({ handlerInput: input, session }), register };
  }

  // Reuse the SAME single-batch commit path handleRegister uses (verbatim).
  const commitResult = await commitEditsHandler({
    project: root,
    actionTypeRid: COMMIT_EDITS_ACTION_TYPE_RID,
    edits,
  });

  const register: OntologyEngineeringRegisterResult = {
    committed: true,
    registered,
    skipped,
    commitResult,
    lint: lintFindingsForSession(rebindSession),
  };
  const registeredAt = input.emittedAt ?? new Date().toISOString();
  return { ...writeRegisteredState({ handlerInput: input, session, registeredAt }), register };
}

/**
 * 7.23.0 `drift_rebind` — load the CURRENT captured prompt envelope for the call,
 * mirroring the PreToolUse gate's `readCurrentEnvelope` resolution exactly: prefer the
 * explicit (sessionId, promptId) pair; otherwise walk the current pointer per runtime.
 * Returns null when none resolves (the handler fails closed).
 */
async function readCurrentDriftRebindEnvelope(
  store: PromptFrontDoorStore,
  input: OntologyEngineeringWorkflowHandlerInput,
): Promise<PromptEnvelope | null> {
  const sessionId = input.frontDoorSessionId ?? input.sessionId;
  const promptId = input.promptId;
  if (typeof promptId === "string" && promptId.length > 0 && typeof sessionId === "string" && sessionId.length > 0) {
    return store.readEnvelope(sessionId, promptId);
  }
  if (typeof sessionId !== "string" || sessionId.length === 0) return null;

  const preferred: PromptRuntime | undefined = isPromptRuntime(input.frontDoorRuntime)
    ? input.frontDoorRuntime
    : undefined;
  const runtimes = preferred
    ? [preferred, ...PROMPT_RUNTIMES.filter((runtime) => runtime !== preferred)]
    : PROMPT_RUNTIMES;
  for (const runtime of runtimes) {
    const pointer = await store.readCurrentPointer(runtime, sessionId);
    if (!pointer) continue;
    const envelope = await store.readEnvelope(pointer.sessionId, pointer.promptId);
    if (envelope) return envelope;
  }
  return null;
}

/**
 * `drift_rebind` seam (7.23.0) — the COMPOSED GOVERNED RESUME flow.
 *
 * Re-binds a PERSISTED minted approved SIC + DTC to the CURRENT prompt envelope and
 * then drives the existing fail-closed `rebind_registered` re-elevation, in ONE call.
 * This is a LEGITIMATE RESUME: it copies the persisted MINTED approvalRefs forward
 * verbatim — it NEVER mints a new approvalRef and NEVER bypasses a gate.
 *
 * STEP 1 (gate-advance, BEFORE any snapshot/commit):
 *   PREDICATE A — the persisted MINTED approved SIC, read FROM THE STORE (never from
 *     input): `isApprovedSemanticIntentContract(readPreviousWorkflowState(...).
 *     approvedSemanticIntentContractSnapshot)` (unforgeable minted approvalRef).
 *   PREDICATE B — the persisted DTC record resolved by `input.digitalTwinChangeContractRef`
 *     is non-null AND status:"approved" AND carries a minted approvalRef AND its
 *     `contract.semanticIntentContractRef === A.contractId` (binds to THIS SIC).
 *   Then load the CURRENT captured envelope (fail-closed if none), re-key both bodies
 *   into NEW front-door records under the current promptId and advance the envelope to
 *   `digital_twin_approved` (carrying the minted refs), persisted via saveEnvelope; and
 *   emit a DISTINCT `drift_rebind_envelope_advanced` 5-dim event.
 *
 * STEP 2–4: DELEGATE the rid resolution + the single commit to the UNCHANGED
 *   `handleRegisterRebind` — build `derivedInput = { ...input, digitalTwinChangeContractRef:
 *   <re-keyed DTC ref>, digitalTwinChangeContractStatus: "approved" }` and return its
 *   result. The fail-closed PROOF1∩PROOF2, the zero-new-term reconstruction, and the
 *   single commit boundary stay centralized there (NO second write boundary here).
 *
 * Refusal is a compute-only no-op naming the failing predicate (mirrors the register
 * invalidReason style); nothing is written, the envelope is NOT advanced.
 */
async function handleDriftRebind(
  input: OntologyEngineeringWorkflowHandlerInput,
): Promise<OntologyEngineeringWorkflowHandlerResult> {
  const root = projectRoot(input);
  if (root.length === 0) {
    throw new Error("pm_ontology_engineering_workflow drift_rebind requires a projectRoot.");
  }
  const session = readSessionByInput(input);
  if (session === undefined) {
    throw new Error("pm_ontology_engineering_workflow drift_rebind requires an existing FDE session.");
  }

  const driftRebindFailure = (invalidReason: string): OntologyEngineeringWorkflowHandlerResult => {
    const register: OntologyEngineeringRegisterResult = {
      committed: false,
      registered: { objectTypes: [], actionTypes: [], functions: [], linkTypes: [], roles: [], properties: [] },
      skipped: { links: [] },
      invalidReason,
    };
    return { ...readState({ handlerInput: input, session }), register };
  };

  // ── PREDICATE A — persisted MINTED approved SIC, read FROM THE STORE. ────────
  const persistedSnapshot = readPreviousWorkflowState({
    root,
    action: input.action,
    session,
  })?.approvedSemanticIntentContractSnapshot;
  if (!isApprovedSemanticIntentContract(persistedSnapshot)) {
    return driftRebindFailure(
      "drift_rebind predicate A failed (OE-2): no persisted MINTED approved SemanticIntentContract " +
        "snapshot in the workflow store (must pass isApprovedSemanticIntentContract). Run approve_sic first.",
    );
  }
  const approvedSic: ApprovedSemanticIntentContract = persistedSnapshot;

  // ── PREDICATE B — persisted DTC record resolves, approved, minted, binds to A. ─
  const dtcRef = input.digitalTwinChangeContractRef;
  if (typeof dtcRef !== "string" || dtcRef.trim().length === 0) {
    return driftRebindFailure(
      "drift_rebind predicate B failed: digitalTwinChangeContractRef is required to resolve the persisted approved DTC record.",
    );
  }
  const store = new PromptFrontDoorStore({ projectRoot: root });
  const dtcRecord = await store.readContractRecordByRef<DigitalTwinChangeContract>(dtcRef);
  if (dtcRecord === null) {
    return driftRebindFailure(
      `drift_rebind predicate B failed: no prompt-front-door DTC record resolves for digitalTwinChangeContractRef=${dtcRef}.`,
    );
  }
  if (dtcRecord.status !== "approved") {
    return driftRebindFailure(
      `drift_rebind predicate B failed: persisted DTC record is not approved (status=${dtcRecord.status}).`,
    );
  }
  if (validateApprovalRefValue("dtcRecord.approvalRef", dtcRecord.approvalRef).length > 0) {
    return driftRebindFailure(
      "drift_rebind predicate B failed: persisted DTC record carries no minted approvalRef.",
    );
  }
  if (dtcRecord.contract.semanticIntentContractRef !== approvedSic.contractId) {
    return driftRebindFailure(
      "drift_rebind predicate B failed: persisted DTC does not bind to the approved SIC " +
        `(dtc.semanticIntentContractRef=${String(dtcRecord.contract.semanticIntentContractRef)} !== ` +
        `approvedSic.contractId=${approvedSic.contractId}).`,
    );
  }

  // ── Load the CURRENT captured envelope (fail-closed if none). ────────────────
  const currentEnvelope = await readCurrentDriftRebindEnvelope(store, input);
  if (currentEnvelope === null) {
    return driftRebindFailure(
      "drift_rebind failed: no current captured prompt-front-door envelope to re-bind the persisted approval to " +
        "(supply promptId+sessionId, or ensure a current pointer exists).",
    );
  }

  // ── Re-key both bodies under the current promptId + advance to digital_twin_approved. ─
  // The pure module carries the minted approvalRefs forward verbatim (never mints) and
  // persists the advanced envelope via saveEnvelope. Fail-closed inside on any unmet
  // precondition (already pre-checked above; the throw is defense-in-depth).
  const rebound = await rebindPersistedApprovalToCurrentEnvelope({
    store,
    currentEnvelope,
    approvedSic,
    dtcRecord,
  });

  // ── DISTINCT 5-dim audit event for the approval RE-BIND step (rule 10). ──────
  try {
    const eventsPath = path.join(root, ".palantir-mini", "session", "events.jsonl");
    const advancedRuntime: PromptRuntime = rebound.advancedEnvelope.runtime;
    await appendEventAtomic(eventsPath, {
      type: "drift_rebind_envelope_advanced",
      eventId: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}` as unknown as EventId,
      when: input.emittedAt ?? new Date().toISOString(),
      atopWhich: gitHeadShaFor(root) as unknown as CommitSha,
      throughWhich: {
        sessionId: (input.frontDoorSessionId ?? input.sessionId ?? "mcp") as unknown as SessionId,
        toolName: "pm_ontology_engineering_workflow:drift_rebind",
        cwd: root,
      },
      // The carried-forward approval originates from the user's prior approval turn.
      byWhom: { identity: "user" },
      withWhat: {
        reasoning:
          `drift_rebind re-bound persisted minted approved SIC+DTC to current prompt ` +
          `${rebound.advancedEnvelope.promptId} (no new approvalRef minted); ` +
          `sic=${approvedSic.contractId}`,
        memoryLayers: ["working", "episodic"],
      },
      payload: {
        promptId: rebound.advancedEnvelope.promptId,
        promptHash: rebound.advancedEnvelope.promptHash,
        semanticIntentContractRef: rebound.semanticIntentContractRef,
        digitalTwinChangeContractRef: rebound.digitalTwinChangeContractRef,
        approvedSicContractId: approvedSic.contractId,
        runtime: advancedRuntime,
      },
    });
  } catch {
    // best-effort audit; never let an audit-write failure block the re-bind result.
  }

  // ── STEP 2–4: DELEGATE rid resolution + the SINGLE commit to handleRegisterRebind. ─
  // derivedInput threads the RE-KEYED DTC ref so any downstream derivation sees the
  // current-prompt record; status pinned approved. NO second write boundary here.
  const derivedInput: OntologyEngineeringWorkflowHandlerInput = {
    ...input,
    digitalTwinChangeContractRef: rebound.digitalTwinChangeContractRef,
    digitalTwinChangeContractStatus: "approved",
  };
  return handleRegisterRebind(derivedInput);
}

/**
 * `elevate` seam — the COMPOSED GOVERNED OE-ELEVATION FLOW (the FIRST mutating
 * flow exposed via MCP; the individual mutating actions register/ingest/lint stay
 * direct-caller). Drives the already-built governed steps as ONE flow so a runtime
 * adapter DRIVES the governed pipeline through pm via a single governed call:
 *
 *   ingest → lint → draft_sic → APPROVAL GATE (caller-supplied) → register.
 *
 * The approval gate is governance, NEVER auto-fabricated: registers ONLY when the
 * caller explicitly supplied SIC approved + DTC approved + readyForDigitalTwin.
 * Returns the freshly-derived workflow state plus the composed elevate result.
 */
async function handleElevate(
  input: OntologyEngineeringWorkflowHandlerInput,
): Promise<OntologyEngineeringWorkflowHandlerResult> {
  const root = projectRoot(input);
  if (root.length === 0) {
    throw new Error("pm_ontology_engineering_workflow elevate requires a projectRoot.");
  }
  const sourceJsonlPath = input.sourceJsonlPath?.trim();
  if (sourceJsonlPath === undefined || sourceJsonlPath.length === 0) {
    throw new Error("pm_ontology_engineering_workflow elevate requires a sourceJsonlPath.");
  }

  // OE-2 (anti-fabrication) — source the MINTED approved-SIC snapshot from the
  // PERSISTED workflow store (the SAME read handleRegister uses), NEVER from the
  // caller's input params. This is the unforgeable readiness evidence elevate's
  // decoupled FDE session lacks; passing it from the store (not from MCP input)
  // means a caller cannot supply it to manufacture readiness.
  const approvedSicSnapshot = readPreviousWorkflowState({
    root,
    action: input.action,
    session: readSessionByInput(input),
  })?.approvedSemanticIntentContractSnapshot;

  const elevate = await elevateOntologyFromSource({
    projectRoot: root,
    sourceJsonlPath,
    semanticIntentContractStatus: input.semanticIntentContractStatus,
    digitalTwinChangeContractStatus: input.digitalTwinChangeContractStatus,
    readyForDigitalTwin: input.readyForDigitalTwin,
    rawUserRequest: input.recordedDecisionNote,
    sessionId: input.sessionId,
    approvedSicSnapshot,
  });

  // Read the freshly-derived workflow state over the (now ingested + possibly
  // registered) session so the result carries the runtime-neutral workflow view.
  const session = readSessionByInput(input);
  if (elevate.register?.committed === true) {
    const registeredAt = input.emittedAt ?? new Date().toISOString();
    return { ...writeRegisteredState({ handlerInput: input, session, registeredAt }), elevate };
  }
  return { ...readState({ handlerInput: input, session }), elevate };
}

// ─── Improvement #2 — approve_source_mutation ─────────────────────────────

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value, "utf8").digest("hex")}`;
}

async function emitSourceMutationAuditEvent(
  root: string,
  envelope: Omit<EventEnvelope, "sequence">,
): Promise<void> {
  try {
    const eventsPath = path.join(root, ".palantir-mini", "session", "events.jsonl");
    await appendEventAtomic(eventsPath, envelope);
  } catch {
    // best-effort audit; never let an audit-write failure block the no-op result
  }
}

/**
 * `approve_source_mutation` seam (Improvement #2). Verifies a model-claimed
 * user approval against the INDEPENDENTLY hook-captured PromptEnvelope and, on
 * success, mints + PERSISTS a {@link SourceMutationApprovalRecord} into the
 * SEPARATE `state.sourceMutationApprovals` array (never `userDecisionRecords`,
 * so SIC/DTC `deriveMutationAuthorized` is untouched). Compute-only no-op on
 * failure (mirrors the `register` invalidReason style). Emits a 5-dim audit
 * event on both grant and denial (rule 10).
 */
async function handleApproveSourceMutation(
  input: OntologyEngineeringWorkflowHandlerInput,
): Promise<OntologyEngineeringWorkflowHandlerResult> {
  const root = projectRoot(input);
  if (root.length === 0) {
    throw new Error("pm_ontology_engineering_workflow approve_source_mutation requires a projectRoot.");
  }
  const session = readSessionByInput(input);
  const baseResult = readState({ handlerInput: input, session });
  const when = input.emittedAt ?? new Date().toISOString();
  const atopWhich = gitHeadShaFor(root) as unknown as CommitSha;
  const throughWhich = {
    sessionId: (input.frontDoorSessionId ?? "mcp") as unknown as SessionId,
    toolName: "pm_ontology_engineering_workflow:approve_source_mutation",
    cwd: root,
  };

  const verification = await verifyAndMintSourceMutationApproval({
    projectRoot: root,
    promptId: input.userApprovalPromptId ?? "",
    promptHash: input.userApprovalPromptHash ?? "",
    userQuote: input.userApprovalQuote ?? "",
    approvedSourcePaths: input.approvedSourcePaths ?? [],
    runtime: input.frontDoorRuntime,
    sessionId: input.frontDoorSessionId,
  });

  if (verification.invalidReason !== undefined) {
    await emitSourceMutationAuditEvent(root, {
      type: "source_mutation_approval_denied",
      eventId: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}` as unknown as EventId,
      when,
      atopWhich,
      throughWhich,
      byWhom: { identity: resolveHostRuntimeIdentity() },
      withWhat: {
        reasoning: `source-mutation fast-path denied: ${verification.invalidReason}`,
        memoryLayers: ["working"],
      },
      payload: {
        invalidReason: verification.invalidReason,
        promptId: input.userApprovalPromptId,
        approvedSourcePaths: input.approvedSourcePaths,
      },
    });
    return {
      ...baseResult,
      sourceMutationApproval: { invalidReason: verification.invalidReason },
    };
  }

  const record = verification.record;
  // Persist into the SEPARATE sourceMutationApprovals array (never userDecisionRecords).
  // `deriveOntologyEngineeringWorkflowState` does NOT carry this array, so read the
  // prior persisted approvals from disk and accumulate (no record is dropped).
  const persisted = readPreviousWorkflowState({ root, action: "approve_source_mutation", session });
  const previous = persisted?.sourceMutationApprovals ?? [];
  const nextState: OntologyEngineeringWorkflowState = {
    ...baseResult.state,
    sourceMutationApprovals: [...previous, record],
  };
  const written = writeOntologyEngineeringWorkflowState(nextState);

  await emitSourceMutationAuditEvent(root, {
    type: "source_mutation_approval_granted",
    eventId: `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}` as unknown as EventId,
    when,
    atopWhich,
    throughWhich,
    // The grant originates from the user turn (rule 10 byWhom semantics).
    byWhom: { identity: "user" },
    withWhat: {
      reasoning:
        `source-mutation fast-path granted in lieu of SIC/DTC, bound to promptId=${record.approvedAtPromptId}; ` +
        `scope=[${record.approvedSourcePaths.join(", ")}]`,
      memoryLayers: ["working", "episodic"],
    },
    payload: {
      approvalRef: approvalRefToString(record.approvalRef) ?? record.approvalRef.promptHash,
      approvedSourcePaths: record.approvedSourcePaths,
      promptId: record.approvedAtPromptId,
      promptHash: record.approvedPromptHash,
      userQuoteHash: sha256(record.userQuote),
      runtime: record.runtime,
    },
  });

  return {
    ...baseResult,
    state: nextState,
    statePath: written.statePath,
    currentPath: written.currentPath,
    sourceMutationApproval: { record },
  };
}

/**
 * `approve_sic` seam — the canonical SIC approval write-path (Q2 hard gate).
 *
 * Reads the current draft SIC (caller-threaded `semanticIntentContract` carrying
 * the user-confirmed nine-axis `fillSequence`, or reconstructed from the session
 * as a fallback), then calls `approveSemanticIntentContract` with the HOST runtime
 * identity (never a literal name). On approval it persists the approved contract
 * (status:'approved' + minted approvalRef) back into workflow state — flipping
 * `semanticIntentContractStatus` to 'approved' through the same
 * `deriveStateSnapshot` seam `draft_sic` uses. Refusal is a compute-only no-op
 * (no state write) returning the plain-language KO/EN reason + unconfirmed axes.
 * mutationAuthorized semantics are untouched: approval alone never authorizes
 * protected-surface mutation (the gate signal stays tied to SIC+DTC approval).
 */
function handleApproveSic(
  input: OntologyEngineeringWorkflowHandlerInput,
): OntologyEngineeringWorkflowHandlerResult {
  const root = projectRoot(input);
  if (root.length === 0) {
    throw new Error("pm_ontology_engineering_workflow approve_sic requires a projectRoot.");
  }
  const session = readSessionByInput(input);

  const draft: SemanticIntentContract | undefined =
    input.semanticIntentContract ??
    (session !== undefined
      ? createSemanticIntentContractDraftFromFDEOntologySession(session, {
          contractId: input.semanticIntentContractRef,
          affectedSurfaces: input.affectedSurfaces,
        })
      : undefined);

  if (draft === undefined) {
    const sicApproval: SicApprovalActionResult = {
      approved: false,
      message:
        "승인할 SIC 초안이 없습니다 (semanticIntentContract 또는 FDE 세션이 필요합니다). " +
        "No draft SIC to approve (supply semanticIntentContract or an existing FDE session).",
    };
    return { ...readState({ handlerInput: input, session }), sicApproval };
  }

  const result: ApproveSemanticIntentContractResult = approveSemanticIntentContract(draft, {
    approverIdentity: resolveHostRuntimeIdentity(),
    capturedAt: input.emittedAt,
    note: input.recordedDecisionNote,
  });

  if (!result.ok) {
    const sicApproval: SicApprovalActionResult = {
      approved: false,
      message: result.reason,
      issues: result.issues,
      unconfirmedAxes: result.unconfirmedAxes,
    };
    return { ...readState({ handlerInput: input, session }), sicApproval };
  }

  const approved = result.contract;
  const written = writeState({
    handlerInput: input,
    session,
    semanticIntentContract: approved,
  });
  // OE-2 (OP-2 / D3-1) — PERSIST the MINTED approved SIC object (with its unforgeable
  // minted approvalRef) onto the workflow state, SEPARATE from the caller-settable
  // ref/status strings. `deriveStateSnapshot` does not carry it, so merge it in over
  // the just-written state (same accumulate-from-disk pattern as the source-mutation
  // approvals). The register seam re-verifies THIS snapshot via
  // `isApprovedSemanticIntentContract` rather than trusting `status==="approved"`.
  const snapshotState: OntologyEngineeringWorkflowState = {
    ...written.state,
    approvedSemanticIntentContractSnapshot: approved,
  };
  const persisted = writeOntologyEngineeringWorkflowState(snapshotState);
  const sicApproval: SicApprovalActionResult = {
    approved: true,
    message:
      `SIC가 승인되었습니다 (contractId=${approved.contractId}). ` +
      `Semantic Intent Contract approved (contractId=${approved.contractId}).`,
  };
  return {
    ...written,
    state: snapshotState,
    statePath: persisted.statePath,
    currentPath: persisted.currentPath,
    sicApproval,
  };
}

/**
 * Resolve the proposed TechnologyRecommendation to approve. Caller-threaded
 * `input.technologyRecommendation` wins; otherwise rebuild it from the current
 * ContextEngineeringPlan — full V2 plan when the caller threads an approved SIC and
 * a session is present (so the plan's TECHNOLOGY requiredUserDecision is rebuilt
 * alongside), else a stand-alone V2 recommendation keyed to the session.
 */
function resolveTechnologyRecommendationToApprove(
  input: OntologyEngineeringWorkflowHandlerInput,
  session: FDEOntologyEngineeringSession | undefined,
): {
  readonly recommendation?: TechnologyRecommendation;
  readonly technologyDecision?: DigitalTwinRequiredUserDecision;
} {
  if (input.technologyRecommendation !== undefined) {
    return { recommendation: input.technologyRecommendation };
  }

  const sic = input.semanticIntentContract;
  if (sic !== undefined && isApprovedSemanticIntentContract(sic) && session !== undefined) {
    const plan = buildContextEngineeringPlanV2({
      semanticIntentContract: sic,
      fdeSession: session,
      projectIndex: {
        projectRoot: projectRoot(input),
        runtimeSurfaceRefs: input.affectedSurfaces ?? [],
        sourceRefs: session.sourceRefs,
      },
    });
    const technologyDecision = plan.requiredUserDecisions.find(
      (decision) => decision.domain === "TECHNOLOGY",
    );
    return { recommendation: plan.technologyRecommendation, technologyDecision };
  }

  return {};
}

/**
 * Flip the plan's TECHNOLOGY required-user-decision from 'open' to 'approved' with
 * the minted approvalRef. When the plan was rebuilt the inert decision is flipped in
 * place; otherwise a TECHNOLOGY decision is synthesized from the approved rec id so
 * the single hook `validateDigitalTwinChangeContract` consumes always exists.
 */
function approvedTechnologyDecision(
  recommendation: ApprovedTechnologyRecommendation,
  inert: DigitalTwinRequiredUserDecision | undefined,
): DigitalTwinRequiredUserDecision {
  const base: DigitalTwinRequiredUserDecision = inert ?? {
    decisionId: `${recommendation.recommendationId}:decision:technology`,
    domain: "TECHNOLOGY",
    label: "Approve TECHNOLOGY mirror-only boundary",
    status: "open",
    blocking: true,
    evidenceRefs: [],
  };
  return { ...base, status: "approved", approvalRef: recommendation.approvalRef };
}

/**
 * `approve_technology_recommendation` seam (Q3) — the technology USER-APPROVAL
 * write-path, mirroring {@link handleApproveSic}.
 *
 * Reads the proposed recommendation (caller-threaded or rebuilt from the current
 * ContextEngineeringPlan), approves it with the HOST runtime identity (never a
 * literal name), and on success flips the plan's TECHNOLOGY requiredUserDecision
 * from 'open' to 'approved' with the minted approvalRef. The workflow state carries
 * no plan slot, so the flipped decision + approved rec ride on the action result;
 * `writeState` persists like the siblings (advances `updatedAt`). Refusal is a
 * compute-only no-op returning the plain-language KO/EN reason.
 */
function handleApproveTechnologyRecommendation(
  input: OntologyEngineeringWorkflowHandlerInput,
): OntologyEngineeringWorkflowHandlerResult {
  const root = projectRoot(input);
  if (root.length === 0) {
    throw new Error(
      "pm_ontology_engineering_workflow approve_technology_recommendation requires a projectRoot.",
    );
  }
  const session = readSessionByInput(input);
  const { recommendation, technologyDecision } = resolveTechnologyRecommendationToApprove(
    input,
    session,
  );

  if (recommendation === undefined) {
    const technologyApproval: TechnologyApprovalActionResult = {
      approved: false,
      message:
        "승인할 기술 추천이 없습니다 (technologyRecommendation 또는 승인된 SIC+FDE 세션이 필요합니다). " +
        "No technology recommendation to approve (supply technologyRecommendation or an approved SIC plus an FDE session).",
    };
    return { ...readState({ handlerInput: input, session }), technologyApproval };
  }

  const result: ApproveTechnologyRecommendationResult = approveTechnologyRecommendation(
    recommendation,
    {
      approverIdentity: resolveHostRuntimeIdentity(),
      capturedAt: input.emittedAt,
      note: input.recordedDecisionNote,
    },
  );

  if (!result.ok) {
    // Pending approval — surface the confirm/correct card carrying the PROPOSED rec as its
    // draft so the non-dev sees the Q3 user-approval UX instead of a bare refusal.
    const technologyApproval: TechnologyApprovalActionResult = {
      approved: false,
      message: result.reason,
      technologyApprovalCard: buildTechnologyApprovalCard(recommendation),
      issues: result.issues,
    };
    return { ...readState({ handlerInput: input, session }), technologyApproval };
  }

  const approved = result.recommendation;
  const written = writeState({ handlerInput: input, session });
  const technologyApproval: TechnologyApprovalActionResult = {
    approved: true,
    message:
      `기술 추천이 승인되었습니다 (recommendationId=${approved.recommendationId}). ` +
      `Technology recommendation approved (recommendationId=${approved.recommendationId}).`,
    recommendation: approved,
    technologyDecision: approvedTechnologyDecision(approved, technologyDecision),
  };
  return { ...written, technologyApproval };
}

export async function handleOntologyEngineeringWorkflow(
  input: OntologyEngineeringWorkflowHandlerInput,
): Promise<OntologyEngineeringWorkflowHandlerResult> {
  const root = projectRoot(input);

  switch (input.action) {
    case "start": {
      const session = createOrReadSessionFromEntry(input, true);
      const result = writeState({ handlerInput: input, session });
      // P4 — surface the consuming-layer mutation lane on session start so an operator
      // can declare `consumer-data-write` / `proposal-only` from the outset.
      const mutationLane = mutationLaneForState(result.state);
      return { ...result, ...(mutationLane ? { mutationLane } : {}) };
    }
    case "status": {
      const session = readSessionByInput(input);
      return readState({ handlerInput: input, session });
    }
    case "turn": {
      const session = readSessionByInput(input);
      if (session === undefined) {
        throw new Error("pm_ontology_engineering_workflow turn requires an existing FDE session.");
      }
      const turn = await handleFDEOntologyTurn({
        ...(input as Omit<FDEOntologyTurnHandlerInput, "projectRoot" | "session">),
        projectRoot: root,
        session,
      });
      const specs = turnCardDecisionSpecsFromChoices({
        cardId: turn.leadCardV2.cardId,
        choices: turn.leadCardV2.choices,
      });
      const recordedAt = input.emittedAt ?? new Date().toISOString();
      const records = userDecisionRecordsFromSpecs({
        specs,
        choiceIds: selectedChoiceIds(input),
        recordedAt,
        note: input.recordedDecisionNote,
      });
      const handlerRecords = handlerInputDecisionRecords(input, recordedAt);
      const result = writeState({
        handlerInput: input,
        session: turn.session,
        turnDecisionSpecs: specs,
        userDecisionRecords: [...previousRecords(root, turn.session), ...records, ...handlerRecords],
      });
      // P2 — name the typed input field that advances each still-unsatisfied readiness
      // requirement (prose alone seeds only a latent hypothesis). P4 — surface the
      // declared mutation lane + its per-mode authorization. P3 — echo open
      // turnDecisionSpecs + name `choiceApplications` (the field that records them).
      // P5b — echo the current phase + canonical next action. All four are pure
      // response-augmentation off the freshly-written state; none change the write.
      const readinessAdvisory = readinessAdvisoryForSession(turn.session);
      const mutationLane = mutationLaneForState(result.state);
      const decisionAdvisory = decisionAdvisoryForState(result.state);
      const phaseAdvisory = phaseAdvisoryForState(result.state);
      return {
        ...result,
        turn,
        ...(readinessAdvisory ? { readinessAdvisory } : {}),
        ...(mutationLane ? { mutationLane } : {}),
        ...(decisionAdvisory ? { decisionAdvisory } : {}),
        ...(phaseAdvisory ? { phaseAdvisory } : {}),
      };
    }
    case "draft_sic": {
      const session = readSessionByInput(input);
      if (session === undefined) {
        throw new Error("pm_ontology_engineering_workflow draft_sic requires an existing FDE session.");
      }
      const semanticIntentContract = createSemanticIntentContractDraftFromFDEOntologySession(
        session,
        {
          contractId: input.semanticIntentContractRef,
          affectedSurfaces: input.affectedSurfaces,
        },
      );
      const base = writeState({ handlerInput: input, session, semanticIntentContract });
      // P1 — make the draft's status honest. The persisted contract still carries
      // status:"draft" (schema-compatible), but a HOLLOW draft (all axes open, no
      // candidates, placeholder intent) is reported as "clarification-required" with
      // the blocking questions as the primary payload — never a success-shaped draft
      // (~/harness-upstream/ssot/palantir/architecture-center/intent-to-build-flow.md:53
      //  — "Stop if any 9-axis slot is missing").
      if (!isSemanticIntentContractHollow(semanticIntentContract)) {
        return { ...base, sicDraftStatus: "draft" };
      }
      return {
        ...base,
        sicDraftStatus: "clarification-required",
        clarificationRequired: {
          reason:
            "SemanticIntentContract draft is hollow: every axis is open, no noun/verb candidates, and intent is unset. Per ~/harness-upstream/ssot/palantir/architecture-center/intent-to-build-flow.md:53 the flow stops when 9-axis slots are missing. Answer the blocking questions (or run `turn` with typed candidate fields) before drafting.",
          blockingQuestions: blockingClarificationQuestions(semanticIntentContract),
        },
      };
    }
    case "approve_sic": {
      return handleApproveSic(input);
    }
    case "approve_technology_recommendation": {
      return handleApproveTechnologyRecommendation(input);
    }
    case "ingest": {
      return handleIngest(input);
    }
    case "register": {
      return handleRegister(input);
    }
    case "rebind_registered": {
      return handleRegisterRebind(input);
    }
    case "drift_rebind": {
      return handleDriftRebind(input);
    }
    case "lint": {
      return handleLint(input);
    }
    case "elevate": {
      return handleElevate(input);
    }
    case "approve_source_mutation": {
      return handleApproveSourceMutation(input);
    }
  }
}

export default async function handler(
  rawArgs: unknown,
): Promise<OntologyEngineeringWorkflowHandlerResult> {
  assertInput(rawArgs);
  return handleOntologyEngineeringWorkflow(rawArgs);
}
