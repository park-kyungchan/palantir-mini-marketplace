/**
 * @stable — Learning primitive (prim-learn-28, v1.0.0)
 *
 * Alias-wrapper providing a typed graph-node identity for a durable lesson.
 * FeedbackLoopClosed (feedback-loop-closed.ts) is an event PAYLOAD (the
 * loop-terminal transition). Learning is the graph-node identity of the
 * DURABLE LESSON extracted from that closure — a distinct node type that
 * survives across sessions as semantic/procedural memory.
 *
 * `sourceLoopRef` cross-refs the `loopId` field from FeedbackLoopClosedPayload
 * (plain string, since feedback-loop-closed.ts does not export a branded RID).
 * The edge from Learning → FeedbackLoopClosed event is declared in PR 2.2.
 *
 * Decision: alias-wrapper (b1) per spec.md §4 row 9.
 *
 * Authority chain:
 *   ~/docs/proposals/2026-05-13-aip-aligned-local-ontology-control-plane-proposal.md §7.1
 *     -> ~/.claude/plans/2026-05-13-aip-aligned-control-plane-implementation-plan.md §4 row 2.1
 *     -> ~/.claude/schemas/ontology/primitives/feedback-loop-closed.ts (source payload)
 *     -> ~/.claude/schemas/ontology/primitives/learning.ts (this file)
 *     -> ~/ontology/shared-core/index.ts re-export
 *
 * D/L/A domain: DATA (durable lesson node — BackPropagation substrate; rule 26 §Axis C)
 * @owner palantirkc-ontology
 * @purpose Learning graph-node identity (Phase 2 ImpactGraph node-type; BackProp input)
 */

export type { FeedbackLoopClosedPayload } from "./feedback-loop-closed";

export type LearningRid = string & { readonly __brand: "LearningRid" };
export const learningRid = (s: string): LearningRid => s as LearningRid;

export interface LearningDeclaration {
  readonly learningId: LearningRid;
  /**
   * `loopId` from the originating FeedbackLoopClosedPayload.
   * Typed as string (no branded RID on source primitive).
   * Absent when the learning was manually authored rather than loop-derived.
   */
  readonly sourceLoopRef?: string;
  /** Human-readable one-paragraph lesson summary. ≥40 chars (rule 26 A3). */
  readonly summary: string;
  /** ISO 8601 timestamp when this learning was captured. */
  readonly capturedAt: string;
}

export function isLearningDeclaration(x: unknown): x is LearningDeclaration {
  if (typeof x !== "object" || x === null) return false;
  const d = x as LearningDeclaration;
  return (
    typeof d.learningId === "string" &&
    d.learningId.length > 0 &&
    typeof d.summary === "string" &&
    d.summary.length >= 40 &&
    typeof d.capturedAt === "string"
  );
}
