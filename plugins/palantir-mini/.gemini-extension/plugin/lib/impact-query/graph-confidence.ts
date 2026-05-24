/**
 * lib/impact-query/graph-confidence.ts — Pure helpers for computing the
 * `graphConfidence` heuristic and the `recommendedAgentUse` decision derived
 * from it.
 *
 * @stable
 *
 * Authority chain:
 *   sprint-092 spec.md §3.1 (graphConfidence heuristic)
 *     → spec.md §3.3 (recommendedAgentUse decision table)
 *     → lib/impact-query/missing-edges.ts (paired helper)
 *     → bridge/handlers/impact-query.ts (consumer)
 *
 * D/L/A domain: LOGIC — pure functions, no I/O, no event emission.
 *
 * @owner palantirkc-ontology
 * @since palantir-mini v6.13.0 (sprint-092 PR 2.15; Sprint X3 PR 5/5)
 */

/** All possible recommended-agent-use values returned by impact_query. */
export type RecommendedAgentUse =
  | "lead-direct"
  | "targeted-verification"
  | "bounded-explorer"
  | "none";

/** Recognized RID prefixes that imply a typed graph node kind. */
const RECOGNIZED_RID_PREFIXES: ReadonlyArray<string> = [
  "file:",
  "rule:",
  "agent:",
  "skill:",
  "handler:",
  "schema:",
  "event:",
  "test:",
  "commit:",
  "pr:",
  "issue:",
];

/** Input shape for `computeGraphConfidence`. */
export interface ConfidenceInput {
  /** The RID being queried. */
  readonly rid: string;
  /**
   * True when the typed graph contains a node matching the queried RID
   * (matched by `rid` or by `value.filePath` for file-RIDs).
   */
  readonly typedGraphRootMatched: boolean;
  /**
   * Count of edges incident to the matched node in the typed graph
   * (`getEdgesFrom` + `getEdgesTo`).
   */
  readonly typedGraphIncidentEdgeCount: number;
  /**
   * True when the legacy SQLite/in-memory impact-graph returned at least
   * one forward or backward edge for the queried RID.
   */
  readonly sqliteHadEvidence: boolean;
}

/**
 * Returns true when the RID starts with a recognized prefix
 * (`file:`, `rule:`, `agent:`, etc.).
 */
export function ridHasRecognizedPrefix(rid: string): boolean {
  return RECOGNIZED_RID_PREFIXES.some((p) => rid.startsWith(p));
}

/**
 * Compute graph-confidence per sprint-092 spec.md §3.1.
 *
 * Branches (highest match wins, in order):
 *   1.0 — root matched AND incidentEdgeCount ≥ 3
 *   0.7 — root matched AND incidentEdgeCount < 3 (sparse evidence)
 *   0.4 — RID has recognized prefix but is not in typed graph
 *   0.1 — RID has no recognized prefix
 *
 * SQLite/in-memory legacy-evidence bump: +0.1, capped at 1.0.
 */
export function computeGraphConfidence(input: ConfidenceInput): number {
  let base: number;
  if (input.typedGraphRootMatched && input.typedGraphIncidentEdgeCount >= 3) {
    base = 1.0;
  } else if (input.typedGraphRootMatched) {
    base = 0.7;
  } else if (ridHasRecognizedPrefix(input.rid)) {
    base = 0.4;
  } else {
    base = 0.1;
  }

  if (input.sqliteHadEvidence) {
    base = Math.min(1.0, base + 0.1);
  }

  return base;
}

/**
 * Map graphConfidence to a recommended agent-use mode per spec §3.3.
 *
 *   ≥ 0.7        → "lead-direct"
 *   0.4 – <0.7   → "targeted-verification"
 *   >0.0 – <0.4  → "bounded-explorer"
 *   0.0 (floor)  → "none"
 */
export function recommendAgentUseFromConfidence(
  confidence: number,
): RecommendedAgentUse {
  if (confidence >= 0.7) return "lead-direct";
  if (confidence >= 0.4) return "targeted-verification";
  if (confidence > 0.0) return "bounded-explorer";
  return "none";
}
