/**
 * @stable — BackPropValueIndex primitive (prim-data-NN, sprint-101 PR 4.1b)
 *
 * 18 join keys for T3+ event substrate per canonical plan §4 row 4.1b.
 *
 * Provides a typed index-entry shape for the Convex `decisionEvents` mirror
 * table (sprint-062 W2-β origin, extended here to 18 fields). Enables fast
 * indexed query on the append-only events.jsonl substrate without full-scan.
 *
 * Axis coverage (rule 26 §5-Axes 14-Criteria):
 *   A — Contractual: eventId + when (5-dim anchors)
 *   B — Verifiable:  evalSuiteId + evalRunId (outcome-pairing)
 *   C — Refining:    refinementTarget (typed RefinementTarget.kind)
 *   D — Shareable:   runtime (provider-neutral identity)
 *   E — Memory-mapped: memoryLayers[]
 *
 * Foundry equivalence: claude-extension
 *   BackPropValueIndex is palantir-mini-originated event-substrate retrieval
 *   index aligned with rule 26 valuable-data 5-axes; no direct Foundry
 *   counterpart.
 *
 * Import via shared-core; never import this path directly from consumer
 * projects (rule 08 authority chain).
 *
 * @owner palantirkc-ontology
 */

import type { FoundryEquivalence } from "./category-foundry-equivalent";

/** Branded RID for a BackPropValueIndex entry. */
export type BackPropValueIndexRid = string & {
  readonly __brand: "BackPropValueIndexRid";
};

/** Factory that brands a plain string as a BackPropValueIndexRid. */
export const backPropValueIndexRid = (s: string): BackPropValueIndexRid =>
  s as BackPropValueIndexRid;

/**
 * 18-key typed index entry for T3+ events.jsonl rows mirrored to Convex
 * decisionEvents. Fields are 1:1 with the Convex table columns.
 *
 * All fields except `eventId` and `when` are optional to allow partial
 * event shapes (e.g. early-lifecycle events that lack a sprintContractRef).
 */
export interface BackPropValueIndexEntry {
  /** Unique event identifier (maps to 5-dim envelope.eventId). */
  readonly eventId: string;
  /** ISO8601 timestamp (maps to 5-dim envelope.when). */
  readonly when: string;
  /** Prompt identifier for prompt-to-DTC tracing. */
  readonly promptId?: string;
  /** SHA256:16 hash of the prompt text. */
  readonly promptHash?: string;
  /** Session identifier (byWhom.sessionId or CLAUDE_CODE_SESSION_ID). */
  readonly sessionId?: string;
  /** Originating runtime identity. */
  readonly runtime?: "claude" | "codex" | "gemini" | "cursor" | "unknown";
  /** SemanticIntentContract RID if prompt gate was applied. */
  readonly semanticIntentContractRef?: string;
  /** DigitalTwinChangeContract RID if a DTC mutation was required. */
  readonly digitalTwinChangeContractRef?: string;
  /** SprintContract RID the event belongs to. */
  readonly sprintContractRef?: string;
  /** Correlation ID linking related events across agent boundaries. */
  readonly correlationId?: string;
  /** Emitting agent identifier (byWhom.agent). */
  readonly agentId?: string;
  /** Tool name that triggered the event (throughWhich.tool). */
  readonly toolName?: string;
  /** Git commit SHA at the time of the event (atopWhich). */
  readonly commitSha?: string;
  /** Git branch name for filtering per-branch decision sequences. */
  readonly branchName?: string;
  /** GitHub pull request number if the event maps to a PR lifecycle. */
  readonly pullRequestNumber?: number;
  /** AIP Evals evaluation suite identifier. */
  readonly evalSuiteId?: string;
  /** AIP Evals evaluation run identifier within the suite. */
  readonly evalRunId?: string;
  /** Ontology RID affected by the decision (for impact-graph join). */
  readonly affectedRid?: string;
  /** RefinementTarget.kind value (typed string from rule 26 §C2). */
  readonly refinementTarget?: string;
  /** T0–T4 value grade assigned by value-grade-assigner hook. */
  readonly valueGrade?: "T0" | "T1" | "T2" | "T3" | "T4";
  /** Agentic memory layers this event refines (rule 26 §Axis E). */
  readonly memoryLayers?: readonly string[];
}

/**
 * Type guard for BackPropValueIndexEntry.
 *
 * Requires only the two mandatory fields (eventId + when).
 */
export function isBackPropValueIndexEntry(
  value: unknown,
): value is BackPropValueIndexEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v["eventId"] === "string" && typeof v["when"] === "string";
}

// Foundry equivalence metadata (prim-meta-01 pattern)
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale:
    "BackPropValueIndex is palantir-mini-originated event-substrate retrieval index aligned with rule 26 valuable-data 5-axes; no direct Foundry counterpart.",
};
export { categoryFoundryEquivalent as backPropValueIndexFoundryEquivalent };
