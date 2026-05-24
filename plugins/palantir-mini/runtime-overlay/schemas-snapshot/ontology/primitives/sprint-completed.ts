/**
 * @stable — SprintCompleted event payload primitive (prim-data-14, v1.32.0)
 *
 * Terminal-state transition for a SprintContract. Emitted by the
 * `sprint-terminal-detector` PostToolUse hook when a `commit_edits`
 * invocation closes a bound contract (verdict pass / fail / timeout / abort
 * + iterationLimit reached / aborted via /pm-harness-abort).
 *
 * Splits the BackPropagation signal from the FeedbackLoop close: a sprint
 * may carry multiple loops (rare today, intentional for sprint-007+ multi-
 * loop work), and `sprint_completed` fires exactly once per contract close.
 * Downstream substrate: `learning_captured` + `failure_mode_synthesized`
 * envelopes are emitted in response so analyzer hypotheses become typed.
 *
 * Authority chain:
 *   plans/tidy-stargazing-papert.md §Confirmed Decisions Q1*
 *     ↓
 *   schemas/ontology/primitives/sprint-completed.ts (this file)
 *     ↓
 *   palantir-mini/lib/event-log/types.ts SprintCompletedEnvelope (runtime)
 *     ↓
 *   palantir-mini/hooks/sprint-terminal-detector.ts (emit site)
 *
 * D/L/A domain: DATA (event payload shape — append-only log record)
 * @owner palantirkc-ontology
 * @purpose Sprint terminal-state transition event payload
 */

/**
 * Payload for the sprint_completed event. Envelope wrapping is provided
 * by the palantir-mini plugin (lib/event-log/types.ts SprintCompletedEnvelope)
 * so consumers outside the plugin import only the payload shape.
 */
export interface SprintCompletedPayload {
  readonly project: string;
  readonly sprintNumber: number;
  readonly contractId: string;
  /**
   * Terminal verdict at sprint close:
   *   - "passed"  — overall + per-criterion thresholds met
   *   - "failed"  — iteration limit reached without passing
   *   - "timeout" — wall-clock budget exhausted
   *   - "aborted" — /pm-harness-abort or operator intervention
   */
  readonly verdict: "passed" | "failed" | "timeout" | "aborted";
  /** Number of generator iterations consumed (1-N). */
  readonly iterationCount: number;
  /** Final overall weighted score at termination. */
  readonly bestScore: number;
  /**
   * Human-readable termination criteria record. Lists the rubric criteria
   * that gated the verdict (e.g. ["threshold_overall:0.85", "iter:1/1"]).
   */
  readonly terminationCriteria: readonly string[];
}

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Sprint terminal-state event payload; palantir-mini-sprint-harness substrate, not Foundry surface",
};
export { categoryFoundryEquivalent as sprintCompletedFoundryEquivalent };
