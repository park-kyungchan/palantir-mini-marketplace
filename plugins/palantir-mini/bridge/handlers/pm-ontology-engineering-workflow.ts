import {
  createFDEOntologyEngineeringSessionFromEntry,
  fdeOntologyEngineeringSessionRef,
  readCurrentFDEOntologyEngineeringSession,
  readFDEOntologyEngineeringSession,
  writeFDEOntologyEngineeringSessionSnapshot,
} from "../../lib/fde-ontology-engineering/session-store";
import type {
  FDEOntologyEngineeringSession,
} from "../../lib/fde-ontology-engineering/types";
import { createSemanticIntentContractDraftFromFDEOntologySession } from "../../lib/fde-ontology-engineering/sic-from-session";
import type { FDEOntologyTurnChoiceApplication } from "../../lib/fde-ontology-engineering/turn-choice";
import type { SemanticIntentContract } from "../../lib/lead-intent/contracts";
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
  type TurnCardDecisionSpec,
  type UserDecisionRecord,
} from "../../lib/ontology-engineering-workflow";
import { registerAcceptedCandidates } from "../../lib/ontology-engineering-workflow/register-accepted";
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
  readonly digitalTwinChangeContractRef?: string;
  readonly digitalTwinChangeContractStatus?: "draft" | "approved" | "superseded";
  readonly workContractRef?: string;
  readonly choiceApplications?: readonly HandlerChoiceApplication[];
  readonly affectedSurfaces?: readonly string[];
  readonly recordedDecisionNote?: string;
  /** Absolute path to a frozen NC1 SOURCE jsonl, required when action is `ingest`. */
  readonly sourceJsonlPath?: string;
  readonly createdAt?: string;
  readonly emittedAt?: string;
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
    value.action !== "ingest" &&
    value.action !== "register" &&
    value.action !== "status"
  ) {
    throw new Error("pm_ontology_engineering_workflow action must be start, turn, draft_sic, ingest, register, or status.");
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
  if (value.action === "ingest" && !hasNonEmptyString(value, "sourceJsonlPath")) {
    throw new Error(
      "pm_ontology_engineering_workflow: missing_source_jsonl_path: `sourceJsonlPath` is required when action is `ingest`.",
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
  const approved =
    state.phase === "digital-twin-approved" || state.phase === "mutation-authorized";
  const graded = session.readinessProfile?.readyForDigitalTwin === true;

  if (!approved || !graded) {
    const reasons: string[] = [];
    if (!approved) {
      reasons.push(
        `digital-twin contract not approved (workflow phase=${state.phase}; require SIC+DTC approved)`,
      );
    }
    if (!graded) {
      reasons.push("FDE readiness grade not passed (readinessProfile.readyForDigitalTwin !== true)");
    }
    const register: OntologyEngineeringRegisterResult = {
      committed: false,
      registered: { objectTypes: [], actionTypes: [], functions: [], linkTypes: [], roles: [] },
      skipped: { links: [] },
      invalidReason: reasons.join("; "),
    };
    return { ...readState({ handlerInput: input, session }), register };
  }

  // Already-materialized rids → skip on re-register (idempotency against the
  // append-only fold, which does not itself dedup).
  const snapshot = (await getOntology({ project: root })).snapshot.registeredPrimitives;
  const alreadyRegistered = new Set<string>([
    ...(snapshot?.objectTypes ?? []),
    ...(snapshot?.actionTypes ?? []),
    ...(snapshot?.functions ?? []),
    ...(snapshot?.linkTypes ?? []),
    ...(snapshot?.roles ?? []),
  ]);

  const { edits, registered, skipped } = await registerAcceptedCandidates({
    session,
    projectRoot: root,
    alreadyRegistered,
  });

  if (edits.length === 0) {
    const register: OntologyEngineeringRegisterResult = {
      committed: false,
      registered: { objectTypes: [], actionTypes: [], functions: [], linkTypes: [], roles: [] },
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

  const register: OntologyEngineeringRegisterResult = {
    committed: true,
    registered,
    skipped,
    commitResult,
  };
  return { ...readState({ handlerInput: input, session }), register };
}

export async function handleOntologyEngineeringWorkflow(
  input: OntologyEngineeringWorkflowHandlerInput,
): Promise<OntologyEngineeringWorkflowHandlerResult> {
  const root = projectRoot(input);

  switch (input.action) {
    case "start": {
      const session = createOrReadSessionFromEntry(input, true);
      return writeState({ handlerInput: input, session });
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
      return { ...result, turn };
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
      return writeState({ handlerInput: input, session, semanticIntentContract });
    }
    case "ingest": {
      return handleIngest(input);
    }
    case "register": {
      return handleRegister(input);
    }
  }
}

export default async function handler(
  rawArgs: unknown,
): Promise<OntologyEngineeringWorkflowHandlerResult> {
  assertInput(rawArgs);
  return handleOntologyEngineeringWorkflow(rawArgs);
}
