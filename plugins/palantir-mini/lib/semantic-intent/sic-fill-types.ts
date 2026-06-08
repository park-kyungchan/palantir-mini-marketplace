// palantir-mini — neutral SIC fill base types (W3d-1; extracted from fill-sequence.ts).
//
// The 9-axis understand HEART (nine-axis-sic-fill-sequence.ts) + the context-engineering
// and fde sequences + grade-rubric + fill-policy + the gate all consume these 4 base types.
// They were trapped in the legacy 8-turn module (fill-sequence.ts); extracting them to this
// heart-owned module lets the legacy 8-turn path be retired/cut-over (W3d-2) WITHOUT the HEART
// dragging the legacy module along by type imports. Pure type-relocation — erased at compile,
// no runtime value, no persisted-shape change (SicFillStep serializes identically).
//
// Authority: W3d gate-cutover prerequisite (survey understand-sic family risk_notes ORDERING:
// "Extract the neutral base types ... BEFORE retiring fill-sequence.ts").

import type { SemanticIntentContract } from "../lead-intent/contracts";

/**
 * Source of a single fill step in the 8-turn SIC fill sequence (PR 5.10).
 *   user   — field value supplied or confirmed by the human user.
 *   agent  — field value inferred by the routing agent.
 *   system — field value set automatically by a hook or gate.
 */
export type SicFillSource = "user" | "agent" | "system";

/**
 * One step in the SIC fill sequence.
 * Each step corresponds to one clarification question answered or one
 * structural field populated during the 8-turn fill workflow (PR 5.10).
 */
export interface SicFillStep {
  /** 1-based ordinal within the fill sequence. */
  readonly step: number;
  /** The clarification question or field label prompted to the user/agent. */
  readonly question?: string;
  /** The accepted answer or inferred value. */
  readonly answer?: string;
  /** ISO8601 timestamp when this step was completed. */
  readonly filledAt: string;
  /** Who or what provided the answer for this step. */
  readonly source: SicFillSource;
}

/**
 * SemanticIntentContract extended with v1.62.0 additive fields.
 * Used internally by fill-sequence helpers; callers may cast to/from the base type.
 */
export type SicWithFillFields = SemanticIntentContract & {
  /** 8-turn fill sequence steps (v1.62.0). */
  readonly fillSequence?: readonly SicFillStep[];
  /**
   * Fill / approval verdict (v1.62.0).
   *   draft  — initial; no fill steps completed.
   *   filled — all clarification questions answered; awaiting approval.
   */
  readonly verdict?: "draft" | "filled" | "approved" | "rejected";
  /** Links this SIC to its proto-seed (v1.62.0). */
  readonly seedRid?: string;
  /** RID of the GradingRubric used to evaluate this SIC (v1.62.0). */
  readonly gradeRubricRid?: string;
};

export interface SicTurnDescriptor {
  /** 0-based turn index. */
  readonly turnIndex: number;
  /** 1-based step ordinal (step = turnIndex + 1). */
  readonly step: number;
  /** The question posed to the user / agent at this turn. */
  readonly question: string;
  /**
   * Which field on SemanticIntentContract this turn populates.
   */
  readonly targetField: string;
}
