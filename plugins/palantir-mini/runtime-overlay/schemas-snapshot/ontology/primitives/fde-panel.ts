/**
 * palantir-mini schema primitive — FDE Workbench Panel Projection.
 *
 * Read-only projection derived from FDEOntologyBuildSession (slice 1).
 * Surfaces non-developer-friendly status (current level, completed levels,
 * mission summary, top gaps, read-only state, semantic-approval-ready flag,
 * DTC-needed flag, plain-language status sentence).
 *
 * Consumed by lib/chatbot-studio/workbench-state.ts as an additive optional
 * field `fdePanel?: FDEPanelProjection` on `SemanticWorkbenchState`.
 * Backward-compat invariant: when no FDEOntologyBuildSession is supplied,
 * `fdePanel` is undefined and `SemanticWorkbenchState` byte-identical to v6.67.0.
 *
 * HARD INVARIANT: `mutationAuthorizedFromPanel` is the literal `false` type.
 * The panel is observation/communication only — never authorizes mutation.
 *
 * Source refs:
 *   /home/palantirkc/docs/proposals/2026-05-14-claude-fde-ontology-build-gap-analysis-brief.md §11
 *   /home/palantirkc/.claude/plans/splendid-mapping-lemur.md Slice 4
 *   /home/palantirkc/.claude/plugins/palantir-mini/lib/chatbot-studio/workbench-state.ts:22-61
 */

import type {
  FDEReviewLevel,
  FDEReviewLevelGap,
  FDEReadinessVerdict,
} from "./fde-ontology-build-session";

export const FDE_PANEL_SCHEMA_VERSION =
  "palantir-mini/fde-panel/v1" as const;

/** Workbench-facing projection for non-developer FDE status display.
 *  Derived from FDEOntologyBuildSession by lib/chatbot-studio/fde-panel-builder.ts. */
export interface FDEPanelProjection {
  readonly schemaVersion: typeof FDE_PANEL_SCHEMA_VERSION;
  /** Stable derivation timestamp. */
  readonly composedAt: string;
  /** Highest review level the session has currently produced data for. */
  readonly currentLevel: FDEReviewLevel | "none";
  /** Review levels that have completed enough evidence (subset of FDEReviewLevel). */
  readonly completedLevels: readonly FDEReviewLevel[];
  /** Plain-language summary of the mission-decision (Level 1). May be empty
   *  string when no mission data yet. */
  readonly missionDecisionSummary: string;
  /** Up to 5 highest-priority gaps for the workbench to surface to user. */
  readonly topGaps: readonly {
    readonly gapId: string;
    readonly level: FDEReviewLevel;
    readonly severity: FDEReviewLevelGap["severity"];
    readonly description: string;
    readonly nextQuestion?: string;
  }[];
  /** Current verdict from the readiness ladder. */
  readonly readiness: FDEReadinessVerdict;
  /** True when the session is still in read-only design — meaning no commit
   *  or mutation may be dispatched based on this session. */
  readonly readOnly: boolean;
  /** True only when readiness === "ready-for-semantic-approval" AND
   *  the upstream caller has confirmed an approved SIC. */
  readonly semanticApprovalReady: boolean;
  /** True only when the work is about to cross into mutation territory and a
   *  DTC has not yet been approved. False during all read-only design phases. */
  readonly dtcNeededNow: boolean;
  /** Single sentence the workbench renders in plain language for non-developers
   *  (Korean or English). */
  readonly plainLanguageStatus: string;
  /** Suggested next question to ask the user (may overlap with topGaps[0]). */
  readonly nextQuestion?: string;
  /** HARD INVARIANT: this panel surfaces status only; it does not authorize
   *  mutation. Always `false`. */
  readonly mutationAuthorizedFromPanel: false;
}

/** Optional input shape used by lib/chatbot-studio/fde-panel-builder.ts
 *  to flag DTC-needed-now state. Caller (workbench-state.ts builder)
 *  passes this when an approved SIC is available upstream. */
export interface FDEPanelBuilderHints {
  readonly hasApprovedSemanticIntentContract?: boolean;
  readonly hasApprovedDigitalTwinChangeContract?: boolean;
  readonly preferredLanguage?: "ko" | "en";
}
