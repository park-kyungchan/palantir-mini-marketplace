// Operation state machine (ledger row P440, execution-plan.md section 6.3's
// exact Altitude-2 chain, AGENT-CONTRACT.md section 4):
//
//   BOUND_CONSUMER_ONTOLOGY -> READ_OR_QUERY -> PROPOSAL -> DRY_RUN ->
//   GOVERNANCE_CHECK -> MUTATION_AUTHORITY_ISSUED -> COMMIT ->
//   LINEAGE_APPENDED
//
// Mirrors `src/semantic-core/construction-state-machine.ts`'s shape exactly
// (same pure, side-effect-free, runtime-checked-not-just-TS-checked design)
// but is deliberately placed under `src/altitude2/` rather than
// `src/semantic-core/`, per this task's mission ("Implement Altitude-2 in
// src/altitude2 per the execution-plan section 6.3 operation machine") —
// this chain is Altitude-2's own, not a shared semantic-core primitive the
// way the 9-state construction chain is.
//
// "Every transition must be an explicit decision with stable reason codes.
// No state may be inferred from tool success or a free-text reference."
// `assertLegalTransition` enforces exactly that for the operation chain, the
// same way `construction-state-machine.ts` does for the construction chain.
// This module never mints mutation authority and never invokes a writer —
// see `commit-routing.ts` for the routing call that delegates
// `MUTATION_AUTHORITY_ISSUED`/`COMMIT` to `src/governance/`'s single gate
// (ADR-005); this file only answers "is (from -> to) a legal single step?"

import {
  isRegisteredReasonCode,
  RC_SCHEMA_VALIDATION_FAILED,
  RC_STATE_SKIPPED_TRANSITION,
  type ReasonCode,
} from "../semantic-core/reason-codes";

export const OPERATION_STATES = [
  "BOUND_CONSUMER_ONTOLOGY",
  "READ_OR_QUERY",
  "PROPOSAL",
  "DRY_RUN",
  "GOVERNANCE_CHECK",
  "MUTATION_AUTHORITY_ISSUED",
  "COMMIT",
  "LINEAGE_APPENDED",
] as const;

export type OperationState = (typeof OPERATION_STATES)[number];

const STATE_SET: ReadonlySet<string> = new Set(OPERATION_STATES);

/** Runtime guard (not just a TS type check): is `value` one of the 8 registered operation states? */
export function isOperationState(value: unknown): value is OperationState {
  return typeof value === "string" && STATE_SET.has(value);
}

// The chain is strictly linear (execution-plan.md section 6.3 fixes one
// exact order with no branches). "Read-only paths stop before proposal" is
// NOT modeled here as a missing edge — READ_OR_QUERY -> PROPOSAL remains a
// structurally legal state transition; it is `binding-scope.ts`'s
// `isStateWithinBindingScope` that stops a `bindingScope: "read"` session
// before it, matching `contracts/ontology-binding.contract.json`'s
// `bindingScope` field ("Never grants commit authority by itself").
const NEXT_STATE: Readonly<Record<OperationState, OperationState | null>> = {
  BOUND_CONSUMER_ONTOLOGY: "READ_OR_QUERY",
  READ_OR_QUERY: "PROPOSAL",
  PROPOSAL: "DRY_RUN",
  DRY_RUN: "GOVERNANCE_CHECK",
  GOVERNANCE_CHECK: "MUTATION_AUTHORITY_ISSUED",
  MUTATION_AUTHORITY_ISSUED: "COMMIT",
  COMMIT: "LINEAGE_APPENDED",
  LINEAGE_APPENDED: null,
};

export type TransitionCheck =
  | { readonly ok: true }
  | { readonly ok: false; readonly reasonCode: ReasonCode; readonly detail: string };

/**
 * Is `from -> to` the single legal next step in the operation chain?
 * Rejects: unrecognized state values (RC-SCHEMA-VALIDATION-FAILED — a value
 * outside the registered enum entirely, never a free-text state claim), any
 * non-adjacent move including skips, repeats, and backward jumps
 * (RC-STATE-SKIPPED-TRANSITION), and the terminal state's non-existent next
 * step.
 */
export function assertLegalTransition(from: unknown, to: unknown): TransitionCheck {
  if (!isOperationState(from)) {
    return { ok: false, reasonCode: RC_SCHEMA_VALIDATION_FAILED, detail: `unrecognized "from" state: ${JSON.stringify(from)}` };
  }
  if (!isOperationState(to)) {
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

// Belt-and-suspenders: both cited codes must actually be registered in
// contracts/reason-code-registry.json — the same self-check
// construction-state-machine.ts and commit-gate.ts already apply.
if (!isRegisteredReasonCode(RC_STATE_SKIPPED_TRANSITION) || !isRegisteredReasonCode(RC_SCHEMA_VALIDATION_FAILED)) {
  throw new Error("operation-state-machine.ts: a bound reason code is not registered in contracts/reason-code-registry.json");
}
