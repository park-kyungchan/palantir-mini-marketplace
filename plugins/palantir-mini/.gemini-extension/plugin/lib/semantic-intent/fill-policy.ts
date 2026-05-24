// palantir-mini — FillPolicy selector (Slice 5, sprint-138; Sprint 97 W2).
//
// Provides the policy-aware sequence selector. Absent policy → EIGHT_TURN_FILL_SEQUENCE
// (byte-identical to v6.70.0). Present "fde-ontology-build" → FDE_FILL_SEQUENCE (9-step).
// Present "dtc-turn-fill" → DTC_FILL_SEQUENCE (7-step DTC interactive fill; Sprint 97 W2).
//
// INVARIANT: Adding policies here is safe. Removing or renaming "default-8-turn"
// is a breaking change requiring a MAJOR semver bump. "fde-ontology-build" and
// "dtc-turn-fill" are additive — no existing caller is affected by their addition.

import { EIGHT_TURN_FILL_SEQUENCE, DTC_FILL_SEQUENCE, type SicTurnDescriptor, type DtcTurnDescriptor } from "./fill-sequence";
import { CONTEXT_ENGINEERING_TO_SIC_SEQUENCE } from "./context-engineering-sic-fill-sequence";
import { FDE_FILL_SEQUENCE } from "./fde-fill-sequence";
import { ONTOLOGY_DTC_BUILD_SEQUENCE } from "./ontology-dtc-build-sequence";

// ---------------------------------------------------------------------------
// FillPolicy type + registry
// ---------------------------------------------------------------------------

/**
 * Fill sequence policy identifier.
 *   "default-8-turn"     — canonical 8-turn T0…T7 sequence (v1.62.0; default).
 *   "fde-ontology-build" — FDE-guided 9-step sequence (Slice 5 additive).
 *   "dtc-turn-fill"      — DTC interactive 7-turn fill sequence (Sprint 97 W2 additive).
 *   "context-engineering-to-sic" — DATA/LOGIC/ACTION/GOVERNANCE readiness before SIC.
 *   "ontology-dtc-build" — Object/Link/Action/Function/ApplicationState readiness before DTC.
 */
export type FillPolicy =
  | "default-8-turn"
  | "fde-ontology-build"
  | "dtc-turn-fill"
  | "context-engineering-to-sic"
  | "ontology-dtc-build";

/** All registered fill policies. Extend by appending — do not reorder. */
export const FILL_POLICIES: readonly FillPolicy[] = [
  "default-8-turn",
  "fde-ontology-build",
  "dtc-turn-fill",
  "context-engineering-to-sic",
  "ontology-dtc-build",
] as const;

// ---------------------------------------------------------------------------
// selectFillSequence — policy resolver
// ---------------------------------------------------------------------------

/**
 * Returns the fill sequence descriptor array for the given policy.
 * When `policy` is absent or `"default-8-turn"`, returns EIGHT_TURN_FILL_SEQUENCE
 * (byte-identical to legacy behavior).
 *
 * @param policy  Optional fill sequence policy. Defaults to "default-8-turn".
 * @returns       The readonly descriptor array for the requested policy.
 */
export function selectFillSequence(
  policy?: FillPolicy,
): readonly SicTurnDescriptor[] {
  if (policy === "context-engineering-to-sic") return CONTEXT_ENGINEERING_TO_SIC_SEQUENCE;
  if (policy === "fde-ontology-build") return FDE_FILL_SEQUENCE;
  return EIGHT_TURN_FILL_SEQUENCE;
}

// ---------------------------------------------------------------------------
// selectDtcFillSequence — DTC policy resolver
// ---------------------------------------------------------------------------

/**
 * Returns DTC_FILL_SEQUENCE when `policy` is `"dtc-turn-fill"`, otherwise undefined.
 *
 * Parallel to `selectFillSequence` but scoped to the DTC fill domain. Callers
 * combining SIC + DTC selectors should call both and union the results.
 *
 * @param policy  Optional fill sequence policy.
 * @returns       DTC_FILL_SEQUENCE when policy="dtc-turn-fill"; undefined otherwise.
 */
export function selectDtcFillSequence(
  policy?: FillPolicy,
): readonly DtcTurnDescriptor[] | undefined {
  if (policy === "dtc-turn-fill") return DTC_FILL_SEQUENCE;
  if (policy === "ontology-dtc-build") return ONTOLOGY_DTC_BUILD_SEQUENCE;
  return undefined;
}
