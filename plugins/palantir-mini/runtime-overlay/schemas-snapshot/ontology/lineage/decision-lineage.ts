/**
 * palantir-mini — Decision Lineage 5-dim primitive (prim-learn-02, v1.35.0)
 *
 * Palantir Decision Lineage 5 dimensions per §DL-02:
 *   WHEN / ATOP_WHICH / THROUGH_WHICH / BY_WHOM / WITH_WHAT
 *
 * Captured on every EventEnvelope via EventEnvelopeBase. Enables root-cause
 * analysis of ontology changes and is the foundation for BackwardProp.
 *
 * v1.35.0 additions (rule 26 §Axes A-E):
 *   - withWhat.memoryLayers     — Axis E (A1 blog 2026-04-29 agentic memory)
 *   - withWhat.refinementTarget — Axis C2 (typed refinement pointer)
 *   - byWhom.{model, provider, interfaceFamily, runtime} — Axis D1 (provider-neutral)
 *
 * All new fields are optional → existing consumers compile unchanged.
 */

import type { AgenticMemoryLayer } from "../primitives/agentic-memory-layer";
import type { RefinementTarget } from "../primitives/refinement-target";

export interface DecisionLineage5Dim {
  /** ISO8601 timestamp — when did the decision happen? */
  readonly when: string;
  /** Git SHA at time of decision — atop which version? */
  readonly atopWhich: string;
  /** Through which session / tool / cwd did the decision flow? */
  readonly throughWhich: {
    readonly sessionId: string;
    readonly toolName:  string;
    readonly cwd:       string;
    /** Optional UI/system surface tag (e.g. "workshop", "cli", "mcp"). v1.35.0+ */
    readonly surface?:  string;
  };
  /**
   * By whom was the decision made (identity + optional agent/team + provider
   * normalization fields per LLMI-02). All non-identity fields optional.
   */
  readonly byWhom: {
    readonly identity:   string;
    readonly agentName?: string;
    readonly teamName?:  string;
    /** Normalized model name (e.g. "claude-opus-4-7", "gpt-5.4"). v1.35.0+ */
    readonly model?:     string;
    /** Provider tag (e.g. "anthropic", "openai", "xai", "google"). v1.35.0+ */
    readonly provider?:  string;
    /** Interface family tag (e.g. "messages", "responses", "vertex"). v1.35.0+ */
    readonly interfaceFamily?: string;
    /** Runtime tag (e.g. "claude-code", "codex", "gemini"). v1.35.0+ */
    readonly runtime?:   string;
  };
  /** With what reasoning / hypothesis / refinement target / memory layers */
  readonly withWhat?: {
    readonly reasoning?:  string;
    readonly hypothesis?: string;
    /**
     * v1.35.0+ Axis E — agentic memory layer(s) this event refines. Required
     * on T2+ envelopes per rule 26. Empty array treated same as missing.
     */
    readonly memoryLayers?: readonly AgenticMemoryLayer[];
    /**
     * v1.35.0+ Axis C2 — typed pointer to refinement target. Required on
     * `validation_phase_completed.passed=false` per rule 26 §R5.
     */
    readonly refinementTarget?: RefinementTarget;
  };
}

/** Lineage dimensions enumerated for filter construction */
export const LINEAGE_DIMENSIONS = ["when", "atopWhich", "throughWhich", "byWhom", "withWhat"] as const;
export type LineageDimension = typeof LINEAGE_DIMENSIONS[number];
