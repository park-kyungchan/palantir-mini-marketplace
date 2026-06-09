/**
 * @stable — ValueGrade enum primitive (prim-data-21, v1.35.0)
 *
 * 5-tier importance grade attached to every events.jsonl envelope. Anchored to
 * Palantir's "Connecting Agents to Decisions" blog (2026-04-29) which positions
 * decision lineage as the substrate that "continuously refine[s] all forms of
 * agentic memory (working / episodic / semantic / procedural)". Grades govern
 * routing: T0 rejected at emit, T2+ feeds outcome pairing, T3 feeds
 * BackPropagation circuit, T4 candidates for shared-core promotion.
 *
 * Authority chain:
 *   research/palantir-vision/aipcon-devcon/{ai-fde,aip-evals,devcon,aipcon}.md
 *     + blog.palantir.com/connecting-agents-to-decisions (2026-04-29)
 *     ↓
 *   plans/nifty-mixing-diffie.md §5축 14기준
 *     ↓
 *   schemas/ontology/primitives/value-grade.ts (this file)
 *     ↓
 *   palantir-mini/hooks/value-grade-assigner.ts (PreToolUse on emit_event)
 *     + bridge/handlers/{pm-event-query-by-grade,pm-value-grade-metrics}.ts
 *
 * D/L/A domain: DATA (enumeration shape).
 * Rule cross-refs: rule 26 (valuable-data-standard), rule 10 v3.0.0 (envelope).
 *
 * @owner palantirkc-ontology
 * @purpose Substrate-routing importance grade for emitted events
 */

/**
 * Five canonical value tiers per rule 26 §Grading.
 *
 * - `T0` — Noise. A1 (5-dim) violation. Rejected at emit; archived after 7d.
 * - `T1` — Operational trace. A axis fully + E axis ≥1. Workflow Lineage only.
 * - `T2` — Candidate. T1 + B axis ≥1. Outcome pairing pending; promotable.
 * - `T3` — Circuit input. T2 + C axis ≥1. Feeds BackPropagation refinement.
 * - `T4` — Promotion. T3 + D2 (K-LLM consensus). Shared-core candidate.
 */
export type ValueGrade = "T0" | "T1" | "T2" | "T3" | "T4";

/**
 * Runtime-readable list of all valid ValueGrade values. Use for filter
 * predicates, audit dashboards, and emit-time auto-grade decisions.
 */
export const VALUE_GRADES: readonly ValueGrade[] = [
  "T0",
  "T1",
  "T2",
  "T3",
  "T4",
] as const;

/**
 * Type guard — returns true if `s` is a valid ValueGrade string.
 */
export function isValueGrade(s: string): s is ValueGrade {
  return (VALUE_GRADES as readonly string[]).includes(s);
}

/**
 * Convenience predicate — true if grade meets BackPropagation circuit threshold
 * (T3 or higher). Used by pm-decision-replay default filter.
 */
export function isCircuitGrade(g: ValueGrade): boolean {
  return g === "T3" || g === "T4";
}

/**
 * Convenience predicate — true if grade should be retained in active substrate
 * (T1 or higher). T0 is rejected at emit; this guard is for post-hoc archive
 * decisions only.
 */
export function isActiveGrade(g: ValueGrade): boolean {
  return g !== "T0";
}
