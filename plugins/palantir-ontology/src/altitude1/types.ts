// Shared Altitude-1 (construction) types (ledger row P410). Re-exports
// `ConstructionState` from `src/semantic-core/` so callers of the FDE/SIC/
// DTC aggregates never need to import the semantic-core module directly
// for this one type.

import type { ConstructionState } from "../semantic-core/construction-state-machine";
import type { ReasonCode } from "../semantic-core/reason-codes";

export type { ConstructionState };

export interface Actor {
  readonly identity: string;
  readonly role?: string;
}

/**
 * The uniform result shape every Altitude-1 aggregate function returns.
 * `ok:false` always carries a stable, registered reason code (never a
 * free-text-only denial) — the same discipline
 * `construction-state-machine.ts`'s `TransitionCheck` already enforces,
 * generalized to the aggregate layer's business-rule denials (evidence
 * missing/not-independent, stale/mismatched fingerprint, malformed
 * verdict) as well as pure state-transition denials.
 */
export type AggregateResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly reasonCode: ReasonCode; readonly detail: string };

export function ok<T>(value: T): AggregateResult<T> {
  return { ok: true, value };
}

export function denied<T>(reasonCode: ReasonCode, detail: string): AggregateResult<T> {
  return { ok: false, reasonCode, detail };
}
