import type { DtcWithFillFields } from "../semantic-intent/dtc-fill-sequence";

export const DTC_FILL_SEQUENCE_SESSION_SCHEMA_VERSION =
  "palantir-mini/dtc-fill-session/v1" as const;

/**
 * Minimal per-session tracking struct for DTC turn-fill workflow.
 * Parallel to FDEOntologyBuildSession but flat (no per-level reviews —
 * DTC is a 7-turn linear sequence, not a 9-level review ladder).
 *
 * HARD READ-ONLY INVARIANT: this session NEVER authorizes mutation.
 * Mutation authority remains with the approved DigitalTwinChangeContract +
 * approvalRef.
 */
export interface DtcFillSequenceSession {
  readonly schemaVersion: typeof DTC_FILL_SEQUENCE_SESSION_SCHEMA_VERSION;
  readonly sessionId: string;
  readonly contractId: string;
  readonly fillSequenceId: string;
  /** 0..6; -1 before T0 starts. */
  readonly currentTurnIndex: number;
  readonly completedTurns: readonly number[];
  /** Snapshot of DTC after most recent turn (additive fields included). */
  readonly dtcDraft: DtcWithFillFields;
  readonly startedAt: string;
  readonly lastTurnAt: string;
  readonly fillVerdict: "draft" | "dtc-filled" | "dtc-approved";
  /** Typed-ref terms unresolved by impact_query / project policy. */
  readonly blockingUnresolvedTerms?: readonly string[];
  readonly mutationAuthorized: false;
}
