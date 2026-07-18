// FDE session aggregate (ledger row P410). Implements A1-001/A1-002 against
// `contracts/fde-session.contract.json` (P330 shape, extended P410 with the
// turn-level `phase`/`candidatePrimitives`/`unresolvedQuestions`/
// `evidenceRefs`/`boundedSummary` fields and the session-level
// `userFacingSummary` field — see this report's S2 section for the
// contract diff and rationale).
//
// A1-001 ("A durable FDE ontology-engineering session starts from a
// universal entry and records phase, user-facing summary, hypotheses,
// candidate primitives, unresolved questions, evidence refs, and bounded
// turn summaries without treating raw transcript text as authority"):
// `openFdeSession` is the universal entry (every session starts here,
// `status: FDE_OPEN`, no turns). Every field A1-001 names is a typed,
// pattern-constrained property on `FdeTurn`/`FdeSession` — `evidenceRefs`
// and `candidatePrimitives` are identifier-shaped pointer tokens (no
// whitespace character can satisfy their contract pattern), so raw
// transcript prose is structurally rejected at the schema layer, not by an
// ad hoc heuristic (see `tests/negative/fde-session/
// evidence-ref-not-ref-shaped.json`).
//
// A1-002 ("The FDE process elicits business meaning before implementation
// and preserves accepted and rejected semantic hypotheses across turns"):
// `recordTurn` is strictly append-only — it never removes, reorders, or
// overwrites a prior turn (rejected or accepted), matching ADR-004's
// Consequences ("Rejected/deferred hypotheses at any FDE turn must be
// preserved with provenance").
//
// This aggregate is the ONE place `session.status` (the whole
// FDE_OPEN..COMMITTED construction chain, execution-plan.md section 6.3)
// advances — `transitionSession` is called by `semantic-intent.ts` and
// `digital-twin-change.ts` rather than either of those modules mutating
// `status` directly, so `assertLegalTransition` is the single choke point
// for every status change in the construction lane.

import { assertLegalTransition, type ConstructionState } from "../semantic-core/construction-state-machine";
import { isRegisteredReasonCode, type ReasonCode } from "../semantic-core/reason-codes";
import { type AggregateResult, denied, ok, type Actor } from "./types";

export interface FdeTurn {
  readonly turnId: string;
  readonly recordedAt: string;
  readonly byWhom: Actor;
  readonly phase: ConstructionState;
  readonly boundedSummary: string;
  readonly hypothesis?: string;
  readonly rejected?: boolean;
  readonly reasonCode?: ReasonCode;
  readonly candidatePrimitives?: readonly string[];
  readonly unresolvedQuestions?: readonly string[];
  readonly evidenceRefs?: readonly string[];
}

export interface FdeSession {
  readonly schemaVersion: string;
  readonly sessionId: string;
  readonly status: ConstructionState;
  readonly consumerOntologyId?: string;
  readonly openedAt: string;
  readonly userFacingSummary?: string;
  readonly byWhom: Actor;
  readonly turns: readonly FdeTurn[];
}

const SCHEMA_VERSION = "1.0.0";

export interface OpenFdeSessionParams {
  readonly sessionId: string;
  readonly openedAt: string;
  readonly byWhom: Actor;
  readonly consumerOntologyId?: string;
}

/** The universal entry (A1-001): every FDE session starts here, FDE_OPEN, no turns. */
export function openFdeSession(params: OpenFdeSessionParams): FdeSession {
  return {
    schemaVersion: SCHEMA_VERSION,
    sessionId: params.sessionId,
    status: "FDE_OPEN",
    ...(params.consumerOntologyId !== undefined ? { consumerOntologyId: params.consumerOntologyId } : {}),
    openedAt: params.openedAt,
    byWhom: params.byWhom,
    turns: [],
  };
}

/**
 * Append-only turn recording (A1-002: preserves accepted and rejected
 * hypotheses across turns). Rejects a duplicate `turnId` (a construction
 * decision must never silently overwrite prior turn history) and rejects
 * a `reasonCode` that is not a registered code (never a free-text reason
 * standing in for one).
 */
export function recordTurn(session: FdeSession, turn: FdeTurn, userFacingSummary?: string): AggregateResult<FdeSession> {
  if (session.turns.some((t) => t.turnId === turn.turnId)) {
    return denied("RC-SCHEMA-VALIDATION-FAILED", `turnId "${turn.turnId}" already exists on session "${session.sessionId}" — turn history is append-only`);
  }
  if (turn.reasonCode !== undefined && !isRegisteredReasonCode(turn.reasonCode)) {
    return denied("RC-SCHEMA-VALIDATION-FAILED", `turn "${turn.turnId}" carries an unregistered reasonCode "${turn.reasonCode}"`);
  }
  return ok({
    ...session,
    ...(userFacingSummary !== undefined ? { userFacingSummary } : {}),
    turns: [...session.turns, turn],
  });
}

/**
 * The single choke point that advances `session.status` across the whole
 * construction chain (execution-plan.md section 6.3). Every legal
 * transition is validated by `assertLegalTransition`; every denial carries
 * that function's stable reason code.
 */
export function transitionSession(session: FdeSession, to: ConstructionState): AggregateResult<FdeSession> {
  const check = assertLegalTransition(session.status, to);
  if (!check.ok) {
    return denied(check.reasonCode, `session "${session.sessionId}": ${check.detail}`);
  }
  return ok({ ...session, status: to });
}
