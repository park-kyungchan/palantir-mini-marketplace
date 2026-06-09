/**
 * @stable — FeedbackLoopClosed event payload primitive (prim-data-09, v1.15.0)
 *
 * Terminal-state transition for a FeedbackLoop. Was previously overloaded
 * onto FeedbackLoopOpenedEnvelope with payload.transition: "close" — H3
 * retrospective D4 identified this as an ontology smell (querying "when did
 * this loop open?" required filtering by transition !== "close", which is
 * surprising and easy to miss).
 *
 * v1.15 splits close into its own event type for cleaner Decision Lineage:
 *   - "when did this loop open?"   → filter by feedback_loop_opened
 *   - "when did this loop close?"  → filter by feedback_loop_closed
 *
 * BACKWARD COMPAT: FeedbackLoopOpenedEnvelope still carries the optional
 * transition/verdict/terminationCondition fields for one MINOR cycle
 * (deprecated, removal in v1.16). Producers SHOULD emit feedback_loop_closed;
 * consumers SHOULD accept BOTH variants during the deprecation window.
 *
 * Authority chain:
 *   research/claude-code/harness-h3-retrospective.md §D4
 *     ↓
 *   schemas/ontology/primitives/feedback-loop-closed.ts (this file)
 *     ↓
 *   palantir-mini/lib/event-log/types.ts FeedbackLoopClosedEnvelope (runtime)
 *     ↓
 *   palantir-mini/bridge/handlers/close-feedback-loop.ts (emit site)
 *
 * D/L/A domain: DATA (event payload shape — not a state machine, just a
 * stable serializable record for the append-only log)
 * @owner palantirkc-ontology
 * @purpose FeedbackLoop terminal-state transition event payload
 */

/**
 * Shape of the terminal transition record — identical to the TerminationCondition
 * in feedback-loop.ts, inlined here to give this event payload a self-contained
 * schema so serializers don't need a cross-file type import.
 */
export interface FeedbackLoopClosedTerminationCondition {
  readonly type:
    | "threshold_met"
    | "iteration_exhausted"
    | "timeout"
    | "abort"
    | "error";
  readonly rationale: string;
  /** ISO8601 timestamp when the close handler wrote the terminal transition. */
  readonly terminatedAt: string;
  /** Final overall score at termination (0-10 scale unless contract overrides). */
  readonly finalScore?: number;
  /** Specific GradingCriterion RID that caused FAIL, if type == "iteration_exhausted". */
  readonly failedCriterionRid?: string;
}

/**
 * Payload for the feedback_loop_closed event. Envelope wrapping is provided
 * by the palantir-mini plugin (lib/event-log/types.ts FeedbackLoopClosedEnvelope)
 * so consumers outside the plugin import only the payload shape.
 */
export interface FeedbackLoopClosedPayload {
  readonly project: string;
  readonly loopId: string;
  readonly sprintNumber: number;
  readonly verdict: "passed" | "failed" | "aborted";
  readonly iterationCount: number;
  readonly terminationCondition: FeedbackLoopClosedTerminationCondition;
}
