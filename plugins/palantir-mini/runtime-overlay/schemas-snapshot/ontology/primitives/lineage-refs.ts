/**
 * @stable — LineageRefs interface primitive (prim-learn-17, v1.35.0)
 *
 * Cross-reference carrier attached to events.jsonl envelopes, linking an event
 * to its action RID, dry-run reference, paired outcome, evidence URLs, and
 * (optional) playground sandbox. Closes the BackPropagation circuit by making
 * outcome pairing + evidence citation typed rather than free-form `withWhat`
 * text.
 *
 * Authority chain:
 *   research/palantir-vision/decision-lineage/workflow-lineage.md
 *     + blog.palantir.com/connecting-agents-to-decisions (2026-04-29) — "atop
 *       which version of enterprise data, and through which application" formal
 *       primitive
 *     ↓
 *   plans/nifty-mixing-diffie.md §Axis A3 + B1
 *     ↓
 *   schemas/ontology/primitives/lineage-refs.ts (this file)
 *     ↓
 *   palantir-mini/lib/event-log/types.ts — EventEnvelopeBase.lineageRefs?
 *     + bridge/handlers/{pm-outcome-pair-audit,replay-lineage}.ts
 *
 * D/L/A domain: LEARN (cross-reference is a LEARN substrate).
 * Rule cross-refs: rule 10 v3.0.0 §lineageRefs, rule 26.
 *
 * @owner palantirkc-ontology
 * @purpose Typed cross-reference for event → action → outcome → evidence
 */

import type { ScenarioRid } from "./scenario-sandbox";
import type { OutcomePairingRid } from "./outcome-pairing";

/**
 * Cross-reference fields. All optional — events without action context (e.g.
 * lifecycle markers) emit empty refs. Events at T2+ SHOULD populate at least
 * one field; T3+ SHOULD populate `outcomePairId` once the paired outcome
 * arrives.
 */
export interface LineageRefs {
  /**
   * Action RID — references a FeedbackLoop, SprintContract, scenario, or
   * task-RID-equivalent that this event acts upon. Format: free-form string
   * (no brand) since the source primitive varies.
   */
  readonly actionRid?: string;

  /**
   * Dry-run reference — sha256 hash returned by `compute_edits_dry_run`.
   * Pairs `dry_run_computed` → `dry_run_graded` → `edit_committed` events
   * across the harness commit gate (rule 16 v3.4.0 §Loop steps 3-5).
   */
  readonly dryRunRef?: string;

  /**
   * Outcome pairing ID — links this event to its paired before/after
   * comparison via OutcomePairingDeclaration. Populated by
   * outcome-pair-tracker.ts hook on close.
   */
  readonly outcomePairId?: OutcomePairingRid;

  /**
   * Evidence URLs — commit SHA links, PR numbers, file paths (absolute), or
   * external doc URLs (palantir.com, blog.palantir.com, x.com/PalantirTech)
   * supporting the event's `withWhat.reasoning`.
   */
  readonly evidenceUrls?: readonly string[];

  /**
   * Playground sandbox ID — references a ScenarioSandbox if the event was
   * emitted inside a what-if branch (rule 16 §Scenarios). Reuses
   * ScenarioRid brand for type safety.
   */
  readonly playgroundSandboxId?: ScenarioRid;
}

/**
 * Type guard — returns true if `x` is a structurally valid LineageRefs object
 * (all fields are optional, but if present they must be the right shape).
 */
export function isLineageRefs(x: unknown): x is LineageRefs {
  if (typeof x !== "object" || x === null) return false;
  const r = x as LineageRefs;
  if (r.actionRid !== undefined && typeof r.actionRid !== "string") return false;
  if (r.dryRunRef !== undefined && typeof r.dryRunRef !== "string") return false;
  if (r.outcomePairId !== undefined && typeof r.outcomePairId !== "string") return false;
  if (
    r.evidenceUrls !== undefined &&
    (!Array.isArray(r.evidenceUrls) ||
      !r.evidenceUrls.every((u) => typeof u === "string"))
  ) {
    return false;
  }
  if (
    r.playgroundSandboxId !== undefined &&
    typeof r.playgroundSandboxId !== "string"
  ) {
    return false;
  }
  return true;
}

/**
 * Convenience predicate — true if refs carry at least one non-empty field
 * (i.e., the event is anchored in a typed lineage chain). Used by
 * value-grade-assigner to score Axis A3 (evidence-cited).
 */
export function hasAnyLineageRef(refs: LineageRefs): boolean {
  return (
    refs.actionRid !== undefined ||
    refs.dryRunRef !== undefined ||
    refs.outcomePairId !== undefined ||
    (refs.evidenceUrls !== undefined && refs.evidenceUrls.length > 0) ||
    refs.playgroundSandboxId !== undefined
  );
}

// --- Foundry equivalence (R5-F14 / S3) ---
import type { FoundryEquivalence } from "./category-foundry-equivalent";
const categoryFoundryEquivalent: FoundryEquivalence = {
  kind: "claude-extension",
  rationale: "Typed lineage cross-reference (actionRid/dryRunRef/outcomePairId); palantir-mini event-log substrate, not Foundry surface",
};
export { categoryFoundryEquivalent as lineageRefsFoundryEquivalent };
