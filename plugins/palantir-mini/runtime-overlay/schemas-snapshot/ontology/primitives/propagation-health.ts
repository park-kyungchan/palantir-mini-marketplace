/**
 * @stable — PropagationHealthPayload primitive (prim-data-20, v1.34.0)
 *
 * Result envelope of the `propagation_chain_health` MCP handler. Reports
 * a continuous health score (0..1) for the ForwardProp authority chain
 * plus per-step scores and human-readable drift signals. Designed for
 * dashboards and PreCompact gates that need a single numeric signal.
 *
 * Authority chain:
 *   plans/distributed-wishing-manatee.md §Phase 1 + parent
 *     plans/cosmic-hatching-pizza.md §W6
 *       ↓
 *   schemas/ontology/primitives/propagation-audit.ts (PropagationStep SSoT)
 *       ↓
 *   schemas/ontology/primitives/propagation-health.ts (this file)
 *       ↓
 *   palantir-mini bridge/handlers/propagation-chain-health.ts (consumer,
 *     Phase 4)
 *
 * D/L/A domain: DATA (snapshot summary; non-executable)
 * @owner palantirkc-ontology
 * @purpose Canonical chain-health score primitive for W6 substrate
 * @authorityChain research → schemas → shared-core → project-ontology → contracts → runtime
 */

import type { PropagationStep } from "./propagation-audit";

/** Re-exported from propagation-audit.ts to keep health self-contained. */
export type { PropagationStep } from "./propagation-audit";
export { PROPAGATION_STEPS, isPropagationStep } from "./propagation-audit";

/**
 * Envelope returned by the `propagation_chain_health` MCP handler.
 *
 * `score` is a normalized 0..1 aggregate; consumers MAY map `verdict`
 * via per-handler thresholds (e.g. ≥0.95 = healthy, ≥0.7 = drift,
 * <0.7 = broken — exact policy lives in the handler, not the schema).
 */
export interface PropagationHealthPayload {
  /** Aggregate chain health, 0 (broken) … 1 (perfect). */
  readonly score: number;
  /** Per-step health score (0..1). Absent keys indicate uncomputed steps. */
  readonly perStepHealth: Readonly<Partial<Record<PropagationStep, number>>>;
  /**
   * Human-readable drift hints (e.g. "consumer pin lags schemas v1.34
   * → v1.32"). Empty when chain is fully green.
   */
  readonly driftSignals: readonly string[];
  /** Bucketed verdict derived from `score` per handler policy. */
  readonly verdict: "healthy" | "drift-suspected" | "broken";
  /** ISO 8601 measurement timestamp. */
  readonly measuredAt: string;
}

/**
 * Type guard — narrows an unknown value to PropagationHealthPayload.
 */
export function isPropagationHealthPayload(
  x: unknown,
): x is PropagationHealthPayload {
  if (typeof x !== "object" || x === null) return false;
  const v = x as Record<string, unknown>;
  return (
    typeof v.score === "number" &&
    typeof v.perStepHealth === "object" &&
    v.perStepHealth !== null &&
    Array.isArray(v.driftSignals) &&
    (v.verdict === "healthy" ||
      v.verdict === "drift-suspected" ||
      v.verdict === "broken") &&
    typeof v.measuredAt === "string"
  );
}
