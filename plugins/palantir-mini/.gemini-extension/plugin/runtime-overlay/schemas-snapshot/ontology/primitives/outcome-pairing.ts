/**
 * @stable — OutcomePairing primitive (prim-logic-05, v1.35.0)
 *
 * Records a before/after comparison so an intervention's effectiveness can be
 * measured. Pair lifecycle: open on `*_proposed` event → close on `*_observed`
 * / `*_completed` event with same actionRid. Closure populates
 * EventEnvelope.lineageRefs.outcomePairId so downstream
 * `pm_outcome_pair_audit` MCP can compute orphan ratio + delta metrics.
 *
 * Authority chain:
 *   research/palantir-vision/aipcon-devcon/ai-fde.md §FDE-08 (feedback
 *     compounding loop) + research/palantir-vision/cross-cutting/
 *     decision-lineage.md §LEARN-03
 *     ↓
 *   plans/nifty-mixing-diffie.md §Axis B1 (outcome-paired)
 *     ↓
 *   schemas/ontology/primitives/outcome-pairing.ts (this file)
 *     ↓
 *   palantir-mini/hooks/outcome-pair-tracker.ts (PostToolUse on emit_event)
 *     + bridge/handlers/pm-outcome-pair-audit.ts
 *
 * D/L/A domain: LOGIC (pairing computes a delta between two snapshots).
 * Rule cross-refs: rule 26, rule 16 v4.1.0 §Loop step 6.
 *
 * @owner palantirkc-ontology
 * @purpose Typed before/after pairing for intervention measurement
 */

import type { FailureCategory } from "./failure-category";
import type { LineageRefs } from "./lineage-refs";

/**
 * Branded RID for an OutcomePairing instance. Format:
 *   `pair-<sha256-12>-<unix-ms>` (e.g. `pair-abc123def456-1730620800000`).
 */
export type OutcomePairingRid = string & {
  readonly __brand: "OutcomePairingRid";
};

export const outcomePairingRid = (s: string): OutcomePairingRid =>
  s as OutcomePairingRid;

/**
 * Snapshot of an outcome at a single point in the pairing — the proposal
 * (baseline) or the observation (refined).
 */
export interface OutcomeSnapshot {
  readonly verdict: "pass" | "fail" | "unknown";
  /** Numeric score in [0, 1] if available; -1 if not graded. */
  readonly score: number;
  /** Optional categorisation if the snapshot is a fail. */
  readonly failureClass?: FailureCategory;
  /** GradingCriterion RIDs that contributed to the verdict. */
  readonly criterionRids?: readonly string[];
  /** ISO 8601 timestamp this snapshot was captured. */
  readonly capturedAt: string;
}

/**
 * Numeric delta between baseline and refined snapshots. All fields optional
 * since not every pairing produces every signal.
 */
export interface OutcomeDeltaMetrics {
  /** scoreΔ = refined.score − baseline.score (positive = improvement). */
  readonly scoreDelta?: number;
  /** failureClassShift — "X → Y" if class changed, "X → resolved" if pass. */
  readonly failureClassShift?: string;
  /** Wall-clock latency between baseline.capturedAt and refined.capturedAt. */
  readonly latencyMs?: number;
}

/**
 * OutcomePairing declaration. Created on baseline emit; mutated to add
 * refined + deltaMetrics on close. Append-only via events.jsonl + atomic
 * file replacement in `.palantir-mini/session/outcome-pairs/<rid>.json`.
 */
export interface OutcomePairingDeclaration {
  readonly pairingId: OutcomePairingRid;
  /** Free-form scenario tag (e.g. "spec_refinement_round_2"). */
  readonly scenario: string;
  /** Snapshot at proposal/start time. */
  readonly baselineOutcome: OutcomeSnapshot;
  /** Snapshot at observation/completion time (undefined while pair is open). */
  readonly refinedOutcome?: OutcomeSnapshot;
  /** Computed once both snapshots present. */
  readonly deltaMetrics?: OutcomeDeltaMetrics;
  /** Cross-references to action, dry-run, evidence URLs. */
  readonly evidence: LineageRefs;
  readonly createdAt: string;
  /** Set when refinedOutcome arrives. */
  readonly closedAt?: string;
}

/**
 * Lifecycle states of an OutcomePairing. Computed from snapshot presence;
 * not stored on the declaration to avoid drift.
 */
export type OutcomePairingState = "open" | "closed" | "orphaned";

export function pairingState(
  decl: OutcomePairingDeclaration,
  orphanThresholdMs: number,
  nowMs: number,
): OutcomePairingState {
  if (decl.refinedOutcome !== undefined && decl.closedAt !== undefined) {
    return "closed";
  }
  const createdMs = Date.parse(decl.createdAt);
  if (Number.isFinite(createdMs) && nowMs - createdMs > orphanThresholdMs) {
    return "orphaned";
  }
  return "open";
}

export class OutcomePairingRegistry {
  private readonly items = new Map<OutcomePairingRid, OutcomePairingDeclaration>();

  register(decl: OutcomePairingDeclaration): void {
    this.items.set(decl.pairingId, decl);
  }

  get(rid: OutcomePairingRid): OutcomePairingDeclaration | undefined {
    return this.items.get(rid);
  }

  keys(): IterableIterator<OutcomePairingRid> {
    return this.items.keys();
  }

  list(): OutcomePairingDeclaration[] {
    return [...this.items.values()];
  }

  /** Count pairs whose state matches the predicate. */
  countByState(
    state: OutcomePairingState,
    orphanThresholdMs: number,
    nowMs: number,
  ): number {
    let n = 0;
    for (const d of this.items.values()) {
      if (pairingState(d, orphanThresholdMs, nowMs) === state) n++;
    }
    return n;
  }
}

export const OUTCOME_PAIRING_REGISTRY = new OutcomePairingRegistry();

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Before/after intervention measurement pairing (rule 26 Axis B1); palantir-mini-native",
};
export { categoryFoundryEquivalent as outcomePairingFoundryEquivalent };
