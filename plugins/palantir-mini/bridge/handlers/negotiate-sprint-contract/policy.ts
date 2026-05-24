// palantir-mini v3.5.0 — negotiate-sprint-contract sibling: Phase H3 arbitration policy gate
// Pure function — no fs, no events.

import type { extractPolicy } from "./state";
import type { ArbitrationSignal, NegotiateAction } from "./types";

/** Phase H3 per-policy threshold checker. Returns arbitration signal when fired. */
export function checkPolicyThreshold(
  policy: ReturnType<typeof extractPolicy>,
  round: number,
  action: NegotiateAction,
): ArbitrationSignal | undefined {
  if (
    policy === "abort-on-disagreement" &&
    round > 2 &&
    (action === "counter" || action === "propose")
  ) {
    return {
      policy,
      triggerRound: round,
      rationale: "abort-on-disagreement policy: any counter past round 2 aborts.",
    };
  }
  if (policy === "priority-criterion" && round > 5) {
    return {
      policy,
      triggerRound: round,
      rationale:
        "priority-criterion policy: ≥6 rounds without convergence — orchestrator must select proposal whose highest-weight criterion has greater weightInRubric.",
    };
  }
  if (policy === "lead-arbitrated" && round > 5) {
    return {
      policy,
      triggerRound: round,
      rationale:
        "lead-arbitrated policy: ≥6 rounds without convergence — harness-orchestrator must write final contract.json.",
    };
  }
  return undefined;
}
