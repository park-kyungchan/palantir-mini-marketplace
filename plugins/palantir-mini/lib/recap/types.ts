// palantir-mini — lib/recap/types.ts
// Shared pm_recap types, promoted out of bridge/handlers/pm-recap.ts so that
// lib/ consumers (e.g. lib/runtime-overlay/memory-reflect.ts) can depend on
// the recap SHAPE without depending on the bridge/ handler MODULE.
//
// ADR 0001 (docs/adr/0001-memory-reflect-recap-provider-inversion.md) records
// the "why": memory-reflect previously did a dynamic
// `await import("../../bridge/handlers/pm-recap")`, a lib→bridge dependency
// (the H1 violation class the layer-boundary contract forbids). Types move
// here; the handler function itself stays in bridge/ and is injected into
// lib/ callers via the RecapProvider capability below — lib/ never imports
// bridge/, only the reverse (bridge/handlers/pm-recap.ts imports these types
// back from here, which is the legal bridge→lib direction).
//
// ClassificationAccuracySummary intentionally lives in
// lib/recap/classification-accuracy.ts (the module that computes it) and is
// re-exported here only as a type reference on PmRecapResult.
//
// Authority: plan inherited-discovering-quill.md §3.B.W5
//            docs/adr/0001-memory-reflect-recap-provider-inversion.md

import type { ClassificationAccuracySummary } from "./classification-accuracy";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PmRecapArgs {
  /** Absolute path to project root. Default: $PALANTIR_MINI_PROJECT or cwd. */
  project?: string;
  /**
   * Filter scope for MCP-First Compliance section.
   * "current-sprint" = events since most recent sprint_contract_bound (default).
   * "sprint-NNN" (e.g. "sprint-060") = events for that sprint.
   * "last-7-days" or "last-N-days" (e.g. "last-30-days") = calendar window.
   * "all" = all events.
   */
  scope?: string;
  /**
   * When true, skip the §MCP-First Compliance section.
   * Default false — include the section.
   */
  skipMcpFirst?: boolean;
  /** Include per-bucket breakdown in §MCP-First Compliance. Default false. */
  withBuckets?: boolean;
  /**
   * When true, include §Classification Accuracy section (sprint-062 W4-α).
   * Default false — opt-in to avoid cost for quick recaps.
   */
  withClassificationAccuracy?: boolean;
  /**
   * Window in days for classification accuracy pairing (default 14).
   * A prediction is confirmed when an edit_committed event fires for the same
   * RID within ±classificationWindowDays of the plan output.
   */
  classificationWindowDays?: number;
}

export interface SprintSummary {
  sprintNumber: number;
  contractId?: string;
  bound: boolean;
  verdict?: string;
}

export interface SubstrateHealth {
  totalEvents: number;
  gradeDistribution: Record<string, number>;
  t2PlusRatio: number;
  t3CircuitInputs: number;
}

export interface PmRecapResult {
  project: string;
  scope: string;
  generatedAt: string;
  substrateHealth: SubstrateHealth;
  sprintSummary: SprintSummary[];
  topEvents: Record<string, number>;
  mcpFirstCompliance?: {
    passed: number;
    bypassed: number;
    ratio: number;
    estimatedTokensSaved: number;
    mode: "native" | "heuristic";
    topRids: string[];
    section: string;
  };
  classificationAccuracy?: ClassificationAccuracySummary;
}

/**
 * Capability yielding a Recap (ADR 0001 ubiquitous language: Recap Provider).
 * Matches the real pm_recap handler call signature
 * (bridge/handlers/pm-recap.ts default export). Wiring is the boundary
 * caller's responsibility — lib/ code accepts this as an injected parameter
 * and never imports bridge/ to obtain a default implementation.
 */
export type RecapProvider = (args: {
  project: string;
  skipMcpFirst?: boolean;
}) => Promise<PmRecapResult>;
