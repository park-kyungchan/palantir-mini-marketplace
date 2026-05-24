/**
 * @stable — CanvasLayoutStage primitive (prim-data-16, v1.33.0)
 *
 * Linear layout stage axis for swipe-driven canvas resizing in palantir-math
 * dual-canvas layout. Five positions on a single axis replacing the per-canvas
 * split/focus/solo state machine that allowed incoherent combinations.
 *
 * Authority:
 *   - palantir-math src/types/seq-data.ts CanvasLayoutStage (iter 9, 2026-04-28)
 *   - palantir-math src/lib/canvasLayout.ts StageWidths + resolveStageWidths + clampStage
 *
 * D/L/A domain: DATA (immutable numeric stage axis — declarative spec, not logic)
 * @owner palantirkc-ontology
 * @purpose Canonical canvas-layout stage primitive for W5-A consumer surface
 * @source palantir-math/src/types/seq-data.ts:1540 + src/lib/canvasLayout.ts:91-143
 * @fetched 2026-05-01
 * @version 1.33.0
 */

/**
 * Linear layout stage axis for swipe-driven canvas resizing.
 *
 *   -2 : Primary   0% / Second 100%  (primary docked as left peek tab)
 *   -1 : Primary  30% / Second  70%
 *    0 : Primary  50% / Second  50%  (default split)
 *   +1 : Primary  70% / Second  30%
 *   +2 : Primary 100% / Second   0%  (second docked as right peek tab)
 *
 * Invariant: value is always an integer in [-2, +2].
 */
export type CanvasLayoutStage = -2 | -1 | 0 | 1 | 2;

/** Human-readable label for each layout stage (accessibility, aria-label). */
export const STAGE_LABELS: Readonly<Record<CanvasLayoutStage, string>> = {
  [-2]: "second canvas full screen",
  [-1]: "second canvas large",
  [0]: "split 50/50",
  [1]: "primary canvas large",
  [2]: "primary canvas full screen",
} as const;

/**
 * Resolved pixel-percentage widths and docked sides for a CanvasLayoutStage.
 *
 * Invariant: primaryPct + secondPct ∈ {100, 130} — the 130 case occurs at
 * the extremes where one canvas is docked (its pct is 0 but it still gets a
 * peek-tab; caller renders that as a tab, not as a flex child).
 */
export interface StageWidths {
  readonly primaryPct: number;
  readonly secondPct: number;
  /** When set, primary renders as a peek-tab on this side instead of inline. */
  readonly primaryDocked: "left" | null;
  /** When set, second renders as a peek-tab on this side instead of inline. */
  readonly secondDocked: "right" | null;
}

/**
 * Resolve pixel-percentage widths and docked sides from a CanvasLayoutStage.
 * Implementation lives in palantir-math/src/lib/canvasLayout.ts; this is the
 * canonical signature stub for the shared ontology surface.
 *
 * Stage -2: primary 0% (docked left as peek-tab) + secondary 100%.
 * Stage +2: primary 100% + secondary 0% (docked right as peek-tab).
 */
export declare function resolveStageWidths(stage: CanvasLayoutStage): StageWidths;

/**
 * Clamp an arbitrary number to a valid CanvasLayoutStage integer in [-2, +2].
 * Fractional values round toward nearest integer (Math.round).
 * Values outside [-2, +2] clamp to the boundary.
 *
 * Implementation lives in palantir-math/src/lib/canvasLayout.ts; this is the
 * canonical signature stub for the shared ontology surface.
 */
export declare function clampStage(n: number): CanvasLayoutStage;

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "palantir-math canvas layout stage primitive (project-promoted); domain-specific, not Foundry surface",
};
export { categoryFoundryEquivalent as canvasLayoutStageFoundryEquivalent };
