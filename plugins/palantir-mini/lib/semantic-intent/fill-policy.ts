// palantir-mini — FillPolicy selector (Slice 5, sprint-138; Sprint 97 W2; W3d-2b default flip).
//
// Provides the policy-aware sequence selector. Absent/unknown policy → NINE_AXIS_SIC_SEQUENCE
// (the understand-phase heart; W3d-2b default flip — aligns this selector with the gate's
// absent→"nine-axis-sic" default at pm-semantic-intent-gate.ts). The legacy 8-turn path stays
// reachable via EXPLICIT "default-8-turn". Present "fde-ontology-build" → FDE_FILL_SEQUENCE (9-step).
// Present "dtc-turn-fill" → DTC_FILL_SEQUENCE (7-step DTC interactive fill; Sprint 97 W2).
//
// INVARIANT: Adding policies here is safe. Removing or renaming "default-8-turn"
// is a breaking change requiring a MAJOR semver bump. "fde-ontology-build" and
// "dtc-turn-fill" are additive — no existing caller is affected by their addition.

import { EIGHT_TURN_FILL_SEQUENCE, DTC_FILL_SEQUENCE, type SicTurnDescriptor, type DtcTurnDescriptor } from "./fill-sequence";
import { CONTEXT_ENGINEERING_TO_SIC_SEQUENCE } from "./context-engineering-sic-fill-sequence";
import { FDE_FILL_SEQUENCE } from "./fde-fill-sequence";
import { ONTOLOGY_DTC_BUILD_SEQUENCE } from "./ontology-dtc-build-sequence";
import { NINE_AXIS_SIC_SEQUENCE } from "./nine-axis-sic-fill-sequence";

// ---------------------------------------------------------------------------
// FillPolicy type + registry
// ---------------------------------------------------------------------------

/**
 * Fill sequence policy identifier.
 *   "default-8-turn"     — canonical 8-turn T0…T7 sequence (v1.62.0; explicit-only since W3d-2b).
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
  | "ontology-dtc-build"
  | "nine-axis-sic";

/** All registered fill policies. Extend by appending — do not reorder. */
export const FILL_POLICIES: readonly FillPolicy[] = [
  "default-8-turn",
  "fde-ontology-build",
  "dtc-turn-fill",
  "context-engineering-to-sic",
  "ontology-dtc-build",
  "nine-axis-sic",
] as const;

// ---------------------------------------------------------------------------
// selectFillSequence — policy resolver
// ---------------------------------------------------------------------------

/**
 * Returns the fill sequence descriptor array for the given policy.
 * When `policy` is absent or unknown, returns NINE_AXIS_SIC_SEQUENCE (the
 * understand-phase heart; W3d-2b default flip — aligns with the gate's
 * absent→"nine-axis-sic" default). The legacy 8-turn path is returned ONLY for
 * the explicit `"default-8-turn"` policy.
 *
 * @param policy  Optional fill sequence policy. Absent/unknown → "nine-axis-sic".
 * @returns       The readonly descriptor array for the requested policy.
 */
export function selectFillSequence(
  policy?: FillPolicy,
): readonly SicTurnDescriptor[] {
  if (policy === "default-8-turn") return EIGHT_TURN_FILL_SEQUENCE;
  if (policy === "context-engineering-to-sic") return CONTEXT_ENGINEERING_TO_SIC_SEQUENCE;
  if (policy === "fde-ontology-build") return FDE_FILL_SEQUENCE;
  return NINE_AXIS_SIC_SEQUENCE;
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
