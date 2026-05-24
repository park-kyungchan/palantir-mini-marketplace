/**
 * @stable — FeedbackLoop primitive (prim-logic-04, v1.35.0)
 *
 * Generator↔Evaluator iteration tracker for a bound SprintContract. Records
 * iteration count, current state, and per-iteration feedback artifacts.
 * Orchestrator (harness-orchestrator agent) drives state transitions via
 * open_feedback_loop / close_feedback_loop MCP handlers.
 *
 * GAN-inspired analogy: Generator = generator network, Evaluator =
 * discriminator network, FeedbackLoop = the adversarial training loop
 * (without gradient flow — discrete feedback via file-based IPC).
 *
 * Authority:
 *   - Prithvi Rajasekaran's harness (5-15 iteration loop with hard
 *     threshold termination)
 *   - Palantir AIP Evals experiment run lifecycle:
 *     research/palantir-foundry/aip/aip-evals-run-suite.md
 *   - research/claude-code/lead-system-v2.md §5.1 (lazy-spawn + auto-shutdown)
 *
 * D/L/A domain: LOGIC (state machine over Generator/Evaluator iterations;
 * produces derived decisions, no direct data mutation)
 * @owner palantirkc-ontology
 * @purpose Harness iteration state tracker (GAN-inspired)
 */

export type FeedbackLoopRid = string & { readonly __brand: "FeedbackLoopRid" };

export const feedbackLoopRid = (s: string): FeedbackLoopRid => s as FeedbackLoopRid;

/**
 * Explicit state machine for the feedback loop.
 *
 *   negotiating  — SprintContract being drafted + reviewed
 *        ↓ (contract bound)
 *   generating   — Generator at work (building artifacts)
 *        ↓ (Generator commit)
 *   evaluating   — Evaluator scoring live artifacts (Playwright + rubric)
 *        ↓ (Evaluator report written)
 *   feedback     — Generator reading Evaluator report
 *        ↓ (threshold check)
 *   ├─ passed    — hard threshold met, loop terminates (success)
 *   ├─ failed    — iteration limit exhausted OR threshold un-met at limit
 *   └─ aborted   — user or Orchestrator aborted (timeout, error, etc.)
 *
 * Transitions are recorded as events in events.jsonl for BackwardProp
 * analysis. Replay via `replay_lineage` MCP filtered by loopId.
 */
export type FeedbackLoopState =
  | "negotiating"
  | "generating"
  | "evaluating"
  | "feedback"
  | "passed"
  | "failed"
  | "aborted";

export interface TerminationCondition {
  readonly type:
    | "threshold_met"
    | "iteration_exhausted"
    | "timeout"
    | "abort"
    | "error";
  readonly rationale: string;
  /** ISO8601 timestamp */
  readonly terminatedAt: string;
  /** Final overall score at termination (0-10 scale unless contract overrides) */
  readonly finalScore?: number;
  /** Specific criterion RID that caused FAIL, if type == "iteration_exhausted" */
  readonly failedCriterionRid?: string;
}

export interface FeedbackLoopDeclaration {
  readonly loopId: FeedbackLoopRid;
  /** SprintContractRid (as string) this loop executes */
  readonly sprintContractRid: string;
  /** HarnessAgentRid (as string) for the generator role */
  readonly generatorAgentRid: string;
  /** HarnessAgentRid (as string) for the evaluator role */
  readonly evaluatorAgentRid: string;
  /** Optional orchestrator (HarnessAgentRid) for multi-loop coordination */
  readonly orchestratorAgentRid?: string;
  /** 0-based iteration counter. Incremented on each Generator commit. */
  readonly iterationCount: number;
  readonly state: FeedbackLoopState;
  /**
   * Paths (relative to project harness/ dir) to per-iteration feedback
   * artifacts. Grows monotonically: [feedback-001.md, feedback-002.md, ...].
   * File-based IPC — Generator and Evaluator communicate via shared files,
   * not direct messaging (per Prithvi's harness design + auditability).
   */
  readonly feedbackArtifactPaths: readonly string[];
  /**
   * Set only when state ∈ {passed, failed, aborted}. Encodes why the loop
   * terminated, for BackwardProp refinement_proposed event generation.
   */
  readonly terminationCondition?: TerminationCondition;
  readonly description?: string;
  /**
   * v1.35.0+ — per-iteration value-grade sequence. Tracks how the loop's
   * output importance tier evolved across iterations. Populated by
   * harness-analyzer (analysis-NNN.md) and outcomes-grader.
   *
   * Rule cross-ref: rule 26 §Grading, rule 16 v4.1.0 §Loop.
   */
  readonly valueGradeSequence?: readonly {
    readonly iteration: number;
    readonly grade: import("./value-grade").ValueGrade;
    readonly rationale?: string;
  }[];
}

export class FeedbackLoopRegistry {
  private readonly items = new Map<FeedbackLoopRid, FeedbackLoopDeclaration>();

  register(decl: FeedbackLoopDeclaration): void {
    this.items.set(decl.loopId, decl);
  }

  get(rid: FeedbackLoopRid): FeedbackLoopDeclaration | undefined {
    return this.items.get(rid);
  }

  byState(state: FeedbackLoopState): FeedbackLoopDeclaration[] {
    return [...this.items.values()].filter((l) => l.state === state);
  }

  bySprintContract(rid: string): FeedbackLoopDeclaration[] {
    return [...this.items.values()].filter((l) => l.sprintContractRid === rid);
  }

  active(): FeedbackLoopDeclaration[] {
    const terminal: readonly FeedbackLoopState[] = ["passed", "failed", "aborted"];
    return [...this.items.values()].filter((l) => !terminal.includes(l.state));
  }

  keys(): IterableIterator<FeedbackLoopRid> {
    return this.items.keys();
  }

  list(): FeedbackLoopDeclaration[] {
    return [...this.items.values()];
  }
}

export const FEEDBACK_LOOP_REGISTRY = new FeedbackLoopRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Generator↔Evaluator feedback loop primitive; palantir-mini-sprint-harness IPC, not Foundry surface",
};
export { categoryFoundryEquivalent as feedbackLoopFoundryEquivalent };
