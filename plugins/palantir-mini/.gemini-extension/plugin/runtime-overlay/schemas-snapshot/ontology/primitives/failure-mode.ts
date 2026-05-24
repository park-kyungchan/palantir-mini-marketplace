/**
 * @stable — FailureMode primitive (prim-data-23, v1.0.0)
 *
 * Alias-wrapper providing a typed graph-node identity for a sprint failure.
 * The split is intentional:
 *   - failure-mode-synthesized.ts: event PAYLOAD shape (FailureModeSynthesizedPayload)
 *   - failure-category.ts:        enum (FailureCategory)
 *   - failure-mode.ts (this):     GRAPH-NODE identity linking both
 *
 * FailureModeDeclaration links the two existing primitives by reference and
 * optionally cross-refs the originating EventRid (the failure_mode_synthesized
 * event that spawned this node). The existing primitives are NOT collapsed.
 *
 * Decision: alias-wrapper (b1) per spec.md §4 row 8.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/failure-category.ts (category enum)
 *     -> ~/.claude/schemas/ontology/primitives/failure-mode-synthesized.ts (event payload)
 *     -> ~/.claude/schemas/ontology/primitives/failure-mode.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *
 * D/L/A domain: DATA (failure graph-node — links category + originating event)
 * @owner palantirkc-ontology
 * @purpose FailureMode graph-node identity (Phase 2 ImpactGraph node-type)
 */

import type { FailureCategory } from "./failure-category";
import type { EventRid } from "./event";

export type { FailureCategory } from "./failure-category";
export type { EventRid } from "./event";

export type FailureModeRid = string & { readonly __brand: "FailureModeRid" };
export const failureModeRid = (s: string): FailureModeRid => s as FailureModeRid;

export interface FailureModeDeclaration {
  readonly failureId: FailureModeRid;
  /** Root-cause category tag for cross-sprint pattern queries. */
  readonly category: FailureCategory;
  /**
   * RID of the failure_mode_synthesized event that produced this node.
   * Absent when the failure was manually recorded rather than auto-synthesized.
   */
  readonly originatingEventRef?: EventRid;
}

export function isFailureModeDeclaration(x: unknown): x is FailureModeDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as FailureModeDeclaration;
  return (
    typeof d.failureId === "string" &&
    d.failureId.length > 0 &&
    typeof d.category === "string"
  );
}
