// Construction state machine (ledger row P410, docs/architecture.md
// ADR-004, execution-plan.md section 6.3 — the exact Altitude-1 chain):
//
//   FDE_OPEN -> SIC_PROPOSED -> SIC_APPROVED -> DTC_PROPOSED ->
//   DTC_APPROVED -> CONSTRUCTION_STAGED -> VALIDATED ->
//   MUTATION_AUTHORITY_ISSUED -> COMMITTED
//
// This module is a PURE, side-effect-free data + validator layer: it
// enumerates the whole 9-state chain (matching contracts/fde-session
// .contract.json's `status` enum, P330) and answers "is (from -> to) a
// legal single-step transition?" It never mutates anything and never
// produces a mutation-authority artifact or a commit outcome — see
// `src/altitude1/`'s aggregate functions for the concrete business logic
// that calls this validator, and the module doc there for why no function
// anywhere in this package advances an aggregate past `DTC_APPROVED`
// (`MUTATION_AUTHORITY_ISSUED`/`COMMITTED` are modeled as states here,
// structurally, so illegal-jump tests can cover the full chain, but no
// path in this package mints one — that is ADR-005's separate, P430-owned
// commit gate).
//
// "Every transition must be an explicit decision with stable reason codes.
// No state may be inferred from tool success or a free-text reference."
// This module enforces exactly that: `assertLegalTransition` only accepts
// values that are members of `CONSTRUCTION_STATES` (checked at runtime,
// not merely at the TypeScript type level, because aggregate state can
// arrive as deserialized JSON from an untrusted boundary) and always
// returns a registered `contracts/reason-code-registry.json` code on
// denial — never a free-text string standing in for a reason code.

import {
  isRegisteredReasonCode,
  RC_SCHEMA_VALIDATION_FAILED,
  RC_STATE_SKIPPED_TRANSITION,
  type ReasonCode,
} from "./reason-codes";

export const CONSTRUCTION_STATES = [
  "FDE_OPEN",
  "SIC_PROPOSED",
  "SIC_APPROVED",
  "DTC_PROPOSED",
  "DTC_APPROVED",
  "CONSTRUCTION_STAGED",
  "VALIDATED",
  "MUTATION_AUTHORITY_ISSUED",
  "COMMITTED",
] as const;

export type ConstructionState = (typeof CONSTRUCTION_STATES)[number];

const STATE_SET: ReadonlySet<string> = new Set(CONSTRUCTION_STATES);

/** Runtime guard (not just a TS type check): is `value` one of the 9 registered construction states? */
export function isConstructionState(value: unknown): value is ConstructionState {
  return typeof value === "string" && STATE_SET.has(value);
}

// The chain is strictly linear (execution-plan.md section 6.3 fixes one
// exact order with no branches), so "legal next state" is a single value
// per state, not a set — everywhere except the terminal state, which has
// none.
const NEXT_STATE: Readonly<Record<ConstructionState, ConstructionState | null>> = {
  FDE_OPEN: "SIC_PROPOSED",
  SIC_PROPOSED: "SIC_APPROVED",
  SIC_APPROVED: "DTC_PROPOSED",
  DTC_PROPOSED: "DTC_APPROVED",
  DTC_APPROVED: "CONSTRUCTION_STAGED",
  CONSTRUCTION_STAGED: "VALIDATED",
  VALIDATED: "MUTATION_AUTHORITY_ISSUED",
  MUTATION_AUTHORITY_ISSUED: "COMMITTED",
  COMMITTED: null,
};

export type TransitionCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reasonCode: ReasonCode; readonly detail: string };

/**
 * Is `from -> to` the single legal next step in the construction chain?
 * Rejects: unrecognized state values (RC-SCHEMA-VALIDATION-FAILED — not a
 * free-text state claim, a value outside the registered enum entirely),
 * any non-adjacent move including skips, repeats, and backward jumps
 * (RC-STATE-SKIPPED-TRANSITION — "A state-advancing transition attempted
 * to skip an intermediate state"), and the terminal state's non-existent
 * next step.
 */
export function assertLegalTransition(from: unknown, to: unknown): TransitionCheck {
  if (!isConstructionState(from)) {
    return { ok: false, reasonCode: RC_SCHEMA_VALIDATION_FAILED, detail: `unrecognized "from" state: ${JSON.stringify(from)}` };
  }
  if (!isConstructionState(to)) {
    return { ok: false, reasonCode: RC_SCHEMA_VALIDATION_FAILED, detail: `unrecognized "to" state: ${JSON.stringify(to)}` };
  }
  const legalNext = NEXT_STATE[from];
  if (legalNext === null) {
    return { ok: false, reasonCode: RC_STATE_SKIPPED_TRANSITION, detail: `"${from}" is terminal; no further transition is legal` };
  }
  if (to !== legalNext) {
    return {
      ok: false,
      reasonCode: RC_STATE_SKIPPED_TRANSITION,
      detail: `"${from}" -> "${to}" is not the registered next step (expected "${from}" -> "${legalNext}")`,
    };
  }
  return { ok: true };
}

// Compile-time + runtime self-check that this module's two reason codes
// are actually registered in contracts/reason-code-registry.json — a
// belt-and-suspenders guard against this file drifting from the registry
// silently (also exercised by tests/semantic-core/construction-state
// -machine.test.ts).
if (!isRegisteredReasonCode(RC_STATE_SKIPPED_TRANSITION) || !isRegisteredReasonCode(RC_SCHEMA_VALIDATION_FAILED)) {
  throw new Error("construction-state-machine.ts: a bound reason code is not registered in contracts/reason-code-registry.json");
}
